# Changelog

## [0.1.0-rc04] - 2026-09-19

### Added

- **AC swing/vane control** — expose vertical/horizontal vane swing mode as a Matter control, gated per-device by capability flag.
- **AC humidity and air-quality sensors** — surface humidity and air-quality (AQI, PM2.5, PM10) readings as Matter sensors for supporting devices.
- **AC energy consumption monitoring** — report instantaneous power consumption for devices that expose it.
- **AC custom scene buttons** — optional quick-access scene buttons that switch the AC to a saved operation-mode combo with one tap.
- **AC Jet/Quiet/Energy-save/Air-clean/LED toggles** — per-device capability-gated toggles for jet mode, quiet mode, energy-save mode, air-clean mode, and LED/display light control.

<a href="https://www.buymeacoffee.com/rinnvspktr" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

---

## [0.1.0-rc03] - 2026-09-18

### Added

- **AC keep-alive heartbeat** — periodic heartbeat alongside the existing polling loop keeps ThinQ AirConditioner connections alive between state refreshes, reducing stale/dropped device sessions (PR #6).

### Changed

- **Test coverage** — closed a coverage gap to keep CI at the required 75% threshold.

<a href="https://www.buymeacoffee.com/rinnvspktr" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

---

## [0.1.0-rc02] - 2026-09-16

### Added

- **ThinQ2 MQTT push support** — subscribes to ThinQ2 MQTT push notifications for near-real-time device state updates, with full test coverage.
- **Devices CLI command** — new CLI command to list all ThinQ devices discovered on the account.
- **Lifecycle debug tracing** — debug-level tracing across the ThinQ AirConditioner runtime lifecycle for easier troubleshooting.

### Changed

- **Matterbridge dependency bump** — updated the required Matterbridge version.

<a href="https://www.buymeacoffee.com/rinnvspktr" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

---

## [0.1.0-rc01] - 2026-09-14

### Added

- **Plugin bootstrap** — initial Matterbridge dynamic platform lifecycle skeleton for LG ThinQ + webOS TV integration.
- **ThinQ CLI login helper** — command-line authentication flow with session persistence for LG ThinQ accounts.
- **ThinQ AirConditioner command wiring** — device discovery, registration, and command dispatch for ThinQ AirConditioner devices.
- **Per-device AC capability flags** — configurable capability detection per AirConditioner device to gate supported features.
- **GitHub Actions workflow templates** — CI workflow scaffolding for automated builds and checks.

### Changed

- **AirConditioner state synchronization** — polling loop applies ThinQ device snapshots to registered Matterbridge endpoints, respecting per-device capabilities.

<a href="https://www.buymeacoffee.com/rinnvspktr" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

---
