export default {
  async fetch(request, env, ctx) {
    console.log(`[REQUEST] ${request.method} ${request.url}`);
    console.log(`[REQUEST] User-Agent: ${request.headers.get("User-Agent") || "unknown"}`);

    // collect all passwords from env
    const validPasswords = Object.keys(env)
      .filter((k) => k === "DOWNLOAD_PASSWORD" || k.startsWith("DOWNLOAD_PASSWORD_"))
      .map((k) => env[k])
      .filter(Boolean); // remove empty ones

    console.log(`[CONFIG] Found ${validPasswords.length} valid password(s) configured`);

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, ""); // remove leading /

    console.log(`[PATH] Requested path: "${path}"`);

    // if no passwords were set in env, refuse
    if (validPasswords.length === 0) {
      console.error("[ERROR] No passwords configured in environment");
      return new Response(
        "No passwords configured. Add DOWNLOAD_PASSWORD or DOWNLOAD_PASSWORD_1 in Worker env.",
        { status: 500 }
      );
    }

    // 1) if no file requested, show simple index
    if (!path) {
      console.log("[RESPONSE] No path specified, showing index");
      return new Response(
        `<html><body><h3>R2 protected bucket</h3><p>Specify a file in the URL.</p></body></html>`,
        { headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }

    // 2) if POST, validate password and email
    if (request.method === "POST") {
      console.log("[POST] Processing form submission");
      const formData = await request.formData();
      const password = formData.get("password");
      const email = formData.get("email");

      console.log(`[POST] Email provided: ${email ? "yes" : "no"}`);
      console.log(`[POST] Password provided: ${password ? "yes" : "no"}`);

      const isValid = validPasswords.includes(password);
      console.log(`[AUTH] Password validation: ${isValid ? "VALID" : "INVALID"}`);

      if (isValid && email) {
        console.log(`[AUTH] Valid credentials for email: ${email}`);

        // Submit to Bento API (fire-and-forget, never block the download)
        if (env.BENTO_SITE_UUID && env.BENTO_PUBLISHABLE_KEY && env.BENTO_SECRET_KEY) {
          console.log("[BENTO] Submitting subscriber via API (fire-and-forget)");

          // Use waitUntil to run this in background without blocking the response
          ctx.waitUntil(
            (async () => {
              try {
                // Create base64 auth header: publishableKey:secretKey
                const authString = `${env.BENTO_PUBLISHABLE_KEY}:${env.BENTO_SECRET_KEY}`;
                const base64 = btoa(authString);
                console.log("[BENTO] Making API request...");

                const bentoResponse = await fetch(`https://app.bentonow.com/api/v1/batch/events`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${base64}`,
                    "User-Agent": "Nomad-Magazine-Worker/1.0"
                  },
                  body: JSON.stringify({
                    site_uuid: env.BENTO_SITE_UUID,
                    events: [{
                      email: email,
                      type: "$direct_download",
                      details: {
                        file_path: path
                      }
                    }]
                  })
                });

                console.log(`[BENTO] API response status: ${bentoResponse.status}`);

                if (!bentoResponse.ok) {
                  const errorText = await bentoResponse.text();
                  console.error(`[BENTO] API error (status ${bentoResponse.status}): ${errorText}`);
                } else {
                  const responseData = await bentoResponse.json();
                  console.log("[BENTO] Successfully submitted subscriber via API:", JSON.stringify(responseData));
                }
              } catch (e) {
                console.error("[BENTO] API request failed:", e.message, e.stack);
              }
            })()
          );
        } else {
          console.warn("[BENTO] Missing required env vars (BENTO_SITE_UUID, BENTO_PUBLISHABLE_KEY, BENTO_SECRET_KEY) - skipping Bento tracking");
        }

        console.log("[AUTH] Showing download page");
        // Directly show download page
        return downloadPage(path);
      } else if (isValid && !email) {
        console.log("[ERROR] Valid password but missing email");
        return passwordForm(url.pathname, "Email address is required.");
      } else {
        console.log("[ERROR] Invalid password attempt");
        return passwordForm(url.pathname, "Wrong password. Try again.");
      }
    }

    // 3) if GET without password, show form
    console.log("[RESPONSE] Showing password form");

    // Check if user wants direct download or landing page
    const wantsDownload = url.searchParams.get('download') === '1';

    if (wantsDownload) {
      // Direct download requested
      console.log(`[R2] Fetching file from R2: ${path}`);
      const object = await env.MAG.get(path);
      if (!object) {
        console.error(`[R2] File not found: ${path}`);
        return new Response("File not found", { status: 404 });
      }

      console.log(`[R2] File found, size: ${object.size} bytes`);
      console.log(`[R2] Content-Type: ${object.httpMetadata?.contentType || "unknown"}`);

      // fill headers from R2 if present
      const headers = new Headers(object.httpMetadata || {});
      // force download
      const filename = path.split("/").pop() || "file";
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/octet-stream");
      }

      console.log(`[RESPONSE] Serving file: ${filename}`);
      return new Response(object.body, {
        status: 200,
        headers,
      });
    }

    // Show password form
    return passwordForm(url.pathname);
  },
};

// helper to render password form
function passwordForm(pathname, msg = "") {
  console.log(`[FORM] Rendering password form for path: ${pathname}${msg ? ` (error: ${msg})` : ""}`);
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Password required</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f5f5f5; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:1rem; }
    .box { background:white; padding:2rem 1.75rem; border-radius:0.75rem; box-shadow:0 10px 30px rgba(0,0,0,.06); width: min(400px, 100% - 2rem); }
    .logo { max-width:150px; height:auto; margin:0 auto 1.5rem; display:block; }
    h1 { font-size:1.3rem; margin-bottom:.5rem; text-align:center; color:#333; }
    p.msg { color:#b00020; margin-bottom:.75rem; text-align:center; }
    label { display:block; font-size:.85rem; margin-bottom:.35rem; margin-top:.75rem; font-weight:500; }
    input[type=password], input[type=email] { width:100%; padding:.6rem .75rem; border:1px solid #ddd; border-radius: .5rem; font-size:.95rem; box-sizing: border-box; }
    input:focus { outline: none; border-color: #FFC72C; box-shadow: 0 0 0 3px rgba(255,199,44,0.1); }
    button { margin-top:1rem; width:100%; background:#FFC72C; color:#222; border:none; padding:.65rem; border-radius:.5rem; font-weight:600; cursor:pointer; font-size:.95rem; transition:all 0.2s; }
    button:hover { background:#ffd740; transform:translateY(-1px); box-shadow:0 2px 8px rgba(255,199,44,0.3); }
    small { display:block; margin-top:1rem; color:#888; font-size:.75rem; text-align:center; line-height:1.4; }
  </style>
</head>
<body>
  <form class="box" method="POST" action="${pathname}">
    <img src="https://nomad-magazine.com/logo.svg" alt="Nomad Magazine" class="logo" onerror="this.style.display='none'">
    <h1>Protected Download</h1>
    ${msg ? `<p class="msg">${msg}</p>` : ""}
    <label for="email">Email Address</label>
    <input name="email" id="email" type="email" placeholder="your@email.com" required autofocus />
    <label for="password">Password</label>
    <input name="password" id="password" type="password" placeholder="From your email" required />
    <button type="submit">Download Magazine</button>
    <small>This link is protected. Enter your email and the password we sent you.</small>
  </form>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

// helper to render download page
function downloadPage(pathname) {
  const filename = pathname.split("/").pop() || "file";
  const downloadUrl = `/${pathname}?download=1`;

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Download Started</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f5f5f5; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:1rem; }
    .box { background:white; padding:2.5rem 2rem; border-radius:0.75rem; box-shadow:0 10px 30px rgba(0,0,0,.06); width: min(480px, 100% - 2rem); text-align:center; }
    .logo { max-width:180px; height:auto; margin:0 auto 1.5rem; display:block; }
    h1 { font-size:1.75rem; margin:0 0 0.5rem 0; color:#333; font-weight:700; }
    .tagline { font-size:1.1rem; color:#666; margin:0 0 1.5rem 0; font-weight:400; }
    .icon { font-size:3rem; margin-bottom:1rem; }
    p { color:#666; margin:0.5rem 0; line-height:1.6; }
    .filename { font-weight:600; color:#333; word-break:break-all; background:#f8f9fa; padding:0.5rem 1rem; border-radius:0.5rem; display:inline-block; margin:1rem 0; }
    a { display:inline-block; margin-top:1.5rem; padding:.75rem 1.5rem; background:#FFC72C; color:#222; text-decoration:none; border-radius:.5rem; font-weight:600; transition:all 0.2s; box-shadow:0 2px 8px rgba(255,199,44,0.3); }
    a:hover { background:#ffd740; transform:translateY(-1px); box-shadow:0 4px 12px rgba(255,199,44,0.4); }
    .loading { display:inline-block; width:1rem; height:1rem; border:2px solid #FFC72C; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:0.5rem; vertical-align:middle; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .footer-text { font-size:0.85rem; color:#999; margin-top:1.5rem; }
  </style>
</head>
<body>
  <div class="box">
    <img src="https://nomad-magazine.com/logo.svg" alt="Nomad Magazine" class="logo" onerror="this.style.display='none'">
    <div class="icon">📥</div>
    <h1>Your Download is Ready!</h1>
    <p class="tagline">Thanks for being part of the nomad community</p>
    <p>Your magazine download should begin in just a moment.</p>
    <div class="filename">${filename}</div>
    <p style="margin-top:1.5rem;"><span class="loading"></span>Preparing your file...</p>
    <a href="${downloadUrl}" id="retryLink" style="display:none;">Click here if download doesn't start</a>
    <p class="footer-text">Enjoy your read and happy travels! 🌍</p>
  </div>

  <script>
    // Auto-trigger download using multiple methods for reliability

    // Method 1: Try with a dynamically created link with download attribute
    function triggerDownload() {
      const link = document.createElement('a');
      link.href = '${downloadUrl}';
      link.download = '${filename}';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Method 2: Also create a hidden iframe as fallback
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = '${downloadUrl}';
    document.body.appendChild(iframe);

    // Trigger both methods
    triggerDownload();

    // Show retry link after 3 seconds
    setTimeout(() => {
      document.getElementById('retryLink').style.display = 'inline-block';
      document.querySelector('.loading').style.display = 'none';
      document.querySelector('p:last-of-type').textContent = 'Download not starting?';
    }, 3000);

    // Remove iframe after 10 seconds to clean up
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 10000);
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
