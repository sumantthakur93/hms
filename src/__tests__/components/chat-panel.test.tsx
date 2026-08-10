import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("ai/react", () => ({
  useChat: vi.fn(() => ({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    setMessages: vi.fn(),
  })),
}));

import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "ai/react";

const mockUseChat = vi.mocked(useChat);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseChat.mockReturnValue({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
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
      expect(screen.getByText("When is my next appointment?")).toBeInTheDocument();
    });
  });

  it("shows disclaimer text", async () => {
    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(
        screen.getByText("AI can perform actions on your behalf based on your role."),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state message when no messages", async () => {
    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByText("Ask me anything about your health records.")).toBeInTheDocument();
    });
  });

  it("renders user messages right-aligned", async () => {
    mockUseChat.mockReturnValue({
      messages: [
        { id: "1", role: "user" as const, content: "Hello AI" },
      ],
      input: "",
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      isLoading: false,
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
        { id: "1", role: "user" as const, content: "Hi" },
        { id: "2", role: "assistant" as const, content: "Hello! How can I help?" },
      ],
      input: "",
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      isLoading: false,
      setMessages: vi.fn(),
    } as any);

    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByText("Hello! How can I help?")).toBeInTheDocument();
    });
  });

  it("shows loading indicator when isLoading", async () => {
    mockUseChat.mockReturnValue({
      messages: [],
      input: "",
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      isLoading: true,
      setMessages: vi.fn(),
    } as any);

    render(<ChatPanel role="PATIENT" userId="u1" />);
    fireEvent.click(screen.getByLabelText("Open AI Assistant"));
    await waitFor(() => {
      expect(screen.getByText("Thinking…")).toBeInTheDocument();
    });
  });
});
