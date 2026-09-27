export const DEFAULT_BASE_URL = "https://xmlstock.com";

export interface XmlStockConfig {
  user: string;
  key: string;
  baseUrl: string;
  requestTimeoutMs: number;
  autoRetryPending: boolean;
}

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): XmlStockConfig {
  const user = env.XMLSTOCK_USER?.trim();
  const key = env.XMLSTOCK_KEY?.trim();
  if (!user) {
    throw new Error(
      "XMLSTOCK_USER is required (user ID from https://xmlstock.com dashboard)",
    );
  }
  if (!key) {
    throw new Error(
      "XMLSTOCK_KEY is required (API key from https://xmlstock.com dashboard)",
    );
  }

  const timeoutRaw = env.XMLSTOCK_REQUEST_TIMEOUT_MS?.trim();
  const requestTimeoutMs = timeoutRaw ? Number(timeoutRaw) : 90_000;
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs < 1_000) {
    throw new Error("XMLSTOCK_REQUEST_TIMEOUT_MS must be a number >= 1000");
  }

  const baseUrl = (env.XMLSTOCK_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");

  return {
    user,
    key,
    baseUrl,
    requestTimeoutMs,
    autoRetryPending: truthy(env.XMLSTOCK_AUTO_RETRY_PENDING),
  };
}
