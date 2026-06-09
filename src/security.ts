import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { resolve as resolvePath, sep } from "node:path";
import https from "node:https";

/** Maximum size (bytes) for an attachment fetched/decoded in memory. Default 50 MB. */
export const MAX_ATTACHMENT_BYTES = Number(
  process.env.CLICKUP_MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024
);

/** Returns true if an IPv4/IPv6 address is private, loopback, link-local or otherwise non-public. */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10) return true; // 10.0.0.0/8
    if (p[0] === 127) return true; // 127.0.0.0/8 loopback
    if (p[0] === 0) return true; // 0.0.0.0/8
    if (p[0] === 169 && p[1] === 254) return true; // 169.254.0.0/16 link-local (cloud metadata)
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // 172.16.0.0/12
    if (p[0] === 192 && p[1] === 168) return true; // 192.168.0.0/16
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // 100.64.0.0/10 CGNAT
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true; // loopback / unspecified
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local fc00::/7
    if (lower.startsWith("64:ff9b:")) return true; // NAT64 well-known prefix
    // IPv4-mapped in ANY form the URL parser may produce:
    //   ::ffff:a.b.c.d (dotted)  OR  ::ffff:wwww:xxxx (compressed hex)
    const m = lower.match(/^::ffff:(.+)$/);
    if (m) {
      const tail = m[1];
      if (/^\d+\.\d+\.\d+\.\d+$/.test(tail)) return isPrivateAddress(tail);
      const hex = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hex) {
        const hi = parseInt(hex[1], 16);
        const lo = parseInt(hex[2], 16);
        const dotted = `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
        return isPrivateAddress(dotted);
      }
    }
    return false;
  }
  return false;
}

/**
 * Validate that a user-supplied URL is safe to fetch server-side (anti-SSRF):
 * must be HTTPS, and must not resolve to a private/loopback/link-local address.
 * Throws an actionable Error otherwise.
 */
export async function assertPublicHttpsUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid url: "${raw}".`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`Refusing to fetch non-HTTPS url (got "${url.protocol}"). Only https:// is allowed.`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  await resolvePublicIp(host);
}

/**
 * Resolve a hostname to a single validated PUBLIC ip. Throws if the host is
 * private/loopback/link-local or cannot be resolved. Returns the ip to connect
 * to (so the caller can pin the connection and avoid DNS-rebinding TOCTOU).
 */
async function resolvePublicIp(host: string): Promise<string> {
  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new Error(`Refusing to fetch url pointing to a private/loopback address (${host}).`);
    }
    return host;
  }
  if (host.toLowerCase() === "localhost") {
    throw new Error("Refusing to fetch url pointing to localhost.");
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch (e: any) {
    throw new Error(`Could not resolve host "${host}": ${e.message}`);
  }
  for (const a of addrs) {
    if (isPrivateAddress(a.address)) {
      throw new Error(
        `Refusing to fetch url: host "${host}" resolves to a private/loopback address (${a.address}).`
      );
    }
  }
  if (!addrs.length) throw new Error(`Host "${host}" did not resolve to any address.`);
  return addrs[0].address;
}

/**
 * Download an HTTPS URL into a Buffer with full anti-SSRF protection:
 *  - HTTPS only.
 *  - The hostname is resolved and validated, then the connection is PINNED to
 *    that exact ip (TLS SNI/Host preserved) so a rebinding attack can't swap in
 *    a private address between validation and connect.
 *  - Redirects are refused (no redirect-based pivot to an internal host).
 *  - The body is streamed and aborted the moment it exceeds maxBytes.
 */
export async function fetchPublicHttpsToBuffer(
  raw: string,
  maxBytes: number = MAX_ATTACHMENT_BYTES
): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid url: "${raw}".`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`Refusing to fetch non-HTTPS url (got "${url.protocol}"). Only https:// is allowed.`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const ip = await resolvePublicIp(host);
  const sizeError = () =>
    new Error(
      `Attachment exceeds the ${maxBytes}-byte limit (configure CLICKUP_MAX_UPLOAD_BYTES to change).`
    );

  return new Promise<Buffer>((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        servername: isIP(host) ? undefined : host, // SNI
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: { Host: url.host },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.destroy();
          return reject(new Error(`Refusing to follow redirect (HTTP ${status}) when fetching attachment url.`));
        }
        if (status >= 400) {
          res.destroy();
          return reject(new Error(`Failed to download ${raw}: HTTP ${status}`));
        }
        const declared = Number(res.headers["content-length"]);
        if (Number.isFinite(declared) && declared > maxBytes) {
          res.destroy();
          return reject(sizeError());
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (c: Buffer) => {
          total += c.length;
          if (total > maxBytes) {
            res.destroy();
            reject(sizeError());
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.setTimeout(30000, () => req.destroy(new Error(`Timeout fetching url ${raw}.`)));
    req.end();
  });
}

/**
 * Validate a local file path for attachment upload. When CLICKUP_UPLOAD_DIR is
 * set, the path must resolve inside that directory (prevents arbitrary file
 * exfiltration). When unset, the path is allowed (documented behavior) but
 * still normalized.
 */
export function assertSafeUploadPath(filePath: string): string {
  const resolved = resolvePath(filePath);
  const baseDir = process.env.CLICKUP_UPLOAD_DIR;
  if (baseDir) {
    const base = resolvePath(baseDir);
    const withSep = base.endsWith(sep) ? base : base + sep;
    if (resolved !== base && !resolved.startsWith(withSep)) {
      throw new Error(
        `Refusing to read "${filePath}": outside the allowed CLICKUP_UPLOAD_DIR (${base}).`
      );
    }
  }
  return resolved;
}

/**
 * Sanitize a raw API path for the clickup_raw escape hatch. Must be a clean
 * path on the ClickUp API host — no scheme, no host, no traversal.
 */
export function assertSafeRawPath(path: string): void {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("path is required.");
  }
  if (!path.startsWith("/")) {
    throw new Error('path must start with "/" (e.g. "/team/123/space").');
  }
  if (path.startsWith("//")) {
    throw new Error('path must not start with "//".');
  }
  if (path.includes("://")) {
    throw new Error('path must be a relative API path, not a full URL.');
  }
  if (path.includes("..")) {
    throw new Error('path must not contain ".." (path traversal).');
  }
  if (path.includes("@")) {
    throw new Error('path must not contain "@".');
  }
}
