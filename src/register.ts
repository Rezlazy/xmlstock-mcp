import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { catalog } from "./api/catalog.js";
import { XmlStockApiError, type XmlStockClient } from "./client.js";
import { buildZodShape, executeEndpoint } from "./execute.js";
import { compositeTools } from "./tools/composite.js";
import { API_REFERENCE } from "./tools/reference.js";

function formatResult(data: unknown): string {
  if (data === null || data === undefined) return "null";
  return typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function errorMessage(err: unknown): string {
  if (err instanceof XmlStockApiError) return err.message;
  return err instanceof Error ? err.message : String(err);
}

function toolResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], ...(isError ? { isError } : {}) };
}

export function registerAllTools(server: McpServer, client: XmlStockClient): void {
  for (const def of catalog) {
    server.tool(def.name, def.description, buildZodShape(def), async (args) => {
      try {
        const result = await executeEndpoint(client, def, args as Record<string, unknown>);
        return toolResult(formatResult(result));
      } catch (err) {
        return toolResult(errorMessage(err), true);
      }
    });
  }

  for (const tool of compositeTools) {
    server.tool(tool.name, tool.description, tool.schema, async (args) => {
      try {
        const result = await tool.handler(client, args as Record<string, unknown>);
        return toolResult(formatResult(result));
      } catch (err) {
        return toolResult(errorMessage(err), true);
      }
    });
  }

  server.tool(
    "xmlstock_api_reference",
    "Static reference: URLs, Yandex XML errors, billing notes, env vars",
    {},
    async () => toolResult(API_REFERENCE),
  );
}
