/**
 * Nomad Directory award badge SVG renderer.
 * Self-contained: no fs / Node APIs. Safe for a Cloudflare Worker or Astro endpoint.
 *
 * Static frame, notches, shadow, stub, wordmark, period word, kicker, title and
 * handwritten line are the C2 mockup paths. Only the business name and date are
 * composed at request time, from pre-extracted Inter Tight outlines.
 */
import { medium, semibold, type GlyphMap, UPM } from "./glyphs";
import {
  DATE_GAP,
  DATE_SIZE,
  DATE_X,
  DATE_Y,
  HAND_X,
  INK,
  KICKER_END,
  MUTED,
  NAME_SIZE,
  NAME_X,
  NAME_Y,
  STATIC,
  TITLE,
  VIEW_H,
  VIEW_W,
  type Period,
} from "./static";

export type AwardPeriod = Period;

export type AwardBadgeInput = {
  period: AwardPeriod;
  businessName: string;
  dateLabel: string;
};

const NAME_MIN_RATIO = 0.85;
/** How far the name may extend into the script's x-range. The script sits lower, so a modest overlap is safe and matches the C2 mockup. */
const SCRIPT_OVERLAP = 80;
const NAME_RIGHT_PAD = 8;

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(parseFloat(n.toFixed(8)));
}

function glyph(map: GlyphMap, ch: string): { w: number; d?: string } {
  return map[ch] ?? map["?"] ?? { w: 0 };
}

function measure(map: GlyphMap, text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += glyph(map, ch).w;
  return (w * size) / UPM;
}

function drawText(
  map: GlyphMap,
  text: string,
  x: number,
  y: number,
  size: number,
  anchor: "start" | "end",
  fill: string,
): string {
  const width = measure(map, text, size);
  const originX = anchor === "end" ? x - width : x;
  const s = size / UPM;
  const parts: string[] = [];
  let pen = 0;
  for (const ch of text) {
    const g = glyph(map, ch);
    if (g.d) {
      const tr = pen !== 0 ? ` transform="translate(${fmt(pen)},0)"` : "";
      parts.push(`<path d="${g.d}"${tr}/>`);
    }
    pen += g.w;
  }
  if (!parts.length) return "";
  return `<g transform="translate(${fmt(originX)},${fmt(y)}) scale(${fmt(s)},${fmt(-s)})" fill="${fill}">${parts.join("")}</g>`;
}

function maxNameWidth(period: Period): number {
  const end = Math.min(DATE_X - NAME_RIGHT_PAD, HAND_X[period] + SCRIPT_OVERLAP);
  return end - NAME_X;
}

function fitName(
  text: string,
  period: Period,
): { text: string; size: number } {
  const maxW = maxNameWidth(period);
  const natural = measure(semibold, text, NAME_SIZE);
  if (natural <= maxW) return { text, size: NAME_SIZE };
  const minSize = NAME_SIZE * NAME_MIN_RATIO;
  const atMin = measure(semibold, text, minSize);
  if (atMin <= maxW) {
    return { text, size: NAME_SIZE * (maxW / natural) };
  }
  const ell = "…";
  const chars = [...text];
  while (chars.length > 0 && measure(semibold, chars.join("") + ell, minSize) > maxW) {
    chars.pop();
  }
  return { text: (chars.length ? chars.join("") : "") + ell, size: minSize };
}

function fitDate(label: string): { text: string; size: number } {
  const maxW = DATE_X - KICKER_END - DATE_GAP;
  const natural = measure(medium, label, DATE_SIZE);
  if (natural <= maxW) return { text: label, size: DATE_SIZE };
  return { text: label, size: DATE_SIZE * (maxW / natural) };
}

function shortId(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function renderAwardBadgeSvg(input: AwardBadgeInput): string {
  const { period, businessName, dateLabel } = input;
  if (!(period in STATIC)) {
    throw new Error(`Unknown award period: ${String(period)}`);
  }
  const title = TITLE[period];
  const id = `${period}-${shortId(`${businessName}\0${dateLabel}`)}`;
  const clipId = `award-shape-${id}`;
  const maskId = `award-shadow-${id}`;

  const name = fitName(businessName, period);
  const date = fitDate(dateLabel);
  const nameEl = drawText(semibold, name.text, NAME_X, NAME_Y, name.size, "start", INK);
  const dateEl = drawText(medium, date.text, DATE_X, DATE_Y, date.size, "end", MUTED);

  const body = STATIC[period]
    .replaceAll("__CLIP_ID__", clipId)
    .replaceAll("__MASK_ID__", maskId)
    .replace("__DATE__", dateEl)
    .replace("__NAME__", nameEl);

  const label = escapeAttr(
    `Nomad Directory ${title} — ${businessName} — ${dateLabel}`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW_W}" height="${VIEW_H}" viewBox="0 0 ${VIEW_W} ${VIEW_H}" role="img" aria-label="${label}">
  <title>${label}</title>
${body}
</svg>
`;
}

/** Exported for tests / layout debugging. */
export const _layout = {
  measure,
  fitName,
  fitDate,
  maxNameWidth,
  UPM,
  NAME_SIZE,
  DATE_SIZE,
  NAME_X,
  NAME_Y,
  DATE_X,
  DATE_Y,
};
