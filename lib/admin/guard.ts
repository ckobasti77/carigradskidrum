import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isValidSessionValue } from "./session";

export const ADMIN_LOGIN_PATH = "/admin/login";

/** True when the current request carries a valid admin session cookie. */
export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionValue(store.get(ADMIN_COOKIE)?.value);
}

/**
 * Throws unless the caller is authenticated. Server Actions are public HTTP
 * endpoints, so this runs on every mutation, not just on page render.
 */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) {
    throw new Error("unauthorized");
  }
}

/**
 * Page-level gate. Next renders a layout and its page segment concurrently, so
 * a layout that swaps in a login screen does NOT stop the page from running its
 * own data fetches. Every admin page therefore awaits this first: the redirect
 * aborts the render before any adminQuery can throw "unauthorized".
 */
export async function requireAdminPage(): Promise<void> {
  if (!(await hasSession())) {
    redirect(ADMIN_LOGIN_PATH);
  }
}
