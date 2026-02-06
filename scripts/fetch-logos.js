#!/usr/bin/env node
/**
 * Fetch logo images for projects in registry.json that have a logo_url
 * but no corresponding file in public/images/.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const jsonPath = path.join(__dirname, "..", "data", "registry.json");
const imagesDir = path.join(__dirname, "..", "public", "images");

const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    proto
      .get(url, { headers: { "User-Agent": "market-map-bot/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow redirect
          file.close();
          fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

async function main() {
  fs.mkdirSync(imagesDir, { recursive: true });

  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  for (const quadrant of data.quadrants) {
    for (const category of quadrant.categories) {
      for (const project of category.projects) {
        const dest = path.join(imagesDir, `${project.id}.png`);

        if (fs.existsSync(dest)) {
          skipped++;
          continue;
        }

        if (!project.logo_url) {
          continue;
        }

        try {
          await download(project.logo_url, dest);
          console.log(`Fetched: ${project.id}`);
          fetched++;
        } catch (err) {
          console.warn(`Warning: Failed to fetch logo for ${project.id}: ${err.message}`);
          failed++;
        }
      }
    }
  }

  console.log(`\nDone. Fetched: ${fetched}, Skipped (already exist): ${skipped}, Failed: ${failed}`);

  // Exit with special code 2 if nothing was fetched (used by workflow to skip commit)
  if (fetched === 0) {
    console.log("No new images to commit.");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
