import { authMock } from "../setup";
import type { UserRole } from "@/types/next-auth";

type MockSession = {
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

/**
 * Set the mocked auth session for the current test.
 * Pass null to simulate an unauthenticated request.
 */
export function setAuthSession(
  role: UserRole | null,
  overrides?: {
    id?: string;
    name?: string;
    email?: string;
    profileId?: string;
    patientId?: string;
  },
) {
  if (role === null) {
    authMock.mockResolvedValue(null as MockSession);
    return;
  }

  const session: MockSession = {
    user: {
      id: overrides?.id ?? `test-${role.toLowerCase()}-id`,
      role,
      name:
        overrides?.name ??
        `Test ${role.charAt(0) + role.slice(1).toLowerCase()}`,
      email: overrides?.email ?? `test-${role.toLowerCase()}@carepoint.in`,
      profileId: overrides?.profileId,
      patientId: overrides?.patientId,
    },
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };

  authMock.mockResolvedValue(session);
}
