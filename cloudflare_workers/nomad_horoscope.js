export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (url.pathname === '/horoscope') {
      const name = url.searchParams.get('name');
      const birthdate = url.searchParams.get('birthdate');

      if (!name || !birthdate) {
        return new Response(
          JSON.stringify({ error: 'Name and birthdate are required' }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      try {
        const currentDate = new Date();
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        const prompt = `Generate a personalized horoscope suggestion for ${name}, born on ${birthdate}, for the month of ${nextMonth.toLocaleString('default', { month: 'long' })}. Include insights about work, relationships, and other relevant aspects. Suggest a destination that is best for the digital nomad based on their sign and the period and the planet around, also make sure the time is the best to visit the place according to thing to do in this period, suggest activity and action to take related to horoscope knowledge give a suggestion of plate to taste, place to see activity to do, related to the place and the the horoscope, write a little story at the end to help the person project himself, answer with HTML with style css in each element not global format it nice, with first title the name of the destination with a title here are the colors of our website to stay matching #f4dc01 yellow for emphasis info, #121111 our black for button and others elements and our gray #d8d8d8`;
        const suggestion = await fetchGptSuggestion(prompt, env.OPENAI_API_KEY);

        return new Response(JSON.stringify(suggestion), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to generate horoscope' }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function fetchGptSuggestion(prompt, apiKey) {
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const suggestion = data.choices[0].message.content.trim();

  return { suggestion };
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Nomad Horoscope</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f4dc01 0%, #d8d8d8 100%);
    }
    .container {
      text-align: center;
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 90%;
    }
    h1 {
      color: #121111;
      margin-bottom: 8px;
      font-size: 2.5rem;
      font-weight: 700;
    }
    h2 {
      color: #666;
      margin-bottom: 32px;
      font-size: 1.1rem;
      font-weight: 400;
    }
    input {
      width: 100%;
      padding: 16px;
      margin: 12px 0;
      border: 2px solid #d8d8d8;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s ease;
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: #f4dc01;
    }
    button {
      width: 100%;
      padding: 16px;
      margin: 20px 0;
      background-color: #121111;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    button:hover {
      background-color: #333;
      transform: translateY(-2px);
    }
    button:disabled {
      background-color: #d8d8d8;
      cursor: not-allowed;
      transform: none;
    }
    .result {
      margin-top: 32px;
      text-align: left;
    }
    .loading {
      display: none;
      color: #666;
      font-style: italic;
    }
    .error {
      color: #e74c3c;
      background-color: #fdf2f2;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Digital Nomad Horoscope</h1>
    <h2>By Nomad Gossip Magazine</h2>
    <input type="text" id="name" placeholder="Enter your name" required>
    <input type="date" id="birthdate" required>
    <button onclick="getHoroscope()" id="submitBtn">Get My Next Trip</button>
    <div class="loading" id="loading">Consulting the stars... ✨</div>
    <div class="result" id="result"></div>
  </div>

  <script>
    async function getHoroscope() {
      const name = document.getElementById('name').value.trim();
      const birthdate = document.getElementById('birthdate').value;
      const submitBtn = document.getElementById('submitBtn');
      const loading = document.getElementById('loading');
      const resultDiv = document.getElementById('result');

      if (!name || !birthdate) {
        resultDiv.innerHTML = '<div class="error">Please enter both your name and birthdate.</div>';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Loading...';
      loading.style.display = 'block';
      resultDiv.innerHTML = '';

      try {
        const response = await fetch(\`/horoscope?name=\${encodeURIComponent(name)}&birthdate=\${encodeURIComponent(birthdate)}\`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get horoscope');
        }

        resultDiv.innerHTML = \`
          <h2 style="color: #121111; margin-bottom: 16px;">Your Next Digital Nomad Trip, \${name}:</h2>
          <div style="line-height: 1.6;">\${data.suggestion}</div>
        \`;
      } catch (error) {
        resultDiv.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Get My Next Trip';
        loading.style.display = 'none';
      }
    }

    // Allow Enter key to submit
    document.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        getHoroscope();
      }
    });
  </script>
</body>
</html>`;
 