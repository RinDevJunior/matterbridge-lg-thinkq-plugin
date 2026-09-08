# Reference Workspaces (allowlist)

External codebases agents may consult, **read-only**. Investigator and technical-architect may ONLY read paths listed here — anything not listed is out of bounds.

**Priority = list order.** Agents consult top-first and stop early once the question is answered.

Added for the `migrate-lg-thinq-to-matterbridge` task (Sep 8, 2026).

| Name                                  | Path                                                                         | Notes                                                                                                                                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| matterbridge-example-dynamic-platform | `/Volumes/ExternalSSD/code/references/matterbridge-example-dynamic-platform` | Canonical Matterbridge dynamic-platform plugin shape: lifecycle hooks, device factories (`matterbridge/devices`), config schema, build tooling.                                                      |
| homebridge-lg-thinq                   | `/Volumes/ExternalSSD/code/references/homebridge-lg-thinq`                   | Source logic to port: LG ThinQ cloud OAuth/auth flow, API client, device discovery, device type classes, capability mapping, MQTT/polling event model.                                               |
| homebridge-webos-tv                   | `/Volumes/ExternalSSD/code/references/homebridge-webos-tv`                   | SECOND source to port: LG webOS TV control over local network/websocket (SSAP protocol), NOT the ThinQ cloud API — distinct auth/connection model (local client-key pairing).                        |
| matterbridge-roborock-vacuum-plugin   | `/Volumes/ExternalSSD/code/matterbridge-roborock-vacuum-plugin`              | Sibling plugin, closest structural precedent for a prior Homebridge→Matterbridge migration in this family (folder layout, matterbridge API usage, config/build tooling, node-persist token storage). |

## Rules

- Read-only — never modify, format, or stage files in these paths.
- CodeGraph does NOT work here (it indexes this repo only) — use Grep/Glob/Read.
- Cite findings as `<workspace-name>/path/to/file:line` in answers.
- To add a workspace: append a row here (with a one-line note on what it is good for) — no other change needed.
