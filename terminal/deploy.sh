#!/bin/bash
# terminal.getocean.dev: render the download page from the public release manifests, then deploy
# it as the assets-only Worker `terminal-getocean-dev` in the Cloudflare account that owns the
# getocean.dev zone. Needs `npx wrangler login` (or CLOUDFLARE_API_TOKEN with Workers edit access).
set -euo pipefail
cd "$(dirname "$0")"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-ddbda73063c2c1e161c17964f8a6be27}"
node render.mjs
npx --yes wrangler@4 deploy
echo "Deployed: https://terminal.getocean.dev"
