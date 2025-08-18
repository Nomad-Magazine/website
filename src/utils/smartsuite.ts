export async function fetchReportRecords(reportID: string): Promise<{ records: any[] }> {
  try {
    let response;
    
    if (typeof window === 'undefined') {
      // Server-side: check if we're in development or production
      const isProduction = process.env.NODE_ENV === 'production' && !process.env.CF_PAGES;
      
      if (isProduction) {
        // Production: fetch from public URL
        response = await fetch(`https://nomad-magazine.com/cache/nomad_cache_table_${reportID}.json`)
      } else {
        // Development/build: try local file first, then relative URL
        try {
          // Try to import the JSON file directly during build
          const fs = await import('fs');
          const path = await import('path');
          const filePath = path.resolve(process.cwd(), `public/cache/nomad_cache_table_${reportID}.json`);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          return JSON.parse(fileContent);
        } catch {
          // Fallback to fetch
          response = await fetch(`http://localhost:3000/cache/nomad_cache_table_${reportID}.json`);
        }
      }
    } else {
      // Client-side: fetch from relative URL
      response = await fetch(`/cache/nomad_cache_table_${reportID}.json`)
    }
    
    if (response && response.ok) {
      return await response.json()
    }
    throw new Error(`Failed to fetch cache: ${response?.status || 'No response'}`)
  } catch (err) {
    console.error(`Error reading cache for report ${reportID}:`, err)
    return { records: [] }
  }
}
