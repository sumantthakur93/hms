import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    status: "ready",
    setMessages: vi.fn(),
    error: undefined,
  })),
}));

import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@ai-sdk/react";
import { PENDING_CONFIRMATION_MARKER } from "@/lib/chat-tools";

const mockUseChat = vi.mocked(useChat);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseChat.mockReturnValue({
    messages: [],
    sendMessage: vi.fn(),
    status: "ready",
    setMessages: vi.fn(),
  } as any);
});

describe("ChatPanel", () => {
  it("renders floating button when closed", () => {
    render(<ChatPanel role="PATIENT" userId="u1" />);
    expect(screen.getByLabelText("Open AI Assistant")).toBeInTheDocument();
  });

  it("opens panel on button click", async () => {
    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByText("AI Health Assistant")).toBeInTheDocument();
    });
  });

  it("shows role badge in header", async () => {
    render(<ChatPanel role="DOCTOR" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByText("Doctor mode")).toBeInTheDocument();
    });
  });

  it("shows suggested prompts when no messages", async () => {
    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(
        screen.getByText("When is my next appointment?"),
      ).toBeInTheDocument();
    });
  });

  it("shows disclaimer text", async () => {
    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(
        screen.getByText(
          "AI can perform actions on your behalf based on your role.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state message when no messages", async () => {
    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(
        screen.getByText("Ask me anything about your health records."),
      ).toBeInTheDocument();
    });
  });

  it("renders user messages right-aligned", async () => {
    mockUseChat.mockReturnValue({
      messages: [
        {
          id: "1",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "Hello AI" }],
        },
      ],
      sendMessage: vi.fn(),
      status: "ready",
      setMessages: vi.fn(),
    } as any);

    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByText("Hello AI")).toBeInTheDocument();
    });
  });

  it("renders assistant messages", async () => {
    mockUseChat.mockReturnValue({
      messages: [
        {
          id: "1",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "Hi" }],
        },
        {
          id: "2",
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: "Hello! How can I help?" }],
        },
      ],
      sendMessage: vi.fn(),
      status: "ready",
      setMessages: vi.fn(),
    } as any);

    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByText("Hello! How can I help?")).toBeInTheDocument();
    });
  });

  it("shows loading indicator when streaming", async () => {
    mockUseChat.mockReturnValue({
      messages: [],
      sendMessage: vi.fn(),
      status: "streaming",
      setMessages: vi.fn(),
      error: undefined,
    } as any);

    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByText("Thinking…")).toBeInTheDocument();
    });
  });

  it("surfaces an error banner when useChat errors", async () => {
    mockUseChat.mockReturnValue({
      messages: [],
      sendMessage: vi.fn(),
      status: "ready",
      setMessages: vi.fn(),
      error: new Error("Stream failed"),
    } as any);

    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText(/Stream failed/)).toBeInTheDocument();
    });
  });

  it("renders Confirm/Cancel controls for a pending write-tool confirmation", async () => {
    const sendMessage = vi.fn();
    mockUseChat.mockReturnValue({
      messages: [
        {
          id: "2",
          role: "assistant" as const,
          parts: [
            {
              type: "text" as const,
              text: `${PENDING_CONFIRMATION_MARKER} Cancel appointment a1. Reply yes to confirm.`,
            },
          ],
        },
      ],
      sendMessage,
      status: "ready",
      setMessages: vi.fn(),
      error: undefined,
    } as any);

    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Yes, please proceed." }),
      );
    });
  });

  it("does not render a blank bubble for a tool-only assistant turn", async () => {
    mockUseChat.mockReturnValue({
      messages: [
        {
          id: "2",
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: "" }],
        },
      ],
      sendMessage: vi.fn(),
      status: "ready",
      setMessages: vi.fn(),
      error: undefined,
    } as any);

    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByText(/action completed/i)).toBeInTheDocument();
    });
  });
});
