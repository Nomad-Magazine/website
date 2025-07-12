import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const randomNumber = Math.floor(Math.random() * 1000);
  
  return new Response(JSON.stringify({
    message: `Hello you ${randomNumber}`
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}; 
