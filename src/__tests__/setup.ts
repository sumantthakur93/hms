import { vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { UserRole } from "@/types/next-auth";

export type MockSession = {
  user: {
    id: string;
    role: UserRole;
    name?: string | null;
    email?: string | null;
    profileId?: string;
    patientId?: string;
  };
  expires: string;
} | null;

// The auth mock — tests control the return value via setAuthSession
export const authMock = vi.fn(async () => null) as unknown as {
  (): Promise<MockSession>;
  mockReset(): void;
  mockResolvedValue(value: MockSession): void;
  mockResolvedValueOnce(value: MockSession): void;
};

vi.mock("@/auth", () => ({
  auth: authMock,
}));

// Reset between tests
beforeEach(() => {
  authMock.mockReset();
  authMock.mockResolvedValue(null); // default: unauthenticated
});

// Clean up DOM between tests
afterEach(() => {
  cleanup();
});
