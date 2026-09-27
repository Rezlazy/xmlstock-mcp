import { describe, expect, it } from "vitest";
import { assertUniqueToolNames, catalog } from "../src/api/catalog.js";
import { buildUrl, redactKey } from "../src/client.js";
import { loadConfig } from "../src/config.js";
import { mapQueryParams } from "../src/execute.js";

describe("catalog", () => {
  it("has unique tool names", () => {
    expect(() => assertUniqueToolNames()).not.toThrow();
  });

  it("includes raw product tools", () => {
    const names = catalog.map((d) => d.name);
    expect(names).toContain("xmlstock_yandex_xml_get");
    expect(names).toContain("xmlstock_google");
    expect(names).toContain("xmlstock_service");
  });
});

describe("loadConfig", () => {
  it("requires credentials", () => {
    expect(() => loadConfig({})).toThrow(/XMLSTOCK_USER/);
    expect(() => loadConfig({ XMLSTOCK_USER: "1" })).toThrow(/XMLSTOCK_KEY/);
  });
});

describe("buildUrl", () => {
  it("redacts api key", () => {
    const url = buildUrl(
      {
        user: "u",
        key: "secret",
        baseUrl: "https://xmlstock.com",
        requestTimeoutMs: 1000,
        autoRetryPending: false,
      },
      "/yandex/xml/",
      { query: "test" },
    );
    expect(url).toContain("user=u");
    expect(url).toContain("key=secret");
    expect(redactKey(url)).not.toContain("secret");
  });
});

describe("mapQueryParams", () => {
  it("maps service do and extra query", () => {
    const def = catalog.find((d) => d.name === "xmlstock_service")!;
    const q = mapQueryParams(
      { do: "balance", extraQuery: "foo=bar" },
      def,
    );
    expect(q.do).toBe("balance");
    expect(q.foo).toBe("bar");
  });

  it("strips responseFormat from query", () => {
    const def = catalog.find((d) => d.name === "xmlstock_google")!;
    const q = mapQueryParams(
      { query: "q", responseFormat: "json" },
      def,
    );
    expect(q.query).toBe("q");
    expect(q.responseFormat).toBeUndefined();
  });
});
