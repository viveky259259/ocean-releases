(() => {
  'use strict';

  const measurementId = 'G-04ECN7XEVS';
  const attributionStorageKey = 'ocean:analytics:attribution';
  const campaignParameters = {
    utm_source: 'campaign_source',
    utm_medium: 'campaign_medium',
    utm_campaign: 'campaign_name',
    utm_term: 'campaign_term',
    utm_content: 'campaign_content',
    gclid: 'gclid',
    dclid: 'dclid',
    gbraid: 'gbraid',
    wbraid: 'wbraid',
    msclkid: 'msclkid',
    fbclid: 'fbclid',
    ttclid: 'ttclid',
    li_fat_id: 'li_fat_id',
  };
  const safeCampaignValue = /^[A-Za-z0-9._~-]{1,100}$/;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  const readAttribution = () => {
    try {
      const value = window.sessionStorage.getItem(attributionStorageKey);
      return value ? JSON.parse(value) : {};
    } catch {
      return {};
    }
  };

  const captureAttribution = () => {
    const parameters = new URLSearchParams(window.location.search);
    const incoming = {};

    for (const [urlParameter, eventParameter] of Object.entries(campaignParameters)) {
      const value = parameters.get(urlParameter);
      if (value && safeCampaignValue.test(value)) incoming[eventParameter] = value;
    }

    if (Object.keys(incoming).length === 0) return readAttribution();

    try {
      window.sessionStorage.setItem(attributionStorageKey, JSON.stringify(incoming));
    } catch {
      // Analytics still works when storage is unavailable.
    }

    return incoming;
  };

  const safePageLocation = `${window.location.origin}${window.location.pathname}`;
  const attribution = captureAttribution();

  window.gtag('js', new Date());
  window.gtag('set', attribution);
  window.gtag('config', measurementId, {
    page_location: safePageLocation,
    page_title: document.title,
    linker: { domains: ['getocean.dev', 'docs.getocean.dev'] },
  });

  const track = (eventName, details = {}) => {
    window.gtag('event', eventName, { ...attribution, ...details });
  };

  if (window.location.pathname === '/article.html') {
    const articleId = new URLSearchParams(window.location.search).get('id');
    track('docs_article_view', articleId && safeCampaignValue.test(articleId) ? { article_id: articleId } : {});
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const destination = new URL(link.href, window.location.href);
    if (destination.hostname === 'github.com' && destination.pathname.includes('/releases')) {
      track('download_click');
      return;
    }

    if (destination.hostname === 'forms.gle') track('waitlist_click');
  });
})();
