import { z, type ZodRawShape } from "zod";

export type HttpMethod = "GET" | "POST";

export interface EndpointDef {
  name: string;
  description: string;
  method: HttpMethod;
  /** Path relative to base URL, or derived from tool args (e.g. response format). */
  resolvePath: (args: Record<string, unknown>) => string;
  params?: ZodRawShape;
  /** Argument name whose value is sent as POST body (typically XML). */
  postBodyArg?: string;
  /** Billable XMLstock request (shown in tool descriptions). */
  billed?: boolean;
}

export function str(desc: string, optional = false) {
  const s = z.string().describe(desc);
  return optional ? s.optional() : s;
}

export function num(desc: string, optional = false) {
  const s = z.number().describe(desc);
  return optional ? s.optional() : s;
}

export function int(desc: string, optional = false) {
  const s = z.number().int().describe(desc);
  return optional ? s.optional() : s;
}

export function flag(desc: string, optional = true) {
  const s = z
    .union([z.boolean(), z.literal(0), z.literal(1), z.enum(["0", "1"])])
    .describe(`${desc} (1/true = yes, 0/false = no)`);
  return optional ? s.optional() : s;
}

export function enumStr<T extends [string, ...string[]]>(
  values: T,
  desc: string,
  optional = false,
) {
  const s = z.enum(values).describe(desc);
  return optional ? s.optional() : s;
}
