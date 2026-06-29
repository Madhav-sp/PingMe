/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512];
const outputDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Standard Icon SVG (Blue gradient with sleek message bubble / P symbol)
const createStandardSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#grad)" />
  <path d="M160 140 H352 C387.3 140 416 168.7 416 204 V308 C416 343.3 387.3 372 352 372 H240 L160 420 V372 C124.7 372 96 343.3 96 308 V204 C96 168.7 124.7 140 160 140 Z" fill="#ffffff" />
  <circle cx="200" cy="256" r="20" fill="#2563eb" />
  <circle cx="256" cy="256" r="20" fill="#2563eb" />
  <circle cx="312" cy="256" r="20" fill="#2563eb" />
</svg>
`;

// Maskable Icon SVG (Full bleed background with padded safe area)
const createMaskableSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#2563eb" />
  <g transform="translate(64, 64) scale(0.75)">
    <path d="M160 140 H352 C387.3 140 416 168.7 416 204 V308 C416 343.3 387.3 372 352 372 H240 L160 420 V372 C124.7 372 96 343.3 96 308 V204 C96 168.7 124.7 140 160 140 Z" fill="#ffffff" />
    <circle cx="200" cy="256" r="20" fill="#2563eb" />
    <circle cx="256" cy="256" r="20" fill="#2563eb" />
    <circle cx="312" cy="256" r="20" fill="#2563eb" />
  </g>
</svg>
`;

// Monochrome Icon SVG
const createMonochromeSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <path d="M160 140 H352 C387.3 140 416 168.7 416 204 V308 C416 343.3 387.3 372 352 372 H240 L160 420 V372 C124.7 372 96 343.3 96 308 V204 C96 168.7 124.7 140 160 140 Z" fill="currentColor" />
  <circle cx="200" cy="256" r="20" fill="transparent" />
  <circle cx="256" cy="256" r="20" fill="transparent" />
  <circle cx="312" cy="256" r="20" fill="transparent" />
</svg>
`;

async function generate() {
  console.log('Generating standard PWA icons...');
  for (const size of sizes) {
    const svgBuffer = Buffer.from(createStandardSvg(size));
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Generate Maskable 512
  console.log('Generating maskable icon...');
  await sharp(Buffer.from(createMaskableSvg(512)))
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'maskable-icon-512x512.png'));

  // Generate Monochrome 512
  console.log('Generating monochrome icon...');
  await sharp(Buffer.from(createMonochromeSvg(512)))
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'monochrome-icon-512x512.png'));

  // Generate Apple Touch Icon (180x180)
  await sharp(Buffer.from(createStandardSvg(180)))
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));

  // Copy 32x32 to favicon.ico/png root if needed
  await sharp(Buffer.from(createStandardSvg(32)))
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon.ico'));

  console.log('All PWA icons generated successfully!');
}

generate().catch(console.error);
