import { describe, expect, it, vi } from "vitest";
import { XmlStockClient, XmlStockApiError } from "../src/client.js";

const config = {
  user: "1",
  key: "k",
  baseUrl: "https://xmlstock.com",
  requestTimeoutMs: 5000,
  autoRetryPending: true,
};

describe("XmlStockClient", () => {
  it("retries on Yandex XML error 202", async () => {
    const pending = `<?xml version="1.0"?><yandexsearch><response><error code="202">wait</error></response></yandexsearch>`;
    const ok = `<?xml version="1.0"?><yandexsearch><response><results/></response></yandexsearch>`;
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response(pending, { status: 200 }))
      .mockResolvedValueOnce(new Response(ok, { status: 200 }));

    const client = new XmlStockClient(config, fetchFn as typeof fetch, async () => {});
    const raw = await client.getRaw("/yandex/xml/", { query: "x" }, { autoRetry: true, maxAttempts: 2 });
    expect(raw.kind).toBe("text");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("throws on fatal yandex error", async () => {
    const errXml = `<?xml version="1.0"?><yandexsearch><response><error code="200">no money</error></response></yandexsearch>`;
    const fetchFn = vi.fn().mockResolvedValue(new Response(errXml, { status: 200 }));
    const client = new XmlStockClient(config, fetchFn as typeof fetch, async () => {});
    await expect(
      client.getRaw("/yandex/xml/", { query: "x" }, { autoRetry: false }),
    ).rejects.toBeInstanceOf(XmlStockApiError);
  });
});
