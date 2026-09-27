export type ResponseFormat = "xml" | "json" | "html";

export function yandexXmlPath(): string {
  return "/yandex/xml/";
}

export function yandexLivePath(format: ResponseFormat): string {
  return `/yandexlive/${format}/`;
}

export function googlePath(format: ResponseFormat): string {
  return `/google/${format}/`;
}

export function wordstatPath(): string {
  return "/wordstat/json/";
}

export function servicePath(): string {
  return "/api/";
}
