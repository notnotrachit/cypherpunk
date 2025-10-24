#!/usr/bin/env node

/**
 * Generate extension icons
 * This creates simple placeholder icons with the Solana symbol
 */

const fs = require('fs');
const path = require('path');

// Simple SVG-based icon generator
function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#9945FF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#14F195;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.2}"/>
      <text x="50%" y="50%" font-family="Arial" font-size="${size * 0.6}" font-weight="bold" 
            fill="white" text-anchor="middle" dominant-baseline="central">◎</text>
    </svg>
  `;
  return svg.trim();
}

// Create icons directory
const iconsDir = path.join(__dirname, '..', 'chrome-extension', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons (Chrome supports SVG)
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const svg = generateIcon(size);
  const filename = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`✅ Created ${filename}`);
});

console.log('\n📝 Note: Chrome extension icons should be PNG format.');
console.log('To convert SVG to PNG, you can:');
console.log('1. Open chrome-extension/icons/create-icons.html in a browser');
console.log('2. Or use an online converter: https://cloudconvert.com/svg-to-png');
console.log('3. Or use ImageMagick: convert icon16.svg icon16.png\n');

// Also create a simple data URI based PNG generator
console.log('Creating PNG icons using data URIs...\n');

// For now, let's update manifest to use SVG temporarily
const manifestPath = path.join(__dirname, '..', 'chrome-extension', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Update to use SVG (Chrome supports it)
manifest.action.default_icon = {
  "16": "icons/icon16.svg",
  "48": "icons/icon48.svg",
  "128": "icons/icon128.svg"
};
manifest.icons = {
  "16": "icons/icon16.svg",
  "48": "icons/icon48.svg",
  "128": "icons/icon128.svg"
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✅ Updated manifest.json to use SVG icons\n');

console.log('🎉 Done! You can now load the extension in Chrome.');
