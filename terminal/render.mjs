// Renders terminal.getocean.dev's download page from the public release manifests in the
// `ocean-download-artifiacts` bucket, at deploy time. The bucket serves no CORS headers, so a
// browser cannot read the manifests itself; this script reads them and writes a static page.
// Usage: node render.mjs   (writes public/index.html)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUCKET = "https://ocean-download-artifiacts.s3.ap-south-1.amazonaws.com";
const MANIFESTS = {
  macos: `${BUCKET}/releases/stable/macos/x86_64/latest.json`,
  linux: `${BUCKET}/releases/stable/linux/x86_64/latest.json`,
};

const here = path.dirname(fileURLToPath(import.meta.url));

async function readManifest(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${String(response.status)}`);
  return response.json();
}

function escape(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function artifactRows(manifest) {
  const artifacts = manifest.artifacts ?? [
    { artifact: manifest.artifact, s3Key: manifest.s3Key, checksumS3Key: manifest.checksumS3Key, sha256: manifest.sha256, format: "zip" },
  ];
  return artifacts
    .map((a) => `
      <li>
        <a class="download" href="${escape(`${BUCKET}/${a.s3Key}`)}">${escape(a.artifact)}</a>
        <span class="meta">${escape(a.format ?? "")} · <a href="${escape(`${BUCKET}/${a.checksumS3Key}`)}">SHA-256</a> <code>${escape(a.sha256)}</code></span>
      </li>`)
    .join("");
}

function section(title, manifest, note) {
  const published = new Date(manifest.publishedAt).toISOString().slice(0, 10);
  return `
    <section>
      <h2>${escape(title)} <span class="version">v${escape(manifest.version)}</span></h2>
      <p class="meta">Published ${escape(published)} · built from <code>${escape(String(manifest.sourceCommit).slice(0, 12))}</code>${note ? ` · ${escape(note)}` : ""}</p>
      <ul>${artifactRows(manifest)}</ul>
    </section>`;
}

const [macos, linux] = await Promise.all([readManifest(MANIFESTS.macos), readManifest(MANIFESTS.linux)]);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ocean Terminal downloads</title>
<meta name="description" content="Download the current stable release of Ocean, the terminal-first control surface for AI coding agents.">
<link rel="icon" href="/favicon.png">
<style>
  :root { color-scheme: dark; --bg: #0c0c0d; --surface: #16161a; --text: #ececf1; --muted: #9a9aa6; --border: #2a2a31; --accent: #4fd1a5; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.5 Inter, -apple-system, system-ui, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 64px 16px; }
  h1 { font-size: 2rem; margin: 0 0 8px; }
  h2 { font-size: 1.25rem; margin: 32px 0 4px; }
  .lede, .meta { color: var(--muted); }
  .version { color: var(--accent); font-weight: 500; margin-left: 8px; }
  ul { list-style: none; padding: 0; margin: 12px 0 0; }
  li { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; display: grid; gap: 6px; }
  a { color: var(--text); }
  a.download { font-weight: 600; text-decoration: none; }
  a.download:hover { text-decoration: underline; }
  code { font: 0.85em/1.4 "JetBrains Mono", ui-monospace, monospace; word-break: break-all; color: var(--muted); }
  footer { margin-top: 48px; color: var(--muted); font-size: 0.9rem; }
  footer a { color: var(--muted); }
</style>
</head>
<body>
<main>
  <h1>Ocean Terminal</h1>
  <p class="lede">Stable releases of the terminal-first control surface for AI coding agents. Each archive is signed and notarized where the platform supports it; verify the SHA-256 before installing.</p>
  ${section("macOS (Intel, x86-64)", macos, "signed and notarized")}
  ${section("Linux (x86-64)", linux, linux.signed === false ? "unsigned" : "")}
  <footer>
    <a href="https://getocean.dev">getocean.dev</a> · <a href="https://docs.getocean.dev">Docs</a> · Release manifests: <a href="${MANIFESTS.macos}">macOS</a>, <a href="${MANIFESTS.linux}">Linux</a>
  </footer>
</main>
</body>
</html>
`;

await mkdir(path.join(here, "public"), { recursive: true });
await writeFile(path.join(here, "public", "index.html"), html);
console.log(`rendered public/index.html: macOS v${macos.version}, Linux v${linux.version}`);
