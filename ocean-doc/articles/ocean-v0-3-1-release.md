# Ocean v0.3.1 — Signed Maintenance Release

Released: 2026-08-01

## Release Overview

Ocean v0.3.1 is a maintenance release. It preserves the v0.3.0 in-app experience while refreshing the signed macOS package and its bundled Mastra sidecar integrity data.

## What Changed

- Rebuilt the macOS application package and verified signing, notarization, and the stapled Gatekeeper ticket.
- Refreshed the bundled Mastra sidecar manifest with the packaged release asset's integrity hash.
- Published the Apple Silicon update archive and its signature.

## Install

```bash
tar -xzf Ocean_0.3.1_aarch64.app.tar.gz
mv Ocean.app /Applications/
xattr -cr /Applications/Ocean.app
```

**Platform:** macOS (Apple Silicon)

---

*Ocean is the trust layer for coding agents. [Learn more](https://docs.getocean.dev)*
