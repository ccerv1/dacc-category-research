#!/usr/bin/env node
/**
 * Check for duplicate project IDs in registry.json.
 * Exits with code 1 if duplicates are found.
 */

const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "..", "data", "registry.json");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

const allIds = [];
const duplicates = new Set();

for (const quadrant of data.quadrants) {
  for (const category of quadrant.categories) {
    for (const project of category.projects) {
      if (allIds.includes(project.id)) {
        duplicates.add(project.id);
      }
      allIds.push(project.id);
    }
  }
}

if (duplicates.size > 0) {
  console.error(`Found ${duplicates.size} duplicate project ID(s):`);
  for (const id of duplicates) {
    console.error(`  - ${id}`);
  }
  process.exit(1);
} else {
  console.log(`All ${allIds.length} project IDs are unique.`);
}
