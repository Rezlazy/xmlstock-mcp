import type { ZodRawShape } from "zod";
import { enumStr, flag, int, num, str } from "../types.js";

export const yandexXmlGetParams: ZodRawShape = {
  query: str("Search query text (required unless req_id is set)", true),
  lr: int("Yandex region ID", true),
  l10n: enumStr(["ru", "uk", "be", "kk", "tr", "en"], "Notification language", true),
  sortby: str("Sort rule: rlv or tm.order%3Dascending etc.", true),
  filter: enumStr(["moderate", "none", "strict"], "Family filter", true),
  maxpassages: int("Max passages in snippet (1-5)", true),
  groupby: str("Results per page (10-100) or advanced grouping string", true),
  page: int("Page number (0-based)", true),
  domain: enumStr(
    ["ru", "by", "be", "kz", "kk", "com", "com.tr", "tr", "uz"],
    "Yandex domain zone",
    true,
  ),
  device: enumStr(
    ["desktop", "mobile", "tablet", "iphone", "android"],
    "Device type",
    true,
  ),
  noreask: flag("Disable typo correction (1 = no correction)"),
  delayed: flag("Async mode: enqueue and return req_id"),
  req_id: str("Poll async result by task id", true),
};

export const yandexXmlPostUrlParams: ZodRawShape = {
  lr: int("Yandex region ID", true),
  l10n: enumStr(["ru", "uk", "be", "kk", "tr", "en"], "Notification language", true),
  filter: enumStr(["moderate", "none", "strict"], "Family filter", true),
  domain: enumStr(
    ["ru", "by", "be", "kz", "kk", "com", "com.tr", "tr", "uz"],
    "Yandex domain zone",
    true,
  ),
  device: enumStr(
    ["desktop", "mobile", "tablet", "iphone", "android"],
    "Device type",
    true,
  ),
  requestXml: str("POST body: Yandex XML <request>...</request> document"),
};

export const responseFormatParam = enumStr(
  ["xml", "json", "html"],
  "Response format (HTML for Yandex Live requires tbm=turbo)",
);

export const yandexLiveParams: ZodRawShape = {
  responseFormat: responseFormatParam,
  query: str("Search query text"),
  lr: int("Yandex region ID", true),
  page: int("Page number (0-based)", true),
  domain: enumStr(["ru", "by", "kz", "com.tr"], "Yandex domain zone", true),
  device: enumStr(["desktop", "mobile"], "Device type", true),
  tbm: str("Search type: images, video, turbo (omit for web)", true),
  lang: str("Language filter (ru, en, ...)", true),
  within: enumStr(["77", "1", "2"], "Time filter: 77=day, 1=2weeks, 2=month", true),
  rstr: str("Regional restriction e.g. rstr=-213", true),
  ads: flag("Include top/bottom ad blocks (ads=1)"),
  scroller: flag("Include ad carousel", true),
  related: flag("Include Related Searches block"),
  punycode: flag("Show Cyrillic domains as punycode"),
  hlword: flag("Highlight keywords with hlword tag"),
  noreask: flag("Disable query correction"),
  autoRetry: flag("Retry on 202/210 and rate limits (overrides env default)"),
};

export const googleParams: ZodRawShape = {
  responseFormat: responseFormatParam,
  query: str("Search query text"),
  lr: int("Region ID (Yandex IDs are mapped to Google)", true),
  page: int("Page number (0-based)", true),
  start: int("Alternative pagination offset", true),
  domain: str("Google domain zone (deprecated in docs)", true),
  device: enumStr(["desktop", "mobile"], "Device type", true),
  tbm: str("Search vertical: images, news, video (omit for web)", true),
  tbs: str("Time range (qdr:d, cdr:1,cd_min:...,cd_max:...)", true),
  hl: str("Interface language", true),
  gl: str("Country for image search", true),
  ads: flag("Include ad blocks (may not work in RU)"),
  related: flag("Related Questions and Related Searches"),
  filter: flag("Show omitted similar results (filter=1)"),
  punycode: flag("Cyrillic domains as punycode"),
  hlword: flag("Highlight keywords"),
  nfpr: flag("Disable query correction (nfpr=1)"),
  safe: enumStr(["", "on", "off"], "Safe search", true),
  autoRetry: flag("Retry on transient errors"),
};

export const wordstatParams: ZodRawShape = {
  query: str("Wordstat query (max 400 chars)"),
  pagetype: enumStr(
    ["words", "history", "regions", "regionsTree"],
    "Result type",
    true,
  ),
  groupby: int("Number of phrases (1-2000, words only)", true),
  device: str("Device filter: all, desktop, mobile, tablet (comma-separated)", true),
  period: enumStr(["month", "week", "day"], "History aggregation", true),
  start: str("History start date DD.MM.YYYY", true),
  end: str("History end date DD.MM.YYYY", true),
  regions: str("Region IDs comma-separated or all", true),
  distributionby: enumStr(
    ["all", "cities", "regions"],
    "Regions report granularity",
    true,
  ),
};

export const serviceParams: ZodRawShape = {
  do: enumStr(
    [
      "balance",
      "limit",
      "load",
      "tariff",
      "stat",
      "clearcache",
    ],
    "Service API action (see xmlstock.com/?do=api)",
  ),
  format: enumStr(["json", "html"], "Response format", true),
  extraQuery: str(
    "Additional query string without leading ? (key=value&...)",
    true,
  ),
};
