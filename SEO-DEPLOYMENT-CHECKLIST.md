# Pet Fly Inc SEO deployment checklist

The public site now publishes canonical URLs, Open Graph/Twitter metadata, JSON-LD service and FAQ schemas, `robots.txt`, and `sitemap.xml`.

## Required account actions

These steps require access to the company domains/accounts and cannot be completed safely by application code:

1. Google Search Console: add `https://petflyinc.com`, verify the domain, submit `https://petflyinc.com/sitemap.xml`, and request indexing for `/`, `/service`, `/quote`, `/regulations`, and each route landing page.
2. Bing Webmaster Tools: import the verified Google Search Console property or verify the site, then submit the same sitemap.
3. Google Business Profile: confirm the business name, website, phone, service areas, hours, photos, and customer reviews.
4. Keep the canonical production hostname, HTTPS certificate, phone number, email, and business address consistent across directory listings.

## Post-deploy checks

- Open `https://petflyinc.com/robots.txt` and `https://petflyinc.com/sitemap.xml`.
- In Google Search Console, run URL Inspection on the homepage and each public service landing page.
- Run Lighthouse on a mobile viewport and address any Core Web Vitals warnings.
- Confirm quote/contact forms send a successful confirmation and show a usable error state.
- Recheck country and airline regulation content whenever requirements change.

## Content cadence

Publish two to four genuinely useful articles or regulation updates per month. Link each article to the most relevant service landing page and quote form, and refresh older regulation pages instead of creating duplicate near-identical pages.
