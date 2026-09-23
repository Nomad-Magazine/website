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

    // Screenshot GET/HEAD endpoint
    const screenshotMatch = url.pathname.match(/^\/screenshot\/([a-zA-Z0-9_-]+)$/);
    if ((request.method === 'GET' || request.method === 'HEAD') && screenshotMatch) {
      const id = screenshotMatch[1];
      const kvKey = `screenshot:${id}`;

      if (!env.PUBLISH_KV) {
        return new Response('KV not configured', { status: 500, headers: cors });
      }

      const metadata = await env.PUBLISH_KV.getWithMetadata(kvKey, 'arrayBuffer');
      if (!metadata.value) {
        return new Response('Screenshot not found', { status: 404, headers: cors });
      }

      const contentType = metadata?.metadata?.contentType || 'image/jpeg';
      const responseHeaders = {
        ...cors,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      };

      if (metadata.value && metadata.value.byteLength) {
        responseHeaders['Content-Length'] = metadata.value.byteLength.toString();
      }

      return new Response(request.method === 'HEAD' ? null : metadata.value, {
        status: 200,
        headers: responseHeaders,
      });
    }

    // Screenshot upload endpoint
    if (request.method === 'POST' && url.pathname === '/screenshot') {
      try {
        const authHeader = request.headers.get('Authorization');
        const webhookSecret = request.headers.get('X-Webhook-Secret');
        const expectedSecret = env.SMARTSUITE_WEBHOOK_SECRET;

        if (!expectedSecret) {
          return new Response(
            JSON.stringify({ error: 'Webhook secret not configured' }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        const providedSecret = authHeader?.replace('Bearer ', '') || webhookSecret;
        if (providedSecret !== expectedSecret) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        if (!env.PUBLISH_KV) {
          return new Response(
            JSON.stringify({ error: 'KV not configured' }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        const imageBytes = await request.arrayBuffer();
        if (imageBytes.byteLength === 0) {
          return new Response(
            JSON.stringify({ error: 'Empty image data' }),
            { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        const contentType = request.headers.get('Content-Type') || 'image/jpeg';
        const id = generateShortId();
        const kvKey = `screenshot:${id}`;

        await env.PUBLISH_KV.put(kvKey, imageBytes, {
          expirationTtl: 7 * 24 * 60 * 60,
          metadata: { contentType, uploadedAt: new Date().toISOString() },
        });

        const screenshotUrl = `https://${url.hostname}/screenshot/${id}`;

        return new Response(
          JSON.stringify({ url: screenshotUrl }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Screenshot upload error:', err);
        return new Response(
          JSON.stringify({ error: `Internal error: ${err.message}` }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }
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
        const sendEmail = record.s8d891d4b4; // Send Confirmation Email trigger field

        // Validate required fields
        if (!recordId) {
          console.error('Missing record_id in payload');
          return new Response(
            JSON.stringify({ error: 'Missing record_id' }),
            { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        if (!sendEmail) {
          console.log('Send email not triggered, skipping');
          return new Response(
            JSON.stringify({ success: true, message: 'Send email not triggered, skipped' }),
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
        const idempotencyKey = `email:${recordId}:${new Date().toISOString().split('T')[0]}`;
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

        // Prepare webhook payload for Martin
        const publishedAt = new Date().toISOString();
        const delayMinutes = parseInt(env.DELAY_MINUTES || '0', 10);
        const sendAfter = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

        // Parse email - SmartSuite can send as string or array
        let email = contactEmail;
        if (Array.isArray(contactEmail)) {
          email = contactEmail[0];
        } else if (contactEmail && typeof contactEmail === 'object') {
          // Handle nested objects
          email = contactEmail.email || contactEmail.value || String(contactEmail);
        }
        email = String(email || '').trim();

        const webhookPayload = {
          event: 'directory_published',
          record_id: recordId,
          company_name: companyName,
          contact_email: email,
          contact_name: contactName,
          directory_url: 'https://nomad-magazine.com/nomad_directory/',
          published_at: publishedAt,
          send_after: sendAfter,
        };

        // If delay is 0, send immediately instead of using Durable Object
        if (delayMinutes === 0) {
          console.log('Sending webhook immediately (DELAY_MINUTES=0):', recordId);
          ctx.waitUntil(
            (async () => {
              try {
                const headers = {
                  'Content-Type': 'application/json',
                  'User-Agent': 'nomad-directory-publish-worker',
                };

                if (env.MARTIN_WEBHOOK_SECRET) {
                  headers['Authorization'] = `Bearer ${env.MARTIN_WEBHOOK_SECRET}`;
                }

                const response = await fetch(env.MARTIN_WEBHOOK_URL, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(webhookPayload),
                });

                if (response.ok) {
                  console.log('Webhook sent successfully to Martin (immediate)');
                } else {
                  const errorText = await response.text();
                  console.error('Webhook failed (immediate):', response.status, errorText);
                }
              } catch (err) {
                console.error('Immediate webhook error:', err);
              }
            })()
          );
        } else {
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
        }

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

function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 8; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

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
