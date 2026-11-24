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

Return a JSON object with exactly 6 cards, each containing:
- title: string
- content: string (detailed horoscope content)

The 6 cards should be:

1. DESTINATION: 
- Title: "Your Cosmic Destination"
- Suggest a specific destination perfect for this person based on their astrological sign and current planetary alignments
- Explain in horoscope language HOW this destination connects to their birth chart, planetary influences, and zodiac traits
- Include specific activities, foods to try, and places to visit that align with their astrological profile
- Mention the best timing for travel based on celestial events

2. RELATIONSHIPS:
- Title: "Love & Connections"
- Provide specific relationship guidance based on their zodiac sign and birth date
- Include advice for romantic relationships, friendships, and networking
- Mention favorable periods for meeting new people or strengthening existing bonds
- Use astrological terminology and planetary influences

3. WORK & CAREER:
- Title: "Professional Path"
- Give precise career guidance based on their astrological profile
- Include best times for job changes, negotiations, or new projects
- Mention which planetary transits favor their professional growth
- Suggest specific actions to take this month

4. MONTHLY CHALLENGES:
- Title: "Cosmic Challenges"
- Identify the main challenges they'll face this month based on planetary movements
- Provide specific advice on how to navigate these challenges
- Include dates or periods when to be extra cautious
- Use astrological explanations for why these challenges arise

5. TRAVEL CHALLENGES:
- Title: "Journey Obstacles"
- Warn about potential travel-related challenges based on their horoscope
- Include specific advice for safe and successful travel
- Mention planetary aspects that might affect their journeys
- Provide protective measures or favorable travel dates

6. RECOMMENDED READINGS:
- Title: "Cosmic Knowledge"
- Recommend 2-3 books that align with their astrological profile and current planetary influences
- ALWAYS include one of these 3 Nomad Magazine editions with proper reasoning:
  
  EDITION 001: "Digital nomadism" - Focuses on breaking free from conventional life, finding location independence, and the psychology of nomadism. Perfect for those seeking liberation and new beginnings.
  Link: https://nomadmagazine.com/editions/first-edition
  
  EDITION 002: "Digital nomad communities" - Takes you deeper into the heart of the digital nomad lifestyle, with a special focus on the communities that shape it and Japan as a destination. Features 7 dynamic nomad communities, Japan travel insights, relationship advice, book recommendations, and accommodation platforms.
  Link: https://nomadmagazine.com/editions/second-edition
  
  EDITION 003: "Wellness, Therapy & Digital Health" - Explores wellness, therapy, building meaningful connections, and the endless pursuit of finding the perfect balance between work and life. Features Asian destinations, cultural adaptation tips, work-life balance strategies, digital nomad workspaces, and affordable travel planning.
  Link: https://nomadmagazine.com/editions/third-edition

- Choose the most relevant magazine Edition based on their astrological reading and current life themes
- Explain WHY each recommendation aligns with their horoscope and planetary influences
- Include how these readings will support their cosmic journey this month

Return format:
{
  "cards": [
    {
      "title": "Card Title",
      "content": "Detailed horoscope content..."
      "editionLink": "https://nomadmagazine.com/editions/first-edition"
    }
  ]
}`
    
    console.log('Calling OpenAI API...')
    const suggestion = await fetchGptSuggestion(prompt)
    console.log('OpenAI response received, length:', suggestion.length)

    // With structured outputs, the response is already properly formatted JSON
    let parsedData
    try {
      parsedData = JSON.parse(suggestion)
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      throw new Error('Invalid JSON response from AI')
    }

    return new Response(JSON.stringify({ data: parsedData }), {
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
      messages: [
        { 
          role: 'system', 
          content: 'You are a horoscope generator that creates personalized readings for digital nomads. Provide detailed, astrological insights based on the user\'s birth information.' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'horoscope_reading',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              cards: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: {
                      type: 'string',
                      description: 'The title of the horoscope card'
                    },
                    content: {
                      type: 'string',
                      description: 'Detailed horoscope content for this aspect'
                    },
                    editionLink: {
                      type: 'string',
                      description: 'The link to the Nomad Magazine edition that is most relevant to the horoscope'
                    }
                  },
                  required: ['title', 'content', 'editionLink'],
                  additionalProperties: false
                }
              }
            },
            required: ['cards'],
            additionalProperties: false
          }
        }
      },
      max_tokens: 4000,
      temperature: 0.7,
    }),
  })

  console.log('OpenAI response status:', response.status)

  if (!response.ok) {
    console.error('OpenAI API error:', response.status, await response.json())
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json() as any
  console.log('OpenAI response parsed successfully')
  
  return data.choices[0].message.content.trim()
} 
