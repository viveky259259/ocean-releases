# Website analytics design

## Goal

Measure anonymous acquisition, visits, content engagement, and conversion activity across `getocean.dev` and `docs.getocean.dev` using the existing Firebase project, `getoceanplatform`. Make pricing available directly on the marketing homepage as well as the standalone pricing URL.

## Scope

Both static sites will report to one GA4 property through Firebase Analytics. Analytics loads when a page loads; there is no analytics consent prompt. Events must not contain email addresses, names, form-field values, or other personally identifiable information.

The marketing homepage will include the existing four pricing plans (Free, Pro, Teams, and Enterprise) in a responsive pricing section. Its navigation and footer links target that section; the standalone pricing page remains available for direct links and search indexing.

## Design

Each site includes a small, shared browser-side analytics module and a local configuration block containing the Firebase web-app configuration and GA4 measurement ID.

On initialization, the module:

1. Loads Firebase Analytics and records the page view.
2. Reads standard campaign parameters from the landing URL: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content`, plus recognised advertising click IDs when present.
3. Retains the attribution values for the current browser session so conversion events can be associated with the visit that produced them.
4. Sends only approved event names and non-identifying metadata to GA4.

The module tracks these events:

- `pricing_view` when the pricing page or homepage pricing section is viewed.
- `download_click` when a visitor follows a release-download link.
- `waitlist_click` when a visitor follows a waitlist link.
- `enterprise_contact_click` when a visitor follows an enterprise or contact CTA.
- `docs_article_view` when a documentation article is opened.

GA4's automatic page-view collection provides aggregate visit time, page, referrer, device, geography, and returning-visitor reporting. UTM values provide campaign attribution. The GA4 property will be linked to BigQuery separately so event-level analysis is available if required.

## Data boundaries

- Never include raw form data, email addresses, names, IP addresses, user IDs, or free-text fields in events.
- Do not use session recording, fingerprinting, or cross-site identity stitching.
- UTM and click ID values are accepted only as attribution metadata and are not rendered into the page.
- Analytics failures must never prevent page rendering or link navigation.

## Verification

- Confirm the measurement ID is present on both domains in the browser network/GA4 DebugView.
- Verify a UTM-tagged visit keeps its source, medium, campaign, term, and content on a subsequent tracked CTA.
- Verify each approved event fires once for its corresponding action.
- Verify malformed or absent campaign parameters do not cause JavaScript errors.
- Confirm no form fields or URL fragments are included in event parameters.
