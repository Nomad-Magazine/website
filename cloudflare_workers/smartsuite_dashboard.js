export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': '*'
    };

    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors });

    try {
      const event_type =
        new URL(request.url).pathname.replace(/^\/+/, '') || 'sync-directory';

      const gh = await fetch(
        'https://api.github.com/repos/Nomad-Magazine/website/dispatches',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'smart-suite-proxy',          // 👈 required
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ event_type })
        }
      );

      if (!gh.ok) {
        const txt = await gh.text();
        console.error('GitHub', gh.status, txt);
        return new Response(`GitHub ${gh.status}`, { status: 500, headers: cors });
      }

      return new Response('OK', { status: 200, headers: cors });
    } catch (err) {
      console.error('Worker', err);
      return new Response('Internal error', { status: 500, headers: cors });
    }
  }
};
