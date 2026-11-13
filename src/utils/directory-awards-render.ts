/**
 * Standalone badge rendering utilities
 * No dependencies on DB helpers or Cloudflare worker bindings
 * Can be used in both Astro endpoints and Node/Bun scripts
 */

import * as fontkit from 'fontkit';
import path from 'path';
import fs from 'fs';

let fontRegular: any | null = null;
let fontSemiBold: any | null = null;

// Load static templates on first use
let STATIC_TEMPLATES: Record<'weekly' | 'monthly' | 'yearly', string> | null = null;

function loadTemplates() {
  if (!STATIC_TEMPLATES) {
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    STATIC_TEMPLATES = {
      weekly: fs.readFileSync(path.join(uploadsDir, 'c2-weekly_c992.svg'), 'utf-8'),
      monthly: fs.readFileSync(path.join(uploadsDir, 'c2-monthly_eb51.svg'), 'utf-8'),
      yearly: fs.readFileSync(path.join(uploadsDir, 'c2-yearly_1ad5.svg'), 'utf-8')
    };
  }
  return STATIC_TEMPLATES;
}

function loadFonts() {
  if (!fontRegular || !fontSemiBold) {
    const fontDir = path.resolve(process.cwd(), 'public/fonts/inter-display/ttf');
    const regularPath = path.join(fontDir, 'InterDisplay-Regular.ttf');
    const semiBoldPath = path.join(fontDir, 'InterDisplay-SemiBold.ttf');
    
    if (!fs.existsSync(regularPath)) {
      throw new Error(`Regular font not found: ${regularPath}`);
    }
    if (!fs.existsSync(semiBoldPath)) {
      throw new Error(`SemiBold font not found: ${semiBoldPath}`);
    }
    
    // Load fonts using fontkit
    fontRegular = fontkit.openSync(regularPath);
    fontSemiBold = fontkit.openSync(semiBoldPath);
  }
}

function textToPath(text: string, font: any, fontSize: number, x: number, y: number): string {
  // Get the glyph run
  const run = font.layout(text);
  const scale = fontSize / font.unitsPerEm;
  
  // Build SVG path data
  let pathData = '';
  let currentX = x;
  
  for (let i = 0; i < run.glyphs.length; i++) {
    const glyph = run.glyphs[i];
    const position = run.positions[i];
    
    const glyphX = currentX + (position.xOffset || 0) * scale;
    const glyphY = y - (position.yOffset || 0) * scale;
    
    // Get the glyph path and transform it
    const glyphPath = glyph.path;
    if (glyphPath) {
      pathData += glyphPath.scale(scale, -scale).translate(glyphX, glyphY).toSVG() + ' ';
    }
    
    currentX += (position.xAdvance || 0) * scale;
  }
  
  return pathData.trim();
}

function measureText(text: string, font: any, fontSize: number): number {
  const run = font.layout(text);
  const scale = fontSize / font.unitsPerEm;
  
  let width = 0;
  for (const position of run.positions) {
    width += (position.xAdvance || 0) * scale;
  }
  
  return width;
}

export interface BadgeData {
  businessName: string;
  period: 'weekly' | 'monthly' | 'yearly';
  dateLabel: string;
}

export function renderBadgeSvg(badge: BadgeData): string {
  loadFonts();
  const templates = loadTemplates();
  
  if (!fontRegular || !fontSemiBold) {
    throw new Error('Fonts not loaded');
  }
  
  const businessFontSize = 12;
  const dateFontSize = 10;
  const maxBusinessWidth = 175;
  
  // Measure and truncate business name if needed
  let businessName = badge.businessName;
  let businessWidth = measureText(businessName, fontSemiBold, businessFontSize);
  
  if (businessWidth > maxBusinessWidth) {
    while (businessWidth > maxBusinessWidth && businessName.length > 1) {
      businessName = businessName.slice(0, -1);
      businessWidth = measureText(businessName + '…', fontSemiBold, businessFontSize);
    }
    businessName = businessName + '…';
  }
  
  // Generate path for business name (x=104 to match template baseline)
  const businessPath = textToPath(businessName, fontSemiBold, businessFontSize, 104, 53);
  
  // Right-align date
  const dateWidth = measureText(badge.dateLabel, fontRegular, dateFontSize);
  const dateXPos = 300 - dateWidth; // Right-align at 300px as per instructions
  const datePath = textToPath(badge.dateLabel, fontRegular, dateFontSize, dateXPos, 31);
  
  // Load the static template
  let svg = templates[badge.period];
  
  // Remove the placeholder business name path (line ~32, starts with large M107... or M211...)
  // These are the "Weekly winner" and "Your Coliving" paths
  svg = svg.replace(/<path d="M107\.751220703125[\s\S]*?fill="#121111"\/>/, '');
  svg = svg.replace(/<path d="M211\.879882[\s\S]*?fill="#5A5854"\/>/, '');
  
  // Inject the dynamic text paths before the handwritten script section
  const dynamicPaths = `    <path d="${businessPath}" fill="#121111"/>
    <path d="${datePath}" fill="#5A5854"/>`;
  
  // Insert before the handwritten script (the <g transform="translate... line)
  svg = svg.replace(/(\s*)(<g transform="translate\([\d.]+,[\d.]+\) rotate\(-\d+\)">)/, `$1${dynamicPaths}\n$1$2`);
  
  return svg;
}
