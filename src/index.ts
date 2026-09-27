import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { assertUniqueToolNames } from "./api/catalog.js";
import { XmlStockClient } from "./client.js";
import { loadConfig } from "./config.js";
import { registerAllTools } from "./register.js";
import { compositeTools } from "./tools/composite.js";

const PACKAGE_VERSION = "0.1.0";

const SERVER_INSTRUCTIONS = `Tools for XMLstock (Yandex XML Proxy, Yandex Live, Google XML Search, Wordstat).

Auth: XMLSTOCK_USER and XMLSTOCK_KEY from https://xmlstock.com dashboard.

Workflow:
1. Call xmlstock_balance (free) to verify credentials.
2. Use raw tools (xmlstock_yandex_xml_get, xmlstock_yandex_live, xmlstock_google, xmlstock_wordstat) for full API passthrough.
3. Use composite tools (xmlstock_serp, xmlstock_wordstat_*) for parsed JSON summaries.

Billing: most search tools charge per HTTP request. Yandex XML codes 15/210 may still bill. Poll async/hybrid (202/210) no faster than every 20-30s.

Yandex XML: hybrid default; async uses delayed=1 then req_id. Google/Yandex Live depth>10 requires pagination (each page is paid).

See xmlstock_api_reference for URLs and error codes.`;

async function main(): Promise<void> {
  assertUniqueToolNames(
    undefined,
    [...compositeTools.map((t) => t.name), "xmlstock_api_reference"],
  );
  const config = loadConfig();
  const client = new XmlStockClient(config);

  const server = new McpServer(
    { name: "xmlstock-mcp", version: PACKAGE_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );

  registerAllTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
