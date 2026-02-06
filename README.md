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

### Quick Add (for Claude Code or similar agents)

Fork the repo and run this prompt:

> Clone https://github.com/ccerv1/dacc-category-research, add **[project name]** to the **[category name]** category in `data/registry.json`, then open a PR. Follow the contributing instructions in the README.

### Step-by-Step

1. **Fork and clone** the repo
2. **Edit `data/registry.json`** — find the right category and add a project entry:

```json
{
  "id": "my-project",
  "name": "My Project",
  "description": "One sentence about what this project does",
  "logo_url": "https://images.weserv.nl/?url=unavatar.io/github/my-org&w=400&h=400&fit=cover&output=png",
  "twitter_handle": "myproject",
  "website_url": "https://myproject.org"
}
```

3. **Create a branch and PR** with the change

CI will validate the schema and check for duplicate IDs. On merge, a GitHub Action fetches the logo and stores it in `public/images/`.

### Project Entry Fields

| Field | Required | Format |
|-------|----------|--------|
| `id` | Yes | Lowercase kebab-case, e.g. `simplex-chat` |
| `name` | Yes | Display name, e.g. `SimpleX Chat` |
| `description` | No | One sentence describing the project |
| `logo_url` | No | URL to a square PNG (use unavatar pattern below) |
| `twitter_handle` | No | Twitter/X handle without `@` |
| `website_url` | No | Project website URL |

**Logo URL patterns** (400x400 PNG via unavatar.io):
- From GitHub org: `https://images.weserv.nl/?url=unavatar.io/github/{org}&w=400&h=400&fit=cover&output=png`
- From Twitter: `https://images.weserv.nl/?url=unavatar.io/x/{handle}&w=400&h=400&fit=cover&output=png`
- From website: `https://images.weserv.nl/?url=unavatar.io/website/{domain}&w=400&h=400&fit=cover&output=png`

### Categories

Projects belong to one category in one quadrant:

**atoms-survive** (physical world + resilience)
- Biodefense & Health Systems
- Open Source Hardware & Silicon
- Resilient Manufacturing

**atoms-thrive** (physical world + growth)
- Decentralized Energy
- Property Rights & Registries
- Civic Tech

**bits-survive** (digital world + resilience)
- Zero-Knowledge Systems
- Privacy-Preserving Computation
- Decentralized Identity & Attestation
- Communication & Messaging
- Formal Verification & Security

**bits-thrive** (digital world + growth)
- Democratic Funding Mechanisms
- Epistemic Infrastructure
- Governance Tooling
- Decentralized Monetary Infrastructure
- Oracle Networks
- Cross-Chain Infrastructure
- Data Availability & Storage
- Streaming & Treasury
- Ecosystem Connector

## Validation

```bash
npm run validate                  # JSON Schema check
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
