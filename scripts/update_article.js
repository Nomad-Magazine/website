import { readFileSync, writeFileSync } from 'node:fs';

const path = '/Users/pityakova/Documents/NGM/Website/src/content/article/smart-nomad-tier-2-cities-cost-of-living-2026.md';
let content = readFileSync(path, 'utf8');

content = content.replace(
  '## 2. The Tier 2 Pivot: The New Geo-Arbitrage\n\nIf Tier 1 cities are the problem',
  '## 2. The Tier 2 Pivot: The New Geo-Arbitrage\n\n![Smart Nomad Tier 2 Cities and Geo-Arbitrage](/images/smart-nomad-cities.webp)\n\nIf Tier 1 cities are the problem'
);

content = content.replace(
  '## 4. The Hidden Tax & Visa Trap\n\nThis is the section most nomads ignore',
  '## 4. The Hidden Tax & Visa Trap\n\n![Smart Nomad Taxes and Visas Compliance](/images/smart-nomad-taxes.webp)\n\nThis is the section most nomads ignore'
);

writeFileSync(path, content);
console.log('Updated article successfully');
