import type { TursorCurrentContext } from "../types/workspaceInit";

/** Display `~/project` when path is under `/Users/<name>/…` or `/home/<name>/…`. */
export function formatWorkspacePathForDisplay(absolutePath: string): string {
  const unixHome = absolutePath.match(/^(\/(?:Users|home)\/[^/]+)(\/.*)?$/);
  if (unixHome) {
    const rest = unixHome[2] ?? "";
    return rest ? `~${rest}` : "~";
  }
  return absolutePath;
}

export async function fetchCurrentContext(
  originOverride?: string | null,
): Promise<TursorCurrentContext | null> {
  if (!originOverride) return null;

  try {
    const res = await fetch(`${originOverride}/context/current`);
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (
      typeof data !== "object" ||
      data === null ||
      typeof (data as TursorCurrentContext).connected !== "boolean"
    ) {
      return null;
    }
    return data as TursorCurrentContext;
  } catch {
    return null;
  }
}
