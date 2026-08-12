import { streamText, convertToCoreMessages, tool } from "ai";
import { google } from "@ai-sdk/google";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ALL_TOOLS,
  TOOLS_PER_ROLE,
  ROLE_SYSTEM_PROMPTS,
} from "@/lib/chat-tools";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const allowedToolNames = TOOLS_PER_ROLE[role] ?? [];
  const systemPrompt = ROLE_SYSTEM_PROMPTS[role];

  // Build role-filtered tools
  const tools: Record<string, ReturnType<typeof tool>> = {};
  for (const name of allowedToolNames) {
    const t = ALL_TOOLS[name as keyof typeof ALL_TOOLS];
    if (t) {
      tools[name] = t as unknown as ReturnType<typeof tool>;
    }
  }

  const body = await req.json();
  const { messages, conversationId } = body as {
    messages: Array<{ role: string; content: string }>;
    conversationId?: string;
  };

  // Ensure conversation exists
  let convId = conversationId;
  if (!convId) {
    const conv = await prisma.chatConversation.create({
      data: { userId: session.user.id, title: "New conversation" },
    });
    convId = conv.id;
  }

  // Save user message
  const lastUserMessage = messages.filter((m) => m.role === "user").pop();
  if (lastUserMessage) {
    await prisma.chatMessage.create({
      data: {
        conversationId: convId,
        role: "user",
        content: lastUserMessage.content,
      },
    });
  }

  const coreMessages = convertToCoreMessages(
    messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  );

  const result = streamText({
    model: google("gemini-3.5-flash"),
    system: systemPrompt,
    messages: coreMessages,
    tools,
    maxSteps: 5,
    onFinish: async ({ text, toolCalls, toolResults }) => {
      // Save assistant response
      await prisma.chatMessage.create({
        data: {
          conversationId: convId!,
          role: "assistant",
          content: text || "",
          toolCalls: toolCalls
            ? (JSON.parse(JSON.stringify(toolCalls)) as never)
            : undefined,
          toolResults: toolResults
            ? (JSON.parse(JSON.stringify(toolResults)) as never)
            : undefined,
        },
      });

      // Update conversation title if it's still default
      if (lastUserMessage) {
        await prisma.chatConversation.updateMany({
          where: { id: convId!, title: "New conversation" },
          data: { title: lastUserMessage.content.slice(0, 50) },
        });
      }
    },
  });

  // Add conversation ID to response headers
  const response = result.toDataStreamResponse();
  const headers = new Headers(response.headers);
  headers.set("X-Conversation-Id", convId);
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
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
