# Changelog

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
