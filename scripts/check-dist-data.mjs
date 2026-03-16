import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./src/utils/nomad_cache_table_68614a111208586bd05d3c3a.json', 'utf8'));
const records = data.records;

const distributionLocations = records
  .filter(record => record.s43a4b2808 && record.title)
  .map(record => ({
    id: record.s9744d6c51 ? `coming_${record.id}` : `dist_${record.id}`,
    name: record.title,
    description: (() => {
      const websiteDesc = record.scea90e502 || '';
      const fullDesc = record.description_markdown || '';
      if (websiteDesc && fullDesc) return `${websiteDesc}<br/><br/>${fullDesc}`;
      return websiteDesc || fullDesc || (record.s9744d6c51 ? 'Coming soon to this location.' : 'A great location for digital nomads.');
    })(),
    location: record.sed1a49986 || 'Location not specified',
    city: (record.sed1a49986 || '').split(',')[0]?.trim() || 'Unknown',
    country: (record.sed1a49986 || '').split(',').slice(-1)[0]?.trim() || 'Unknown',
    website_url: record.sb788c266b?.[0] || null,
    google_maps_url: record.s2d652f699 || null,
    images: (() => {
      const imageFields = [record.image, record.images, record.sf4ad525dd, record.s4ad525dd].filter(Boolean);
      if (imageFields.length === 0) return [];
      const allImages = imageFields.flat().filter(Boolean);
      return [...new Set(allImages)];
    })(),
    category: record.sb685ab800?.label || 'Other',
    discount_code: record.s9c0ff01ed || null,
    created_at: record.first_created?.on || new Date().toISOString(),
    isComingSoon: !!record.s9744d6c51
  }));

console.log('distributionLocations count:', distributionLocations.length);
try {
  const serialized = JSON.stringify(distributionLocations);
  console.log('Serialized size:', serialized.length);
  if (serialized.includes('</script>')) console.log('WARNING: Contains </script> which breaks inline script');
  if (serialized.includes('<!--')) console.log('WARNING: Contains HTML comments');
} catch(e) {
  console.log('Serialization error:', e.message);
}
