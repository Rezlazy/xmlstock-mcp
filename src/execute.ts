import { z } from "zod";
import type { EndpointDef } from "./types.js";
import type { XmlStockClient } from "./client.js";

const META_KEYS = new Set([
  "responseFormat",
  "requestXml",
  "autoRetry",
  "format",
  "extraQuery",
]);

export function buildZodShape(def: EndpointDef): Record<string, z.ZodTypeAny> {
  return (def.params ?? {}) as Record<string, z.ZodTypeAny>;
}

export function mapQueryParams(
  args: Record<string, unknown>,
  def: EndpointDef,
): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (META_KEYS.has(key)) continue;
    if (def.postBodyArg && key === def.postBodyArg) continue;
    if (value === undefined || value === null || value === "") continue;
    if (key === "tbm" && value === "") continue;
    query[key] = value;
  }

  if (def.name === "xmlstock_service") {
    const action = args.do;
    if (action) query.do = action;
    const format = args.format;
    if (format) query.format = format;
    const extra = args.extraQuery;
    if (typeof extra === "string" && extra.trim()) {
      const extraParams = new URLSearchParams(extra);
      for (const [k, v] of extraParams.entries()) {
        query[k] = v;
      }
    }
  }

  return query;
}

function resolveAutoRetry(
  args: Record<string, unknown>,
  client: XmlStockClient,
): boolean {
  const arg = args.autoRetry;
  if (arg === 1 || arg === "1" || arg === true) return true;
  if (arg === 0 || arg === "0" || arg === false) return false;
  return client.getConfig().autoRetryPending;
}

export async function executeEndpoint(
  client: XmlStockClient,
  def: EndpointDef,
  args: Record<string, unknown>,
): Promise<string> {
  const path = def.resolvePath(args);
  const params = mapQueryParams(args, def);
  const options = { autoRetry: resolveAutoRetry(args, client) };

  if (def.method === "POST") {
    const bodyKey = def.postBodyArg ?? "requestXml";
    const body = args[bodyKey];
    if (typeof body !== "string" || !body.trim()) {
      throw new Error(`${bodyKey} is required for POST`);
    }
    const raw = await client.postRaw(path, params, body, options);
    return client.formatRawResponse(raw);
  }

  const raw = await client.getRaw(path, params, options);
  return client.formatRawResponse(raw);
}
