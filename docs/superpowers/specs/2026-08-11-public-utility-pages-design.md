# getocean.dev Public Utility Pages Design

## Goal

Add public utility routes to the existing static Firebase website:

- `https://getocean.dev/unsubscribe/` sends visitors to Ocean's email
  unsubscribe Google Form;
- the misspelled `/unsubscirbe` path permanently redirects to `/unsubscribe/`;
- `https://getocean.dev/health/` gives people a readable website-health page;
  and
- `https://getocean.dev/health.json` gives uptime monitors a small JSON health
  response.

These routes describe only the availability of `getocean.dev`. They do not
claim that the Ocean desktop application, APIs, relay, or other subdomains are
healthy.

## Unsubscribe Experience

The unsubscribe page uses Ocean's existing dark navy, blue, typography, logo,
and focus conventions while remaining visually focused on one task. It shows:

- the Ocean brand;
- the heading "Unsubscribe from Ocean emails";
- a brief explanation of the next step;
- one prominent link to `https://forms.gle/xrjP3sYnkNbMozgM7`; and
- a quiet link back to `https://getocean.dev/`.

The page does not collect, prefill, transmit, or store an email address. It
must not imply that an unsubscribe request is complete before the visitor
submits the Google Form. It does not load analytics or other tracking scripts.

The canonical URL is `/unsubscribe/`. Firebase Hosting returns a `301`
redirect from the user-supplied misspelling `/unsubscirbe` to the canonical
route so existing links and typos still work without creating duplicate pages.

## Health Experience

The human-readable `/health/` page returns HTTP `200` when Firebase can serve
the website. It shows a concise "Website operational" state, identifies the
checked service as `getocean.dev`, and links back to the home page. It avoids a
fake dashboard, historical uptime percentage, or checks of systems it cannot
actually observe.

The machine-readable `/health.json` response is exactly:

```json
{
  "status": "ok",
  "service": "getocean.dev"
}
```

Its `.json` extension gives it the correct JSON content type on Firebase. Both
health routes receive `Cache-Control: no-store` so a monitor does not mistake a
cached response for current website availability.

## Architecture

The implementation stays inside `website/`, the existing Firebase Hosting
public directory in the `ocean-releases` repository:

- `website/unsubscribe/index.html` serves `/unsubscribe/`;
- `website/health/index.html` serves `/health/`;
- `website/health.json` serves `/health.json`;
- `website/utility-pages.css` holds the small shared responsive visual system;
  and
- `website/firebase.json` owns the misspelling redirect and route-specific
  headers.

There is no framework, build step, backend, client-side router, API call, or new
dependency. Each HTML page remains directly deployable with the site's current
Firebase target.

## Accessibility, Privacy, and Metadata

- Use semantic `main` content, one `h1`, meaningful link text, visible keyboard
  focus, WCAG AA contrast, and responsive layouts down to 320 CSS pixels.
- Use the existing local Ocean favicon/logo and system fonts; do not add remote
  images, fonts, scripts, cookies, or storage calls.
- Mark both utility pages `noindex, nofollow` and send matching
  `X-Robots-Tag` headers.
- Give each page an accurate title, description, canonical URL, viewport, theme
  color, and color-scheme declaration.
- Keep the unsubscribe destination in the same tab for a direct continuation of
  the task.

## Failure Behavior

The unsubscribe page uses a normal HTTPS anchor, so navigation works without
JavaScript. If Google Forms is unavailable, the destination browser page owns
the failure; the Ocean page remains safe to revisit and never reports success.

The health routes intentionally test only the website edge. If Firebase cannot
serve them, monitors receive a connection or non-200 failure instead of a
misleading application-generated success response.

## Verification and Deployment

Before deployment:

- parse both HTML documents and validate their landmarks, headings, metadata,
  destinations, and lack of form controls or tracking scripts;
- parse `health.json` and assert the exact two-field contract;
- validate the Firebase configuration, redirect destination, `301` status, JSON
  content type, `no-store`, and `X-Robots-Tag` headers;
- render both pages in Chromium at mobile and desktop sizes;
- verify keyboard focus, reduced motion, 200% text sizing, no horizontal
  overflow, and no console errors; and
- confirm the Google Form still resolves successfully.

Deploy only the `main` Firebase Hosting target from `website/`. After
deployment, verify all four public URLs, live headers and bodies, the redirect,
and the unsubscribe link without submitting the form.

## Out of Scope

- Processing unsubscribe requests directly;
- checking the health of the desktop application, APIs, relay, docs, blog, or
  other Ocean services;
- uptime history, incident management, alerts, or a status-page backend;
- analytics or conversion tracking on either utility route; and
- changing the Google Form itself.
