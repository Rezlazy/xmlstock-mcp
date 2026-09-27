import type { XmlStockConfig } from "./config.js";
import {
  extractYandexXmlError,
  hasYandexSearchResponse,
  parseXmlDocument,
} from "./parse/xml.js";

export class XmlStockApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    readonly body?: string,
    readonly yandexCode?: number,
  ) {
    super(message);
    this.name = "XmlStockApiError";
  }
}

export interface RequestOptions {
  autoRetry?: boolean;
  maxAttempts?: number;
}

const RETRIABLE_YANDEX_CODES = new Set([20, 21, 22, 23, 24, 25, 101, 110, 111, 500]);
const PENDING_YANDEX_CODES = new Set([202, 210]);
const RATE_LIMIT_CODES = new Set([55]);

export function redactKey(url: string): string {
  return url.replace(/([?&]key=)[^&]*/gi, "$1REDACTED");
}

function serializeParam(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(value);
  return String(value);
}

export function buildAuthQuery(
  config: XmlStockConfig,
  params?: Record<string, unknown>,
): URLSearchParams {
  const qs = new URLSearchParams({
    user: config.user,
    key: config.key,
  });
  if (params) {
    for (const [key, raw] of Object.entries(params)) {
      const value = serializeParam(raw);
      if (value !== undefined) qs.set(key, value);
    }
  }
  return qs;
}

export function buildUrl(
  config: XmlStockConfig,
  path: string,
  params?: Record<string, unknown>,
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const qs = buildAuthQuery(config, params);
  const query = qs.toString();
  return `${config.baseUrl}${normalized}${query ? `?${query}` : ""}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type RawResponse =
  | { kind: "json"; data: unknown }
  | { kind: "text"; data: string; contentType?: string };

export class XmlStockClient {
  constructor(
    private readonly config: XmlStockConfig,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly sleepFn: (ms: number) => Promise<void> = sleep,
  ) {}

  getConfig(): XmlStockConfig {
    return this.config;
  }

  async getRaw(
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<RawResponse> {
    return this.request("GET", path, params, undefined, options);
  }

  async postRaw(
    path: string,
    queryParams: Record<string, unknown>,
    body: string,
    options?: RequestOptions,
  ): Promise<RawResponse> {
    return this.request("POST", path, queryParams, body, options);
  }

  async request(
    method: "GET" | "POST",
    path: string,
    params?: Record<string, unknown>,
    body?: string,
    options?: RequestOptions,
  ): Promise<RawResponse> {
    const autoRetry = options?.autoRetry ?? this.config.autoRetryPending;
    const maxAttempts = options?.maxAttempts ?? (autoRetry ? 6 : 1);
    const url = buildUrl(this.config, path, params);
    let lastError = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
      try {
        const res = await this.fetchFn(url, {
          method,
          headers: body
            ? { "Content-Type": "application/xml; charset=utf-8" }
            : undefined,
          body: method === "POST" ? body : undefined,
          signal: controller.signal,
        });
        clearTimeout(timer);

        const contentType = res.headers.get("content-type") ?? "";
        const text = await res.text();

        if (!res.ok) {
          if ((res.status === 503 || res.status >= 500) && attempt < maxAttempts) {
            lastError = `HTTP ${res.status}`;
            await this.sleepFn(1500 * attempt);
            continue;
          }
          throw new XmlStockApiError(
            `XMLstock HTTP ${res.status}`,
            res.status,
            redactKey(url),
            text.slice(0, 2000),
          );
        }

        const trimmed = text.trim();
        if (contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
          try {
            return { kind: "json", data: JSON.parse(text) as unknown };
          } catch {
            return { kind: "text", data: text, contentType };
          }
        }

        if (trimmed.startsWith("<")) {
          const doc = parseXmlDocument(text);
          const yErr = extractYandexXmlError(doc);
          if (yErr) {
            const retriable =
              RETRIABLE_YANDEX_CODES.has(yErr.code) ||
              PENDING_YANDEX_CODES.has(yErr.code) ||
              RATE_LIMIT_CODES.has(yErr.code);
            if (autoRetry && retriable && attempt < maxAttempts) {
              lastError = `Yandex XML error ${yErr.code}: ${yErr.message}`;
              const delay = PENDING_YANDEX_CODES.has(yErr.code)
                ? 2500
                : RATE_LIMIT_CODES.has(yErr.code)
                  ? 2000
                  : 1500 * attempt;
              await this.sleepFn(delay);
              continue;
            }
            if (yErr.code === 15) {
              return { kind: "text", data: text, contentType: "application/xml" };
            }
            throw new XmlStockApiError(
              `XMLstock Yandex error ${yErr.code}: ${yErr.message}`,
              res.status,
              redactKey(url),
              text.slice(0, 2000),
              yErr.code,
            );
          }
          if (!hasYandexSearchResponse(doc) && path.includes("yandex")) {
            throw new XmlStockApiError(
              "XMLstock returned non-XML or invalid Yandex response — check XMLSTOCK_USER/XMLSTOCK_KEY",
              res.status,
              redactKey(url),
              text.slice(0, 500),
            );
          }
          return { kind: "text", data: text, contentType: "application/xml" };
        }

        return { kind: "text", data: text, contentType };
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof XmlStockApiError) throw err;
        if (attempt < maxAttempts) {
          lastError = err instanceof Error ? err.message : String(err);
          await this.sleepFn(1500 * attempt);
          continue;
        }
        throw new XmlStockApiError(
          lastError || (err instanceof Error ? err.message : String(err)),
          0,
          redactKey(url),
        );
      }
    }

    throw new XmlStockApiError(
      lastError || "XMLstock request failed after retries",
      0,
      redactKey(url),
    );
  }

  formatRawResponse(raw: RawResponse): string {
    if (raw.kind === "json") {
      return JSON.stringify(raw.data, null, 2);
    }
    return raw.data;
  }
}
