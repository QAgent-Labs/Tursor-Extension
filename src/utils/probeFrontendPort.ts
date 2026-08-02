/** Probe whether an HTTP server responds on localhost at the given port. */
export async function probeFrontendPort(port: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, {
      method: "GET",
      signal: controller.signal,
      mode: "cors",
    });
    return res.ok || (res.status >= 200 && res.status < 500);
  } catch {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: "GET",
        signal: controller.signal,
        mode: "no-cors",
      });
      return res.type === "opaque" || res.ok;
    } catch {
      return false;
    }
  } finally {
    window.clearTimeout(timeout);
  }
}
