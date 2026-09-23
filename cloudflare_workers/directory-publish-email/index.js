export default {
  async fetch(request, env, ctx) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // Health check endpoint
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'directory-publish-email',
          version: '1.0.0',
        }),
        {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    // Webhook endpoint for SmartSuite
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        // Authenticate webhook request
        const authHeader = request.headers.get('Authorization');
        const webhookSecret = request.headers.get('X-Webhook-Secret');

        const expectedSecret = env.SMARTSUITE_WEBHOOK_SECRET;
        if (!expectedSecret) {
          console.error('SMARTSUITE_WEBHOOK_SECRET not configured');
          return new Response(
            JSON.stringify({ error: 'Webhook secret not configured' }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        // Check either Authorization Bearer or X-Webhook-Secret
        const providedSecret = authHeader?.replace('Bearer ', '') || webhookSecret;
        if (providedSecret !== expectedSecret) {
          console.error('Invalid webhook secret');
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        // Parse webhook payload
        const payload = await request.json();
        console.log('Received webhook payload:', JSON.stringify(payload));

        // Extract record data - SmartSuite can send nested or flat structures
        const record = payload.record || payload.data || payload;

        // Extract required fields
        const recordId = record.id || payload.record_id;
        const companyName = record.title || record.company_name;
        const contactEmail = record.sd6842e687; // Email field
        const contactName =
          record.s16e7a9d78 || // First name field
          record.sfca9050a8 || // Alternative name field
          record.title || // Fallback to title
          '';
        const published = record.sf4ad525dd; // Published field

        // Validate required fields
        if (!recordId) {
          console.error('Missing record_id in payload');
          return new Response(
            JSON.stringify({ error: 'Missing record_id' }),
            { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        if (!published) {
          console.log('Record not published, skipping');
          return new Response(
            JSON.stringify({ success: true, message: 'Record not published, skipped' }),
            { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        if (!companyName || !contactEmail) {
          console.error('Missing required fields: companyName or contactEmail');
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        // Check idempotency using KV (if available)
        const idempotencyKey = `publish:${recordId}:${new Date().toISOString().split('T')[0]}`;
        if (env.PUBLISH_KV) {
          const existing = await env.PUBLISH_KV.get(idempotencyKey);
          if (existing) {
            console.log('Duplicate webhook for record, skipping:', recordId);
            return new Response(
              JSON.stringify({ success: true, message: 'Already processed' }),
              { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
          }
          // Mark as processed (expires after 7 days)
          await env.PUBLISH_KV.put(idempotencyKey, new Date().toISOString(), {
            expirationTtl: 7 * 24 * 60 * 60,
          });
        }

        // Optional: Trigger GitHub Actions sync for this single record
        if (env.GITHUB_TOKEN) {
          console.log('Triggering GitHub sync for record:', recordId);
          ctx.waitUntil(
            (async () => {
              try {
                const ghRes = await fetch(
                  'https://api.github.com/repos/Nomad-Magazine/website/dispatches',
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
                      Accept: 'application/vnd.github+json',
                      'X-GitHub-Api-Version': '2022-11-28',
                      'User-Agent': 'directory-publish-email-worker',
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      event_type: 'sync-directory',
                      client_payload: {
                        record_id: recordId,
                      },
                    }),
                  }
                );

                if (!ghRes.ok) {
                  const errorText = await ghRes.text();
                  console.error('GitHub sync failed:', ghRes.status, errorText);
                } else {
                  console.log('GitHub sync triggered successfully');
                }
              } catch (err) {
                console.error('GitHub sync error:', err);
              }
            })()
          );
        }

        // Schedule delayed webhook to Martin using Durable Object
        const publishedAt = new Date().toISOString();
        const delayMinutes = parseInt(env.DELAY_MINUTES || '30', 10);
        const sendAfter = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

        const webhookPayload = {
          event: 'directory_published',
          record_id: recordId,
          company_name: companyName,
          contact_email: Array.isArray(contactEmail) ? contactEmail[0] : contactEmail,
          contact_name: contactName,
          directory_url: 'https://nomad-magazine.com/nomad_directory/',
          published_at: publishedAt,
          send_after: sendAfter,
        };

        // Use Durable Object to schedule delayed webhook
        const doId = env.SCHEDULER.idFromName(`publish:${recordId}`);
        const doStub = env.SCHEDULER.get(doId);

        await doStub.fetch('https://fake/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: env.MARTIN_WEBHOOK_URL,
            webhookSecret: env.MARTIN_WEBHOOK_SECRET,
            payload: webhookPayload,
            delayMs: delayMinutes * 60 * 1000,
          }),
        });

        console.log('Scheduled webhook for:', recordId, 'at', sendAfter);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Webhook scheduled',
            record_id: recordId,
            send_after: sendAfter,
          }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Webhook processing error:', err);
        return new Response(
          JSON.stringify({ error: `Internal error: ${err.message}` }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response('Not Found', { status: 404, headers: cors });
  },
};

// Durable Object for scheduling delayed webhooks
export class PublishScheduler {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/schedule') {
      const { webhookUrl, webhookSecret, payload, delayMs } = await request.json();

      if (!webhookUrl || !payload) {
        return new Response(JSON.stringify({ error: 'Missing webhookUrl or payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Store webhook data in Durable Object state
      await this.state.storage.put('webhookUrl', webhookUrl);
      await this.state.storage.put('webhookSecret', webhookSecret);
      await this.state.storage.put('payload', payload);

      // Set alarm for delayed execution
      const alarmTime = Date.now() + delayMs;
      await this.state.storage.setAlarm(alarmTime);

      console.log('Alarm scheduled for:', new Date(alarmTime).toISOString());

      return new Response(
        JSON.stringify({ success: true, alarm_time: new Date(alarmTime).toISOString() }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not Found', { status: 404 });
  }

  async alarm() {
    console.log('Alarm triggered, sending webhook');

    try {
      // Retrieve stored data
      const webhookUrl = await this.state.storage.get('webhookUrl');
      const webhookSecret = await this.state.storage.get('webhookSecret');
      const payload = await this.state.storage.get('payload');

      if (!webhookUrl || !payload) {
        console.error('Missing webhook data in alarm');
        return;
      }

      // Send webhook to Martin
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'nomad-directory-publish-worker',
      };

      // Add auth header if secret is provided
      if (webhookSecret) {
        headers['Authorization'] = `Bearer ${webhookSecret}`;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('Webhook sent successfully to Martin');
      } else {
        const errorText = await response.text();
        console.error('Webhook failed:', response.status, errorText);
      }

      // Clean up storage after sending
      await this.state.storage.deleteAll();
    } catch (err) {
      console.error('Alarm execution error:', err);
    }
  }
}
