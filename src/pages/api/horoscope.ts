import type { APIRoute } from 'astro'
import { getSecret } from 'astro:env/server'

export const prerender = false

export const GET: APIRoute = async ({ request }) => {
  console.log('Horoscope API called')
  
  const url = new URL(request.url)
  const name = url.searchParams.get('name')
  const birthdate = url.searchParams.get('birthdate')

  console.log('Parameters received:', { name, birthdate })

  if (!name || !birthdate) {
    console.log('Missing required parameters')
    return new Response(
      JSON.stringify({ error: 'Name and birthdate are required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    console.log('Generating horoscope for:', name, birthdate)
    
    const currentDate = new Date()
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    
    console.log('Target month:', nextMonth.toLocaleString('default', { month: 'long' }))
    
    const prompt = `Generate a personalized horoscope reading for ${name}, born on ${birthdate}, for the month of ${nextMonth.toLocaleString('default', { month: 'long' })}. 

Create 5 distinct cards with the following structure:

CARD 1 - DESTINATION: 
- Title: "Your Cosmic Destination"
- Suggest a specific destination perfect for this person based on their astrological sign and current planetary alignments
- Explain in horoscope language HOW this destination connects to their birth chart, planetary influences, and zodiac traits
- Include specific activities, foods to try, and places to visit that align with their astrological profile
- Mention the best timing for travel based on celestial events

CARD 2 - RELATIONSHIPS:
- Title: "Love & Connections"
- Provide specific relationship guidance based on their zodiac sign and birth date
- Include advice for romantic relationships, friendships, and networking
- Mention favorable periods for meeting new people or strengthening existing bonds
- Use astrological terminology and planetary influences

CARD 3 - WORK & CAREER:
- Title: "Professional Path"
- Give precise career guidance based on their astrological profile
- Include best times for job changes, negotiations, or new projects
- Mention which planetary transits favor their professional growth
- Suggest specific actions to take this month

CARD 4 - MONTHLY CHALLENGES:
- Title: "Cosmic Challenges"
- Identify the main challenges they'll face this month based on planetary movements
- Provide specific advice on how to navigate these challenges
- Include dates or periods when to be extra cautious
- Use astrological explanations for why these challenges arise

CARD 5 - TRAVEL CHALLENGES:
- Title: "Journey Obstacles"
- Warn about potential travel-related challenges based on their horoscope
- Include specific advice for safe and successful travel
- Mention planetary aspects that might affect their journeys
- Provide protective measures or favorable travel dates

IMPORTANT: Return ONLY the HTML content. Use inline CSS styles. Use these colors: #f4dc01 for yellow emphasis, #121111 for black text, #d8d8d8 for gray elements. Structure each card with proper spacing and visual hierarchy. No explanations, just the HTML.`
    
    console.log('Calling OpenAI API...')
    const suggestion = await fetchGptSuggestion(prompt)
    console.log('OpenAI response received, length:', suggestion.length)

    return new Response(JSON.stringify({ suggestion }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error generating horoscope:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate horoscope' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

async function fetchGptSuggestion(prompt: string): Promise<string> {
  console.log('Fetching OpenAI API key...')
  const apiKey = getSecret('OPENAI_API_KEY')
  
  if (!apiKey) {
    console.error('OpenAI API key not found')
    throw new Error('OpenAI API key not configured')
  }
  
  console.log('API key found, making request to OpenAI...')
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  })

  console.log('OpenAI response status:', response.status)

  if (!response.ok) {
    console.error('OpenAI API error:', response.status, response.statusText)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json() as any
  console.log('OpenAI response parsed successfully')
  
  return data.choices[0].message.content.trim()
} 
