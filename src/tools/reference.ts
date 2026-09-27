export const API_REFERENCE = `# XMLstock MCP reference

Docs: https://xmlstock.com/?do=help-getting-started

## Base URLs (append user, key, and product params)

| Product | URL |
|---------|-----|
| Yandex XML | https://xmlstock.com/yandex/xml/ |
| Yandex Live | https://xmlstock.com/yandexlive/{xml\\|json\\|html}/ |
| Google | https://xmlstock.com/google/{xml\\|json\\|html}/ |
| Wordstat | https://xmlstock.com/wordstat/json/ |
| Service API | https://xmlstock.com/api/?do=... |

## Yandex XML async / hybrid

- Hybrid (default): repeat request on error 210/202 every 20-30s.
- Async: \`delayed=1\` → \`req_id\`, poll with \`req_id=\` (do not submit duplicate delayed jobs).
- Billing: charged on first submit for async; code 15 empty results are billed.

## Yandex XML error codes (HTTP 200 + <error>)

| Code | Notes |
|------|-------|
| 15 | No results (billed) |
| 202 | Not ready — retry |
| 210 | Queued — retry |
| 200 | Insufficient balance |
| -34 | Invalid user/key |
| 55 | Rate limit — backoff |

Full list: https://xmlstock.com/?do=help-yaxml-errors

## Service API (do=)

Documented capabilities: balance, request limits, load, tariff, today's count, clear Yandex XML cache.
Use tool \`xmlstock_service\` with \`do\` parameter.

## Environment

- XMLSTOCK_USER, XMLSTOCK_KEY (required)
- XMLSTOCK_AUTO_RETRY_PENDING=true — auto-retry 202/210/55 on raw tools
- XMLSTOCK_REQUEST_TIMEOUT_MS (default 90000)
`;
