# PRD: Market Map — Static Next.js App

## Introduction

Upgrade the category-research market map from a standalone HTML prototype into a production static Next.js application deployed on Vercel. The app renders a 2x2 Voronoi-based market map of ~80 projects across 4 quadrants (atoms/bits x survive/thrive) with ~20 categories. Project data lives in a single JSON registry file. A GitHub Actions pipeline validates PRs (schema, duplicates), and on merge fetches logo assets for new projects and commits them to the repo.

## Goals

- Single source of truth: all project/category data in one `data/registry.json` file
- Production-quality static site deployed on Vercel with the current visualization
- Automated asset pipeline: logos fetched and stored on merge via GitHub Action
- PR quality gate: schema validation, duplicate detection, and preview deploy on every PR
- Easy contribution: adding a project = editing one JSON file and opening a PR

## User Stories

### US-001: Define JSON registry schema
**Description:** As a developer, I want a well-defined JSON schema for the registry so that data is consistent and validatable.

**Acceptance Criteria:**
- [ ] `data/registry.json` contains all 80 projects from the current prototype
- [ ] Schema: top-level `quadrants` array, each with `id`, `axis` fields, containing `categories` array, each category with `name` and `projects` array
- [ ] Each project has required fields: `id` (string, kebab-case), `name` (string), `logo_url` (string, nullable)
- [ ] Each project has optional fields: `description`, `twitter_handle`, `website_url`
- [ ] A JSON Schema file exists at `data/registry.schema.json` for validation
- [ ] Running `npx ajv validate -s data/registry.schema.json -d data/registry.json` passes

### US-002: Scaffold Next.js static app
**Description:** As a developer, I want a Next.js project set up for static export so the site can be deployed on Vercel with zero server cost.

**Acceptance Criteria:**
- [ ] Next.js app initialized with TypeScript
- [ ] `next.config.js` configured with `output: 'export'` for static generation
- [ ] `npm run build` produces a static site in `out/`
- [ ] Single page at `/` that renders the market map
- [ ] `public/images/` contains all existing logo PNGs from the prototype
- [ ] Tailwind CSS installed for basic page layout (header, footer, etc.)
- [ ] D3.js v7 added as a dependency

### US-003: Port Voronoi market map to React component
**Description:** As a user, I want to see the same market map visualization in the Next.js app that exists in the HTML prototype.

**Acceptance Criteria:**
- [ ] `MarketMap` React component renders the full visualization using D3 + SVG
- [ ] Reads data from `data/registry.json` at build time via `getStaticProps` (or import)
- [ ] Implements: squarified treemap seeding, Voronoi tessellation, Lloyd's smoothing, inscribed rectangles, foreignObject content
- [ ] 4 distinct quadrant colors (mauve, sage, periwinkle, sky blue)
- [ ] Angular cell shapes (`curveLinearClosed`)
- [ ] Edge-based quadrant borders (gray, non-overlapping)
- [ ] Axis labels: ATOMS/BITS at top, SURVIVE/THRIVE on left
- [ ] White circle placeholder for missing logos
- [ ] Responsive: fills viewport, recalculates on window resize
- [ ] Visual output matches the prototype at `market_map_v3.html`
- [ ] Verify in browser using dev server (`npm run dev`)

### US-004: Create GitHub Action for PR validation
**Description:** As a maintainer, I want PRs that modify the registry to be automatically validated so that broken data never reaches main.

**Acceptance Criteria:**
- [ ] Workflow file at `.github/workflows/validate-pr.yml`
- [ ] Triggers on PR open/sync when `data/registry.json` is changed
- [ ] Validates `registry.json` against the JSON Schema — fails PR check if invalid
- [ ] Detects duplicate project IDs across the entire registry — fails if found
- [ ] Detects duplicate project IDs within a single category — fails if found
- [ ] Posts a summary comment on the PR listing: new projects added, validation results
- [ ] Check appears as a required status check on the PR

### US-005: Create GitHub Action for post-merge asset fetch
**Description:** As a maintainer, I want logos for new projects to be automatically fetched after a PR merges so that contributors don't need to manually download images.

**Acceptance Criteria:**
- [ ] Workflow file at `.github/workflows/fetch-assets.yml`
- [ ] Triggers on push to `main` when `data/registry.json` is changed
- [ ] Diffs `registry.json` against the previous commit to find newly added projects
- [ ] For each new project with a non-null `logo_url`, downloads the image
- [ ] Saves images as `public/images/{project-id}.png`
- [ ] Skips projects that already have an image in `public/images/`
- [ ] Commits and pushes new images back to `main` with message `chore: fetch logos for new projects`
- [ ] If no new images were fetched, does not create an empty commit
- [ ] Handles download failures gracefully (logs warning, continues with other projects)

### US-006: Vercel deployment configuration
**Description:** As a developer, I want the app to auto-deploy on Vercel from the main branch.

