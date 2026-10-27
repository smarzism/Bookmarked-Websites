# Bookmarked websites

A searchable bookmark board (Farsi / English) that shows each site's og:image, with category filters and shareable search links (`?q=...&c=...`).

## Setup (one time)
1. Create a GitHub repo. Name it `YOUR-USERNAME.github.io` to get `https://YOUR-USERNAME.github.io` as the address, or any other name to get `https://YOUR-USERNAME.github.io/REPO-NAME/`.
2. Put these files in the repo root and push to `main`.
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open the **Actions** tab and wait for "Deploy to GitHub Pages" to finish.

## Add a site
Edit `sites.json`, add an object with a unique `id`, `name`, `url`, `category` and `note` (each with `fa` and `en`), then commit. The workflow fetches the og:image and redeploys. It also refreshes images every Monday.

## Notes
- If a site has no og:image, the card shows a colored letter instead.
- Images are downloaded at build time into `og/` (not committed), so the page never depends on other sites while loading.
- To test locally: `node scripts/fetch-og.mjs && npx serve .`
