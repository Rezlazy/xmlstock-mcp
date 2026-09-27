import { asArray, extractYandexXmlError, parseXmlDocument, stripTags } from "./xml.js";

export interface SerpResult {
  position: number;
  url: string;
  title: string;
  snippet: string;
  domain?: string;
  id?: string;
  modtime?: string;
  saved_copy_url?: string;
  is_local?: boolean;
  text_bolds?: string[];
}

export interface SerpFeatures {
  featured_snippet?: unknown;
  paa?: unknown[];
  related?: unknown[];
  packs?: unknown[];
}

export interface SerpCollection {
  found: number | null;
  found_docs?: number | null;
  found_human?: string | null;
  count: number;
  results: SerpResult[];
  serp_features?: SerpFeatures;
  empty: boolean;
  truncated: boolean;
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function collectHlwords(node: unknown, out: string[]): void {
  if (node === null || node === undefined) return;
  if (typeof node === "string") return;
  if (Array.isArray(node)) {
    for (const item of node) collectHlwords(item, out);
    return;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if ("hlword" in obj) {
      const hw = obj.hlword;
      if (typeof hw === "string") out.push(hw);
      else asArray(hw).forEach((x) => typeof x === "string" && out.push(x));
    }
    for (const value of Object.values(obj)) collectHlwords(value, out);
  }
}

function textFromMixed(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromMixed).join(" ");
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj["#text"] === "string") return obj["#text"];
    return Object.values(obj).map(textFromMixed).join(" ");
  }
  return "";
}

function parseYandexDocs(doc: unknown, startPosition: number): SerpResult[] {
  const root = doc as Record<string, unknown>;
  const response = (root?.yandexsearch as Record<string, unknown>)?.response as
    | Record<string, unknown>
    | undefined;
  const results = response?.results as Record<string, unknown> | undefined;
  const grouping = results?.grouping as Record<string, unknown> | undefined;
  const groups = asArray(grouping?.group);

  const parsed: SerpResult[] = [];
  let pos = startPosition;
  for (const group of groups) {
    const docs = asArray((group as Record<string, unknown>).doc);
    for (const d of docs) {
      const docNode = d as Record<string, unknown>;
      const url = textFromMixed(docNode.url);
      const title = textFromMixed(docNode.title);
      const passagesRaw =
        (docNode.passages as { passage?: unknown } | undefined)?.passage ??
        docNode.passage;
      const passages = asArray(passagesRaw);
      const snippet =
        passages.map((p) => textFromMixed(p)).join(" ") ||
        textFromMixed(docNode.headline);
      const bolds: string[] = [];
      collectHlwords(docNode.title, bolds);
      collectHlwords(docNode.passages, bolds);
      parsed.push({
        position: pos,
        url,
        title: stripTags(title),
        snippet: stripTags(snippet),
        domain: textFromMixed(docNode.domain) || domainFromUrl(url),
        id: textFromMixed(docNode.id) || undefined,
        modtime: textFromMixed(docNode.modtime) || undefined,
        saved_copy_url: textFromMixed(docNode["saved-copy-url"]) || undefined,
        is_local:
          docNode["is-local"] === true ||
          docNode["is-local"] === "true" ||
          docNode["is-local"] === 1,
        text_bolds: bolds.length ? [...new Set(bolds)] : undefined,
      });
      pos += 1;
    }
  }
  return parsed;
}

function extractFound(doc: unknown): number | null {
  const response = ((doc as Record<string, unknown>)?.yandexsearch as Record<
    string,
    unknown
  >)?.response as Record<string, unknown> | undefined;
  const found = response?.found;
  if (found === undefined || found === null) return null;
  if (typeof found === "number") return found;
  if (typeof found === "object") {
    const f = found as Record<string, unknown>;
    const priority = asArray(f.priority).find((p) => p !== undefined);
    if (priority && typeof priority === "object") {
      return Number((priority as Record<string, unknown>)["#text"] ?? NaN) || null;
    }
    return Number(f["#text"] ?? NaN) || null;
  }
  return Number(found) || null;
}

function extractFoundDocs(doc: unknown): number | null {
  const response = ((doc as Record<string, unknown>)?.yandexsearch as Record<
    string,
    unknown
  >)?.response as Record<string, unknown> | undefined;
  const foundDocs = response?.["found-docs"];
  if (foundDocs === undefined || foundDocs === null) return null;
  if (typeof foundDocs === "number") return foundDocs;
  if (typeof foundDocs === "object") {
    return Number((foundDocs as Record<string, unknown>)["#text"] ?? NaN) || null;
  }
  return Number(foundDocs) || null;
}

function extractFoundHuman(doc: unknown): string | null {
  const response = ((doc as Record<string, unknown>)?.yandexsearch as Record<
    string,
    unknown
  >)?.response as Record<string, unknown> | undefined;
  const v = response?.["found-docs-human"];
  if (v === undefined || v === null) return null;
  return typeof v === "string" ? v : textFromMixed(v);
}

export function parseSerpFromXml(
  xmlText: string,
  startPosition = 1,
): { collection: SerpCollection; error: ReturnType<typeof extractYandexXmlError> } {
  const doc = parseXmlDocument(xmlText);
  const error = extractYandexXmlError(doc);
  if (error && error.code !== 15) {
    return {
      collection: {
        found: null,
        count: 0,
        results: [],
        empty: true,
        truncated: true,
      },
      error,
    };
  }
  const results = parseYandexDocs(doc, startPosition);
  const empty = error?.code === 15 || results.length === 0;
  return {
    collection: {
      found: extractFound(doc),
      found_docs: extractFoundDocs(doc),
      found_human: extractFoundHuman(doc),
      count: results.length,
      results,
      empty,
      truncated: false,
    },
    error: error?.code === 15 ? error : null,
  };
}

export function parseGoogleJson(payload: unknown): SerpResult[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const results = asArray(root.results ?? root.organic ?? root.items);
  return results.map((item, index) => {
    const row = item as Record<string, unknown>;
    const url = String(row.url ?? row.link ?? "");
    return {
      position: Number(row.position ?? index + 1),
      url,
      title: String(row.title ?? ""),
      snippet: String(row.snippet ?? row.description ?? ""),
      domain: String(row.domain ?? domainFromUrl(url)),
    };
  });
}

export function parseWordstatWords(payload: unknown): {
  totalCount?: number;
  results: { phrase: string; count: number }[];
  associations?: { phrase: string; count: number }[];
} {
  const root = (payload ?? {}) as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;
  const mapRows = (rows: unknown) =>
    asArray(rows).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        phrase: String(row.phrase ?? row.query ?? row.text ?? ""),
        count: Number(row.count ?? row.shows ?? 0),
      };
    });

  return {
    totalCount: Number(data.totalCount ?? data.total ?? root.totalCount) || undefined,
    results: mapRows(data.popular ?? data.words ?? data.results ?? data.top),
    associations: mapRows(data.associations ?? data.similar),
  };
}
