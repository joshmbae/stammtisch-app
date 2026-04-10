/**
 * Run once after placing mia_logo_dark.svg and mia_logo.svg in assets/:
 *   node scripts/extractLogos.js
 *
 * Extracts the embedded JPEG from each SVG and saves it as a .jpg file.
 */

const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "..", "assets");

const files = [
  { svg: "mia_logo_dark.svg", jpg: "mia_logo_dark.jpg" },
  { svg: "mia_logo.svg",      jpg: "mia_logo_light.jpg" },
];

for (const { svg, jpg } of files) {
  const svgPath = path.join(ASSETS, svg);
  const jpgPath = path.join(ASSETS, jpg);

  if (!fs.existsSync(svgPath)) {
    console.log(`⚠️  ${svg} not found — skipping`);
    continue;
  }

  const content = fs.readFileSync(svgPath, "utf8");
  const match = content.match(/(?:xlink:href|href)="data:image\/jpeg;base64,([^"]+)"/);

  if (!match) {
    console.log(`⚠️  No JPEG data found in ${svg}`);
    continue;
  }

  const buf = Buffer.from(match[1], "base64");
  fs.writeFileSync(jpgPath, buf);
  console.log(`✅  Saved ${jpg} (${(buf.length / 1024).toFixed(1)} KB)`);
}
