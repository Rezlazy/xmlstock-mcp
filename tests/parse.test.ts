import { describe, expect, it } from "vitest";
import { parseSerpFromXml } from "../src/parse/serp.js";
import { extractYandexXmlError, parseXmlDocument } from "../src/parse/xml.js";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<yandexsearch version="1.0">
  <response>
    <found priority="phrase">1000</found>
    <results>
      <grouping>
        <group>
          <doc id="1">
            <url>https://example.com/page</url>
            <domain>example.com</domain>
            <title>Example <hlword>title</hlword></title>
            <passages><passage>Snippet <hlword>text</hlword></passage></passages>
          </doc>
        </group>
      </grouping>
    </results>
  </response>
</yandexsearch>`;

describe("parseSerpFromXml", () => {
  it("parses organic results", () => {
    const { collection, error } = parseSerpFromXml(SAMPLE_XML);
    expect(error).toBeNull();
    expect(collection.results).toHaveLength(1);
    expect(collection.results[0].url).toBe("https://example.com/page");
    expect(collection.results[0].title).toContain("Example");
    expect(collection.results[0].text_bolds).toContain("title");
  });
});

describe("extractYandexXmlError", () => {
  it("reads error code from xml", () => {
    const doc = parseXmlDocument(`<?xml version="1.0"?><yandexsearch><response><error code="202">wait</error></response></yandexsearch>`);
    const err = extractYandexXmlError(doc);
    expect(err?.code).toBe(202);
  });
});
