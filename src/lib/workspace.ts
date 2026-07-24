/**
 * Workspace context: personal (default) or a team the user belongs to.
 * Cookie is set by server actions; read on server for project ownership.
 */

import { cookies } from "next/headers";
import type { WorkspaceContext } from "@/types/database";

export const WORKSPACE_COOKIE = "pofo_workspace";

export type WorkspaceCookieValue =
  | { kind: "personal" }
  | { kind: "team"; teamId: string };

export function parseWorkspaceCookie(
  raw: string | undefined | null
): WorkspaceCookieValue {
  if (!raw || raw === "personal") return { kind: "personal" };
  if (raw.startsWith("team:")) {
    const teamId = raw.slice(5).trim();
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        teamId
      )
    ) {
      return { kind: "team", teamId };
    }
  }
  return { kind: "personal" };
}

export function serializeWorkspaceCookie(value: WorkspaceCookieValue): string {
  if (value.kind === "personal") return "personal";
  return `team:${value.teamId}`;
}

export async function getWorkspaceCookie(): Promise<WorkspaceCookieValue> {
  const jar = await cookies();
  return parseWorkspaceCookie(jar.get(WORKSPACE_COOKIE)?.value);
}

export async function setWorkspaceCookie(
  value: WorkspaceCookieValue
): Promise<void> {
  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE, serializeWorkspaceCookie(value), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });
}

export function workspaceLabel(ctx: WorkspaceContext): string {
  if (ctx.kind === "personal") return "Personal";
  return ctx.teamName || "Studio";
}
