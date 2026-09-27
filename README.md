# @rezlazy/xmlstock-mcp

MCP server for [XMLstock](https://xmlstock.com) — Yandex XML Proxy, Yandex Live, Google XML Search, Wordstat, and the account service API.

## Requirements

- Node.js 20+
- `XMLSTOCK_USER` and `XMLSTOCK_KEY` from the [XMLstock dashboard](https://xmlstock.com)

## Cursor configuration

```json
{
  "mcpServers": {
    "xmlstock": {
      "command": "npx",
      "args": ["-y", "@rezlazy/xmlstock-mcp"],
      "env": {
        "XMLSTOCK_USER": "<user-id>",
        "XMLSTOCK_KEY": "<api-key>"
      }
    }
  }
}
```

Local development:

```json
{
  "mcpServers": {
    "xmlstock": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `XMLSTOCK_USER` | yes | Account user ID |
| `XMLSTOCK_KEY` | yes | API key |
| `XMLSTOCK_BASE_URL` | no | Default `https://xmlstock.com` |
| `XMLSTOCK_REQUEST_TIMEOUT_MS` | no | Default `90000` |
| `XMLSTOCK_AUTO_RETRY_PENDING` | no | Retry Yandex XML 202/210 and rate limits on raw tools |

## Tools

### Raw (full API passthrough)

| Tool | Description |
|------|-------------|
| `xmlstock_yandex_xml_get` | Yandex Search API XML (GET), including `delayed` / `req_id` |
| `xmlstock_yandex_xml_post` | Yandex XML POST with `<request>` body |
| `xmlstock_yandex_live` | Yandex Live (`responseFormat`: xml, json, html) |
| `xmlstock_google` | Google XML Search (`responseFormat`: xml, json, html) |
| `xmlstock_wordstat` | Wordstat JSON API |
| `xmlstock_service` | Account API (`do`: balance, limit, load, tariff, stat, clearcache) |

### Composite (parsed JSON)

| Tool | Description |
|------|-------------|
| `xmlstock_serp` | Organic SERP for `google`, `yandex_live`, or `yandex_xml` |
| `xmlstock_google_vertical` | Google images / news / video |
| `xmlstock_wordstat_top` | Top Wordstat phrases |
| `xmlstock_wordstat_history` | Frequency over time |
| `xmlstock_wordstat_regions` | Demand by region |
| `xmlstock_wordstat_regions_tree` | Region tree |
| `xmlstock_balance` | Free balance / key check |

### Reference

| Tool | Description |
|------|-------------|
| `xmlstock_api_reference` | URLs, error codes, billing notes |

## Billing

XMLstock charges per request. Pagination and Yandex XML polling (202/210) each consume separate requests. Use `xmlstock_balance` before large jobs.

## Docs

- [Getting started](https://xmlstock.com/?do=help-getting-started)
- [Connection URLs](https://xmlstock.com/?do=help-yalive-connect)
- [Service API](https://xmlstock.com/?do=api)

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```
