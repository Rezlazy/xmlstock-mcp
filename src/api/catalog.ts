import type { EndpointDef } from "../types.js";
import {
  googleParams,
  serviceParams,
  wordstatParams,
  yandexLiveParams,
  yandexXmlGetParams,
  yandexXmlPostUrlParams,
} from "./params.js";
import {
  googlePath,
  servicePath,
  wordstatPath,
  yandexLivePath,
  yandexXmlPath,
} from "../paths.js";
import type { ResponseFormat } from "../paths.js";

const BILLED_NOTE =
  " PAID: each call may charge your XMLstock balance.";

function formatPath(args: Record<string, unknown>, product: "google" | "yandex_live"): string {
  const format = (args.responseFormat as ResponseFormat) ?? "xml";
  return product === "google" ? googlePath(format) : yandexLivePath(format);
}

export const catalog: EndpointDef[] = [
  {
    name: "xmlstock_yandex_xml_get",
    description:
      "Raw Yandex XML Proxy (Search API) GET request. Supports hybrid/async (delayed, req_id)." +
      BILLED_NOTE,
    method: "GET",
    resolvePath: () => yandexXmlPath(),
    params: yandexXmlGetParams,
    billed: true,
  },
  {
    name: "xmlstock_yandex_xml_post",
    description:
      "Raw Yandex XML Proxy POST with XML <request> body. URL carries auth and lr/l10n/filter/domain/device." +
      BILLED_NOTE,
    method: "POST",
    resolvePath: () => yandexXmlPath(),
    params: yandexXmlPostUrlParams,
    postBodyArg: "requestXml",
    billed: true,
  },
  {
    name: "xmlstock_yandex_live",
    description:
      "Raw Yandex Live SERP (organic/live Yandex). Formats: xml, json, html (html often needs tbm=turbo)." +
      BILLED_NOTE,
    method: "GET",
    resolvePath: (args) => formatPath(args, "yandex_live"),
    params: yandexLiveParams,
    billed: true,
  },
  {
    name: "xmlstock_google",
    description:
      "Raw Google XML Search. Formats: xml, json, html. Verticals via tbm=images|news|video." +
      BILLED_NOTE,
    method: "GET",
    resolvePath: (args) => formatPath(args, "google"),
    params: googleParams,
    billed: true,
  },
  {
    name: "xmlstock_wordstat",
    description:
      "Raw Yandex Wordstat API (JSON only). Use pagetype words|history|regions|regionsTree." +
      BILLED_NOTE,
    method: "GET",
    resolvePath: () => wordstatPath(),
    params: wordstatParams,
    billed: true,
  },
  {
    name: "xmlstock_service",
    description:
      "XMLstock account service API (balance, limits, load, tariff, today's stats, clear Yandex XML cache). Free for balance.",
    method: "GET",
    resolvePath: () => servicePath(),
    params: serviceParams,
    billed: false,
  },
];

export function assertUniqueToolNames(
  defs: EndpointDef[] = catalog,
  extraNames: string[] = [],
): void {
  const seen = new Set<string>();
  for (const name of [...defs.map((d) => d.name), ...extraNames]) {
    if (seen.has(name)) {
      throw new Error(`Duplicate tool name: ${name}`);
    }
    seen.add(name);
  }
}
