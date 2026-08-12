import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { google } from "@ai-sdk/google";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createChatTools,
  ROLE_SYSTEM_PROMPTS,
  type ChatSession,
} from "@/lib/chat-tools";

export const runtime = "nodejs";
export const maxDuration = 30;

// Extract text from a UIMessage's parts array
function getTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// Best-effort JSON serialization for toolCalls / toolResults. The raw objects
// from streamText can carry non-serializable bits (Date, BigInt, getters), so a
// structured clone round-trip is the safest way to get plain JSON. Wrapped in
// try/catch so a serialization failure never crashes the response.
function safeJson<T>(value: T): T | undefined {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatSession: ChatSession = {
    user: {
      id: session.user.id,
      role: session.user.role,
      profileId: session.user.profileId,
      patientId: session.user.patientId,
    },
  };

  const role = session.user.role;
  const systemPrompt = ROLE_SYSTEM_PROMPTS[role];
  const tools = createChatTools(chatSession);

  let body: { messages: UIMessage[]; conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { messages, conversationId } = body;

  // Ensure conversation exists + belongs to the user
  let convId = conversationId;
  if (convId) {
    const owned = await prisma.chatConversation.findFirst({
      where: { id: convId, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) {
      // Don't leak that it exists — just start a fresh conversation
      convId = undefined;
    }
  }
  if (!convId) {
    const conv = await prisma.chatConversation.create({
      data: { userId: session.user.id, title: "New conversation" },
    });
    convId = conv.id;
  }

  // Save user message (extract text from the last user UIMessage)
  const lastUserMessage = [...(messages ?? [])]
    .reverse()
    .find((m) => m.role === "user");
  if (lastUserMessage) {
    const userText = getTextFromMessage(lastUserMessage);
    if (userText) {
      await prisma.chatMessage.create({
        data: {
          conversationId: convId,
          role: "user",
          content: userText,
        },
      });
    }
  }

  const modelMessages = await convertToModelMessages(messages ?? []);

  let result;
  try {
    result = streamText({
      model: google("gemini-flash-lite-latest"),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),
      onFinish: async ({ text, toolCalls, toolResults }) => {
        // Save assistant response. For tool-only turns `text` may be empty —
        // persist a placeholder so history isn't a blank bubble on reload.
        const content = text || "";
        const hasToolActivity =
          (toolCalls && toolCalls.length > 0) ||
          (toolResults && toolResults.length > 0);
        const persistedContent =
          content || (hasToolActivity ? "(action completed)" : "");

        await prisma.chatMessage.create({
          data: {
            conversationId: convId!,
            role: "assistant",
            content: persistedContent,
            toolCalls: safeJson(toolCalls) as never,
            toolResults: safeJson(toolResults) as never,
          },
        });

        // Update conversation title if it's still the default
        if (lastUserMessage) {
          const userText = getTextFromMessage(lastUserMessage);
          if (userText) {
            await prisma.chatConversation.update({
              where: { id: convId! },
              data: { title: userText.slice(0, 50) },
            }).catch(() => {});
          }
        }
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Streaming failed";
    return NextResponse.json(
      { error: `Chat error: ${message}` },
      { status: 500 },
    );
  }

  // Attach conversationId to the streamed message metadata so the client can
  // capture it (via onFinish / message.metadata) and reuse the conversation.
  const response = result.toUIMessageStreamResponse({
    headers: { "X-Conversation-Id": convId },
    messageMetadata: ({ part }) => {
      if (part.type === "start") {
        return { conversationId: convId };
      }
    },
  });
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// ─── GET: Load conversation history ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");

  if (conversationId) {
    // Scope to the user — a user must not read another user's conversations.
    const owned = await prisma.chatConversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ messages });
  }

  // List conversations
  const conversations = await prisma.chatConversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, title: true, updatedAt: true },
  });

  return NextResponse.json({ conversations });
}
