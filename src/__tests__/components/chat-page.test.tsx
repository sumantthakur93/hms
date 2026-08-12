import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation so ChatPage can use useRouter without a real router.
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({}),
  usePathname: () => "/patient/chat",
}));

// Mock useChat so no real network calls happen.
vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    status: "ready",
    setMessages: vi.fn(),
    error: undefined,
  })),
}));

import { ChatPage } from "@/components/chat/chat-page";
import { useChat } from "@ai-sdk/react";

const mockUseChat = vi.mocked(useChat);

// fetch is mocked per-test below.
const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof global.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseChat.mockReturnValue({
    messages: [],
    sendMessage: vi.fn(),
    status: "ready",
    setMessages: vi.fn(),
    error: undefined,
  } as any);
  // Default: empty conversation list, no messages.
  fetchMock.mockImplementation(async (url: string) => {
    if (typeof url === "string" && url.includes("conversationId=")) {
      return { json: async () => ({ messages: [] }) } as Response;
    }
    return { json: async () => ({ conversations: [] }) } as Response;
  });
});

describe("ChatPage", () => {
  it("renders the sidebar with a New chat button", () => {
    render(
      <ChatPage
        role="PATIENT"
        userName="Alice Smith"
        basePath="/patient/chat"
      />,
    );
    expect(
      screen.getByRole("button", { name: "New chat" }),
    ).toBeInTheDocument();
  });

  it("renders the ChatGPT-style greeting with the user's first name", () => {
    render(
      <ChatPage
        role="PATIENT"
        userName="Alice Smith"
        basePath="/patient/chat"
      />,
    );
    expect(
      screen.getByText("What can I help with, Alice?"),
    ).toBeInTheDocument();
  });

  it("renders suggested prompt cards from SUGGESTED_PROMPTS", () => {
    render(
      <ChatPage
        role="PATIENT"
        userName="Alice"
        basePath="/patient/chat"
      />,
    );
    expect(
      screen.getByText("When is my next appointment?"),
    ).toBeInTheDocument();
  });

  it("shows the New chat placeholder as active when no conversation is selected", () => {
    render(
      <ChatPage
        role="PATIENT"
        userName="Alice"
        basePath="/patient/chat"
      />,
    );
    // The placeholder is a static highlighted "New chat" row (distinct from the
    // button). Both render the text "New chat"; the placeholder is the one
    // inside a div with bg-muted. We assert at least two occurrences.
    const newChatEls = screen.getAllByText("New chat");
    expect(newChatEls.length).toBeGreaterThanOrEqual(2);
  });

  it("navigates to the base path when New chat is clicked", () => {
    render(
      <ChatPage
        role="PATIENT"
        userName="Alice"
        basePath="/patient/chat"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(pushMock).toHaveBeenCalledWith("/patient/chat");
  });

  it("lists conversations from the API and navigates on select", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (typeof url === "string" && url.includes("conversationId=")) {
        return { json: async () => ({ messages: [] }) } as Response;
      }
      return {
        json: async () => ({
          conversations: [
            {
              id: "c1",
              title: "My test conversation",
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      } as Response;
    });

    render(
      <ChatPage
        role="PATIENT"
        userName="Alice"
        basePath="/patient/chat"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("My test conversation")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("My test conversation"));
    expect(pushMock).toHaveBeenCalledWith("/patient/chat/c1");
  });

  it("deletes a conversation optimistically and falls back to new chat when deleting the active one", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return { json: async () => ({ ok: true }) } as Response;
      }
      if (typeof url === "string" && url.includes("conversationId=")) {
        return { json: async () => ({ messages: [] }) } as Response;
      }
      return {
        json: async () => ({
          conversations: [
            {
              id: "c1",
              title: "Active thread",
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      } as Response;
    });

    render(
      <ChatPage
        role="PATIENT"
        userName="Alice"
        basePath="/patient/chat"
        initialConversationId="c1"
      />,
    );

    // Wait for the conversation to appear.
    await waitFor(() => {
      expect(screen.getByText("Active thread")).toBeInTheDocument();
    });

    // Open the delete confirm dialog.
    fireEvent.click(screen.getByLabelText(/Delete conversation/));

    // Confirm deletion.
    await waitFor(() => {
      expect(screen.getByText("Delete conversation?")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    // Active conversation deleted → navigate to base path (new chat).
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/patient/chat");
    });
  });
});
