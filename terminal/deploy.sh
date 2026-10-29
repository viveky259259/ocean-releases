#!/bin/bash
# terminal.getocean.dev: render the download page from the public release manifests, then
# deploy it to the Cloudflare Pages project `terminal-getocean-dev`.
# Needs a wrangler login (`npx wrangler login`) or CLOUDFLARE_API_TOKEN with Pages edit access.
# One-time: `npx wrangler pages project create terminal-getocean-dev --production-branch main`,
# then attach the custom domain terminal.getocean.dev (dashboard: Pages project → Custom domains,
# which also creates the DNS record since getocean.dev is a zone on the same account).
set -euo pipefail
cd "$(dirname "$0")"
node render.mjs
npx --yes wrangler@4 pages deploy public --project-name terminal-getocean-dev --branch main --commit-dirty=true
echo "Deployed: https://terminal-getocean-dev.pages.dev (and https://terminal.getocean.dev once the custom domain is attached)"
