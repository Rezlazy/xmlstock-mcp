import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: true,
  isArray: (name) =>
    ["group", "doc", "passage", "sitelink"].includes(name.toLowerCase()),
});

export function parseXmlDocument(text: string): unknown {
  return parser.parse(text);
}

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export interface YandexXmlError {
  code: number;
  message: string;
}

export function extractYandexXmlError(doc: unknown): YandexXmlError | null {
  const root = doc as Record<string, unknown> | null;
  const yandex = root?.yandexsearch as Record<string, unknown> | undefined;
  const response = yandex?.response as Record<string, unknown> | undefined;
  const err = response?.error;
  if (!err) return null;

  if (typeof err === "string") {
    return { code: 0, message: stripTags(err) };
  }
  const node = err as Record<string, unknown>;
  const code = Number(node["@_code"] ?? 0);
  const message =
    typeof node["#text"] === "string"
      ? stripTags(node["#text"])
      : stripTags(String(err));
  return { code, message };
}

export function hasYandexSearchResponse(doc: unknown): boolean {
  const root = doc as Record<string, unknown> | null;
  const yandex = root?.yandexsearch as Record<string, unknown> | undefined;
  return Boolean(yandex?.response);
}
