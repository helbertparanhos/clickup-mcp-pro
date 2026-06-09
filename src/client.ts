import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";
import FormData from "form-data";

export interface ClickUpClientOptions {
  token: string;
  defaultTeamId?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const V2_BASE = "https://api.clickup.com/api/v2";
const V3_BASE = "https://api.clickup.com/api/v3";

export type ApiVersion = "v2" | "v3";

export interface RequestOptions {
  version?: ApiVersion;
  params?: Record<string, unknown>;
  body?: unknown;
  /** Send body as multipart/form-data (for file uploads). */
  form?: FormData;
  headers?: Record<string, string>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Thin, resilient ClickUp REST client.
 * - Handles v2 and v3 base URLs.
 * - Retries on 429 (respecting Retry-After) and transient network errors.
 * - Normalizes ClickUp error payloads into actionable messages.
 */
export class ClickUpClient {
  private http: AxiosInstance;
  private maxRetries: number;
  readonly defaultTeamId?: string;

  constructor(opts: ClickUpClientOptions) {
    if (!opts.token) {
      throw new Error(
        "CLICKUP_API_TOKEN is required. Get a Personal Token at ClickUp → Settings → Apps → API Token."
      );
    }
    this.defaultTeamId = opts.defaultTeamId;
    this.maxRetries = opts.maxRetries ?? 3;
    this.http = axios.create({
      timeout: opts.timeoutMs ?? 60000,
      headers: {
        Authorization: opts.token,
        "Content-Type": "application/json",
      },
      // We handle non-2xx ourselves to craft good messages.
      validateStatus: () => true,
    });
  }

  /** Resolve a team/workspace id from an explicit value or the configured default. */
  resolveTeamId(explicit?: string): string {
    const id = explicit ?? this.defaultTeamId;
    if (!id) {
      throw new Error(
        "No team_id provided and CLICKUP_TEAM_ID is not set. Pass team_id or configure a default."
      );
    }
    return id;
  }

  private baseFor(version: ApiVersion): string {
    return version === "v3" ? V3_BASE : V2_BASE;
  }

  async request<T = any>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const version = options.version ?? "v2";
    const url = `${this.baseFor(version)}${path.startsWith("/") ? path : `/${path}`}`;

    const config: AxiosRequestConfig = {
      method,
      url,
      params: options.params,
    };

    if (options.form) {
      config.data = options.form;
      config.headers = { ...options.form.getHeaders(), ...options.headers };
    } else if (options.body !== undefined) {
      config.data = options.body;
      if (options.headers) config.headers = options.headers;
    } else if (options.headers) {
      config.headers = options.headers;
    }

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let res;
      try {
        res = await this.http.request<T>(config);
      } catch (err) {
        // Network-level failure (DNS, socket). Retry a few times.
        if (attempt < this.maxRetries) {
          await sleep(this.backoff(attempt));
          attempt++;
          continue;
        }
        const e = err as AxiosError;
        throw new Error(`Network error calling ClickUp ${method} ${path}: ${e.message}`);
      }

      if (res.status === 429 && attempt < this.maxRetries) {
        const retryAfter = Number(res.headers["retry-after"]);
        const wait = Number.isFinite(retryAfter) ? retryAfter * 1000 : this.backoff(attempt);
        await sleep(wait);
        attempt++;
        continue;
      }

      if (res.status >= 500 && attempt < this.maxRetries) {
        await sleep(this.backoff(attempt));
        attempt++;
        continue;
      }

      if (res.status >= 400) {
        throw new Error(this.formatError(method, path, res.status, res.data));
      }

      return res.data as T;
    }
  }

  private backoff(attempt: number): number {
    // Exponential backoff with jitter: 0.5s, 1s, 2s, ...
    return Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);
  }

  private formatError(method: string, path: string, status: number, data: any): string {
    let detail = "";
    if (data && typeof data === "object") {
      const err = data.err || data.error || data.ECODE || data.message;
      const code = data.ECODE ? ` (ECODE: ${data.ECODE})` : "";
      detail = err ? `${typeof err === "string" ? err : JSON.stringify(err)}${code}` : JSON.stringify(data);
    } else if (typeof data === "string") {
      detail = data;
    }
    const hints: Record<number, string> = {
      401: "Check that CLICKUP_API_TOKEN is valid and not expired.",
      403: "Your token lacks permission for this resource (or it's an Enterprise-only feature).",
      404: "Resource not found — verify the id and that your token can see it.",
      429: "Rate limited by ClickUp. Reduce request volume or retry later.",
    };
    const hint = hints[status] ? ` Hint: ${hints[status]}` : "";
    return `ClickUp API ${method} ${path} failed (HTTP ${status}): ${detail}.${hint}`;
  }

  // ── Convenience verbs ────────────────────────────────────────────────────
  get<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>("GET", path, options);
  }
  post<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>("POST", path, options);
  }
  put<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>("PUT", path, options);
  }
  patch<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>("PATCH", path, options);
  }
  del<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>("DELETE", path, options);
  }
}
