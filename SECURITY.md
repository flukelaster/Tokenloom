# Security Policy

## Offline-By-Design Sandbox

Tokenloom (`DS Forge`) runs strictly offline inside Figma's plugin sandbox:

- `manifest.json` enforces `"networkAccess": { "allowedDomains": ["none"] }`.
- Neither the plugin main thread (`dist/plugin.js`) nor the single-file UI iframe (`dist/ui.html`) makes external HTTP, WebSocket, analytics, or telemetry requests.
- Design tokens, component recipes, and user file contents never leave your local Figma document.

## Supported Versions

| Version | Supported |
|---|---|
| `0.1.x` | Yes |

## Reporting a Vulnerability

If you discover a security or sandbox-isolation issue, please open a [GitHub Security Advisory](https://github.com/flukelaster/Tokenloom/security/advisories/new) rather than posting a public issue with exploit details. We will acknowledge receipt and work with you on a fix and coordinated disclosure.
