import { z } from "zod";
import type { XmlStockClient } from "../client.js";
import {
  googlePath,
  wordstatPath,
  yandexLivePath,
  yandexXmlPath,
} from "../paths.js";
import {
  parseGoogleJson,
  parseSerpFromXml,
  parseWordstatWords,
} from "../parse/serp.js";

export interface CompositeTool {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
  handler: (client: XmlStockClient, args: Record<string, unknown>) => Promise<unknown>;
}

function boolArg(value: unknown, fallback: boolean): boolean {
  if (value === 1 || value === "1" || value === true) return true;
  if (value === 0 || value === "0" || value === false) return false;
  return fallback;
}

async function fetchXmlPage(
  client: XmlStockClient,
  path: string,
  params: Record<string, unknown>,
  autoRetry: boolean,
): Promise<string> {
  const raw = await client.getRaw(path, params, { autoRetry });
  if (raw.kind !== "text") {
    return JSON.stringify(raw.data);
  }
  return raw.data;
}

export const compositeTools: CompositeTool[] = [
  {
    name: "xmlstock_serp",
    description:
      "Parsed organic SERP (PAID per page/request). engine: google | yandex_live | yandex_xml. " +
      "yandex_xml supports up to 100 results per request (groupby); live/google paginate 10 per page (max depth 30).",
    schema: {
      query: z.string().min(1),
      engine: z.enum(["google", "yandex_live", "yandex_xml"]).default("google"),
      device: z.enum(["desktop", "mobile"]).default("desktop"),
      lr: z.number().int().optional(),
      depth: z.number().int().min(1).max(1000).default(10),
      page: z.number().int().min(0).optional(),
      domain: z.string().optional(),
      sortby: z.enum(["relevance", "date"]).default("relevance"),
      filter: z.enum(["moderate", "none", "strict"]).optional(),
      maxpassages: z.number().int().min(1).max(5).optional(),
      autoPoll: z.boolean().default(true),
    },
    handler: async (client, args) => {
      const engine = args.engine as string;
      const depth = args.depth as number;
      const autoRetry = boolArg(args.autoPoll, true);

      if (engine !== "yandex_xml" && depth > 30) {
        throw new Error("depth > 30 is only supported for engine=yandex_xml");
      }

      const baseParams: Record<string, unknown> = {
        query: args.query,
        device: args.device,
      };
      if (args.lr !== undefined) baseParams.lr = args.lr;
      if (args.domain) baseParams.domain = args.domain;

      if (engine === "yandex_xml") {
        const groupby = Math.min(depth, 100);
        baseParams.groupby = groupby;
        if (args.sortby === "date") baseParams.sortby = "tm";
        if (args.filter) baseParams.filter = args.filter;
        if (args.maxpassages) baseParams.maxpassages = args.maxpassages;
        const xml = await fetchXmlPage(
          client,
          yandexXmlPath(),
          baseParams,
          autoRetry,
        );
        const { collection, error } = parseSerpFromXml(xml, 1);
        return {
          ...collection,
          truncated: collection.count < depth,
          note: error?.code === 15 ? "empty billed result (code 15)" : undefined,
        };
      }

      const path =
        engine === "google" ? googlePath("xml") : yandexLivePath("xml");
      const perPage = 10;
      const startPage = (args.page as number | undefined) ?? 0;
      const pagesNeeded = Math.ceil(depth / perPage);
      const allResults: ReturnType<typeof parseSerpFromXml>["collection"]["results"] =
        [];
      let found: number | null = null;
      let truncated = false;

      for (let i = 0; i < pagesNeeded; i++) {
        const page = startPage + i;
        const params = { ...baseParams, page };
        const xml = await fetchXmlPage(client, path, params, autoRetry);
        const { collection, error } = parseSerpFromXml(xml, allResults.length + 1);
        if (error && error.code !== 15) throw new Error(`SERP error ${error.code}: ${error.message}`);
        found = collection.found ?? found;
        allResults.push(...collection.results);
        if (collection.results.length < perPage) {
          truncated = true;
          break;
        }
        if (allResults.length >= depth) break;
      }

      return {
        found,
        count: Math.min(allResults.length, depth),
        results: allResults.slice(0, depth),
        empty: allResults.length === 0,
        truncated: truncated || allResults.length < depth,
      };
    },
  },
  {
    name: "xmlstock_google_vertical",
    description:
      "Parsed Google vertical search (PAID): images, news, or video via tbm parameter.",
    schema: {
      query: z.string().min(1),
      tbm: z.enum(["images", "news", "video"]),
      gl: z.string().optional(),
      hl: z.string().optional(),
      responseFormat: z.enum(["json", "xml"]).default("json"),
    },
    handler: async (client, args) => {
      const format = args.responseFormat as string;
      const params: Record<string, unknown> = {
        query: args.query,
        tbm: args.tbm,
      };
      if (args.gl) params.gl = args.gl;
      if (args.hl) params.hl = args.hl;

      const raw = await client.getRaw(googlePath(format as "json" | "xml"), params, {
        autoRetry: true,
      });
      if (raw.kind === "json") {
        return { items: parseGoogleJson(raw.data), raw: raw.data };
      }
      const { collection } = parseSerpFromXml(raw.data, 1);
      return { items: collection.results, xml: raw.data };
    },
  },
  {
    name: "xmlstock_wordstat_top",
    description: "Wordstat top phrases for a query (pagetype=words). PAID.",
    schema: {
      query: z.string().min(1),
      groupby: z.number().int().min(1).max(2000).optional(),
      regions: z.string().optional(),
      device: z.string().optional(),
    },
    handler: async (client, args) => {
      const params: Record<string, unknown> = {
        query: args.query,
        pagetype: "words",
      };
      if (args.groupby) params.groupby = args.groupby;
      if (args.regions) params.regions = args.regions;
      if (args.device) params.device = args.device;
      const raw = await client.getRaw(wordstatPath(), params);
      if (raw.kind !== "json") throw new Error("Wordstat returned non-JSON");
      return parseWordstatWords(raw.data);
    },
  },
  {
    name: "xmlstock_wordstat_history",
    description: "Wordstat frequency history (pagetype=history). PAID.",
    schema: {
      query: z.string().min(1),
      period: z.enum(["month", "week", "day"]).default("month"),
      start: z.string().optional(),
      end: z.string().optional(),
      regions: z.string().optional(),
      device: z.string().optional(),
    },
    handler: async (client, args) => {
      const params: Record<string, unknown> = {
        query: args.query,
        pagetype: "history",
        period: args.period,
      };
      if (args.start) params.start = args.start;
      if (args.end) params.end = args.end;
      if (args.regions) params.regions = args.regions;
      if (args.device) params.device = args.device;
      const raw = await client.getRaw(wordstatPath(), params);
      if (raw.kind !== "json") throw new Error("Wordstat returned non-JSON");
      return raw.data;
    },
  },
  {
    name: "xmlstock_wordstat_regions",
    description: "Wordstat regional distribution (pagetype=regions). PAID.",
    schema: {
      query: z.string().min(1),
      distributionby: z.enum(["all", "cities", "regions"]).optional(),
    },
    handler: async (client, args) => {
      const params: Record<string, unknown> = {
        query: args.query,
        pagetype: "regions",
      };
      if (args.distributionby) params.distributionby = args.distributionby;
      const raw = await client.getRaw(wordstatPath(), params);
      if (raw.kind !== "json") throw new Error("Wordstat returned non-JSON");
      return raw.data;
    },
  },
  {
    name: "xmlstock_wordstat_regions_tree",
    description: "Wordstat supported regions tree (pagetype=regionsTree). PAID.",
    schema: {},
    handler: async (client) => {
      const raw = await client.getRaw(wordstatPath(), { pagetype: "regionsTree" });
      if (raw.kind !== "json") throw new Error("Wordstat returned non-JSON");
      return raw.data;
    },
  },
  {
    name: "xmlstock_balance",
    description:
      "Account balance and usage (service API do=balance). Free — also validates XMLSTOCK_USER/XMLSTOCK_KEY.",
    schema: {},
    handler: async (client) => {
      const raw = await client.getRaw("/api/", { do: "balance" });
      if (raw.kind !== "json") {
        throw new Error(
          "XMLstock did not return JSON for balance — check XMLSTOCK_USER/XMLSTOCK_KEY",
        );
      }
      const data = raw.data as Record<string, unknown>;
      const errText = data.error ?? data.Error;
      if (errText !== undefined) {
        throw new Error(`XMLstock service error: ${String(errText)}`);
      }
      return data;
    },
  },
];