**Acceptance Criteria:**
- [ ] `vercel.json` or Vercel project settings configured for static export
- [ ] Pushes to `main` trigger automatic deployment
- [ ] PR branches get preview deployments
- [ ] Custom domain can be configured later (not required for MVP)

### US-007: Convert existing data from CSV to JSON
**Description:** As a developer, I want to migrate the existing `registry.csv` data into the new `registry.json` format so the app has complete data from day one.

**Acceptance Criteria:**
- [ ] Migration script (one-time use) reads `registry.csv` and outputs `registry.json`
- [ ] All 80 projects are present in the output
- [ ] `logo_url` field populated from `project_icon_url` column in CSV
- [ ] `description` field populated from `description` column
- [ ] `twitter_handle` field populated from `project_twitter_handle` column
- [ ] Quadrant assignment derived from `horizontal_axis` (survive/thrive) + `vertical_axis` (atoms/bits)
- [ ] Categories grouped correctly within each quadrant
- [ ] Output validates against `data/registry.schema.json`

## Functional Requirements

- FR-1: The app must read all project data from `data/registry.json` — no hardcoded data in components
- FR-2: The `registry.json` file must conform to a published JSON Schema at `data/registry.schema.json`
- FR-3: The market map must render as a full-viewport SVG using D3.js with the treemap-seeded Voronoi algorithm
- FR-4: Each Voronoi cell must display the category name and project logos with names
- FR-5: Logo images must be served from `public/images/{project-id}.png`; missing logos display a white circle
- FR-6: The PR validation workflow must block merges when `registry.json` is invalid or contains duplicates
- FR-7: The asset fetch workflow must download logos for new projects and commit them to the repo
- FR-8: The site must be statically exported (`output: 'export'`) with no server-side dependencies
- FR-9: The visualization must be responsive to window size (compute layout on mount)

## Non-Goals

- No interactive features (hover, click, filter, search) — static visual only
- No user authentication or admin panel
- No database — JSON file is the data store
- No API routes or server-side rendering
- No automated PR creation (contributors create PRs manually)
- No image optimization pipeline (PNGs served as-is)
- No dark mode

## Technical Considerations

### Project Structure
```
category-research/
├── .github/
│   └── workflows/
│       ├── validate-pr.yml
│       └── fetch-assets.yml
├── data/
│   ├── registry.json          # Single source of truth
│   └── registry.schema.json   # JSON Schema for validation
├── public/
│   └── images/                # Logo PNGs ({project-id}.png)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── components/
│       └── MarketMap.tsx       # D3 Voronoi visualization
├── next.config.js
├── package.json
├── tsconfig.json
└── vercel.json
```

### JSON Registry Format
```json
{
  "quadrants": [
    {
      "id": "atoms-survive",
      "horizontal_axis": "atoms",
      "vertical_axis": "survive",
      "categories": [
        {
          "name": "Biodefense & Health Systems",
          "projects": [
            {
              "id": "mediledger",
              "name": "MediLedger",
              "description": "Pharmaceutical supply chain verification",
              "logo_url": "https://images.weserv.nl/?url=unavatar.io/website/mediledger.com&output=png",
              "twitter_handle": null,
              "website_url": null
            }
          ]
        }
      ]
    }
  ]
}
```

### D3 in React
- Use `useRef` for the SVG container and `useEffect` for D3 rendering
- D3 manages the SVG DOM directly (not React-managed SVG elements)
- Recalculate on `window.resize` with debounce
- Import D3 modules individually to reduce bundle size: `d3-delaunay`, `d3-polygon`, `d3-shape`, `d3-selection`, `d3-scale`

### GitHub Actions
- **PR validation:** Uses `ajv-cli` for JSON Schema validation, `jq` for duplicate detection
- **Asset fetch:** Node.js script that diffs JSON, downloads images with `fetch`, commits via `git`
- Both workflows use `actions/checkout@v4` and standard Node setup

### Existing Assets
- 60 logo PNGs already exist in `images/` — these move to `public/images/`
- The `download_logos.py` script logic is replicated in the GitHub Action (Node.js version)
- Logo URLs use the `unavatar.io` service pattern for fetching from Twitter/website

## Success Metrics

- All 80 projects render correctly in the deployed visualization
- `npm run build` completes with zero errors and produces a working static export
- PR validation workflow catches invalid JSON within 30 seconds of PR creation
- Asset fetch workflow downloads and commits new logos within 2 minutes of merge
- Page loads in under 3 seconds on a standard connection (static site, no API calls)

## Open Questions

- Should we add a simple header/footer around the map (e.g., title, "last updated" timestamp)?
- Should the Vercel preview deployment be linked from the PR validation comment?
- Should we add an `npm run validate` script for local pre-commit validation?
- What GitHub org/account will host the repo? (Currently a local gist directory)
