#!/usr/bin/env node
/**
 * Migrate registry.csv to data/registry.json
 * One-time migration script.
 */

const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "..", "registry.csv");
const jsonPath = path.join(__dirname, "..", "data", "registry.json");

const csv = fs.readFileSync(csvPath, "utf-8");
const lines = csv.trim().split("\n");
const headers = lines[0].split(",");

// Parse CSV (handles quoted fields with commas)
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// Map axis values to quadrant IDs
function quadrantId(horizontal, vertical) {
  return `${vertical}-${horizontal}`;
}

// Build quadrant structure
const quadrants = {};
const quadrantMeta = {
  "atoms-survive": { horizontal_axis: "atoms", vertical_axis: "survive" },
  "atoms-thrive": { horizontal_axis: "atoms", vertical_axis: "thrive" },
  "bits-survive": { horizontal_axis: "bits", vertical_axis: "survive" },
  "bits-thrive": { horizontal_axis: "bits", vertical_axis: "thrive" },
};

for (const [id, meta] of Object.entries(quadrantMeta)) {
  quadrants[id] = { id, ...meta, categories: {} };
}

let projectCount = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const fields = parseCSVLine(line);
  const row = {};
  for (let j = 0; j < headers.length; j++) {
    row[headers[j]] = fields[j] || "";
  }

  const horizontal = row.horizontal_axis; // survive or thrive
  const vertical = row.vertical_axis; // atoms or bits
  const category = row.domain || row.category;
  const projectId = row.project_id;
  const projectName = row.project_name;

  if (!projectId || !category) continue;

  const qId = quadrantId(horizontal, vertical);
  if (!quadrants[qId]) continue;

  if (!quadrants[qId].categories[category]) {
    quadrants[qId].categories[category] = [];
  }

  quadrants[qId].categories[category].push({
    id: projectId,
    name: projectName || projectId,
    description: row.description || null,
    logo_url: row.project_icon_url || null,
    twitter_handle: row.project_twitter_handle || null,
    website_url: null,
  });

  projectCount++;
}

// Convert to array format
const output = {
  quadrants: Object.values(quadrants).map((q) => ({
    id: q.id,
    horizontal_axis: q.horizontal_axis,
    vertical_axis: q.vertical_axis,
    categories: Object.entries(q.categories).map(([name, projects]) => ({
      name,
      projects,
    })),
  })),
};

fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));

console.log(`Migrated ${projectCount} projects to ${jsonPath}`);
console.log(
  `Quadrants: ${output.quadrants.map((q) => `${q.id} (${q.categories.length} categories)`).join(", ")}`
);
