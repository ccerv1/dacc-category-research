# DACC Category Research — Market Map

A strategic positioning map of ~80 projects across two axes:

- **Horizontal:** Atoms (physical world) vs Bits (digital world)
- **Vertical:** Survive (resilience, defense) vs Thrive (growth, opportunity)

Projects are grouped into ~20 categories and rendered as a Voronoi tessellation with proportional cell sizing.

**Live:** https://category-research.vercel.app

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Adding a Project

Edit `data/registry.json` and add an entry to the appropriate quadrant and category:

```json
{
  "id": "my-project",
  "name": "My Project",
  "description": "What this project does",
  "logo_url": "https://example.com/logo.png",
  "twitter_handle": null,
  "website_url": null
}
```

Open a PR. The CI workflow will validate the schema and check for duplicate IDs. On merge, a GitHub Action fetches the logo and stores it in `public/images/`.

## Validation

```bash
npm run validate          # JSON Schema check
node scripts/check-duplicates.js  # Duplicate ID check
```

## Project Structure

```
data/
  registry.json           # Project data (single source of truth)
  registry.schema.json    # JSON Schema for validation
public/images/            # Logo PNGs ({project-id}.png)
src/
  components/MarketMap.tsx # D3 Voronoi visualization
scripts/
  check-duplicates.js     # Duplicate project ID checker
  fetch-logos.js          # Logo downloader (used by CI)
.github/workflows/
  validate-pr.yml         # PR validation (schema + duplicates)
  fetch-assets.yml        # Post-merge logo fetch
```
