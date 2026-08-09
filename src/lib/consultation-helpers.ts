// Non-server-action helpers for the consultation edit window.
// These are pure functions that can be imported from both server and client.

const EDIT_WINDOW_HOURS = 24;

function isWithinEditWindow(completedAt: Date | null): boolean {
  if (!completedAt) return true; // not yet completed → editable
  const elapsed = Date.now() - completedAt.getTime();
  return elapsed < EDIT_WINDOW_HOURS * 60 * 60 * 1000;
}

function hoursRemaining(completedAt: Date | null): number | null {
  if (!completedAt) return null;
  const elapsed = Date.now() - completedAt.getTime();
  const remaining = EDIT_WINDOW_HOURS - elapsed / (60 * 60 * 1000);
  return remaining > 0 ? Math.floor(remaining) : 0;
}

export { isWithinEditWindow, hoursRemaining, EDIT_WINDOW_HOURS };
