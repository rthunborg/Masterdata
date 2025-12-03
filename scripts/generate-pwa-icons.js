/**
 * Generate PWA icons from Stena logo
 * 
 * This script creates icon-192x192.png and icon-512x512.png
 * from public/images/stena-logo.png
 * 
 * Requirements: sharp package (pnpm add -D sharp)
 * 
 * Usage: node scripts/generate-pwa-icons.js
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Build script using CommonJS
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Build script using CommonJS
const path = require('path');

// Check if sharp is available
let sharp;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Build script using CommonJS
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp package is required. Install it with: pnpm add -D sharp');
  process.exit(1);
}

const LOGO_PATH = path.join(__dirname, '../public/images/stena-logo.png');
const ICONS_DIR = path.join(__dirname, '../public/icons');
const ICON_192_PATH = path.join(ICONS_DIR, 'icon-192x192.png');
const ICON_512_PATH = path.join(ICONS_DIR, 'icon-512x512.png');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Check if logo exists
if (!fs.existsSync(LOGO_PATH)) {
  console.error(`Error: Logo not found at ${LOGO_PATH}`);
  process.exit(1);
}

async function generateIcon(size, outputPath, paddingPercent = 0.1) {
  const padding = Math.floor(size * paddingPercent);
  const logoSize = size - (padding * 2);
  // White background (iOS requirement: no transparency)

  try {
    await sharp(LOGO_PATH)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated ${path.basename(outputPath)} (${size}x${size})`);
  } catch (error) {
    console.error(`Error generating ${path.basename(outputPath)}:`, error);
    throw error;
  }
}

async function main() {
  console.log('Generating PWA icons from Stena logo...\n');

  try {
    await generateIcon(192, ICON_192_PATH);
    await generateIcon(512, ICON_512_PATH);

    console.log('\n✅ All icons generated successfully!');
    console.log(`Icons saved to: ${ICONS_DIR}`);
  } catch (error) {
    console.error('\n❌ Failed to generate icons:', error);
    process.exit(1);
  }
}

main();

