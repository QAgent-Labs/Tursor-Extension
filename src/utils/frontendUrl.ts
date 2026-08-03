/** Display URL for the test frontend field (cosmetic); port remains source of truth. */
export function frontendUrlFromPort(port: string): string {
  const trimmed = port.trim();
  if (!trimmed) return "";
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) return trimmed;
  return `http://localhost:${n}`;
}

/** Parse port from a URL or bare port string — same validation as connect flow. */
export function parseFrontendPortInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const n = Number.parseInt(u.port, 10);
      if (Number.isFinite(n) && n > 0) return n;
      if (u.port === "" && u.protocol === "http:") return 80;
      if (u.port === "" && u.protocol === "https:") return 443;
      return null;
    } catch {
      return null;
    }
  }

  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
