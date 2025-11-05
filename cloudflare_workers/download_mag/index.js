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

    const COOKIE_NAME = "r2_auth";
    const AUTH_DURATION_HOURS = 24;

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

    // 2) check cookie
    const cookieHeader = request.headers.get("Cookie") || "";
    const hasAuth = cookieHeader.split(";").some((c) => c.trim() === `${COOKIE_NAME}=ok`);
    console.log(`[AUTH] Cookie present: ${cookieHeader ? "yes" : "no"}, Authenticated: ${hasAuth}`);

    // 3) if POST, validate password and email
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
        console.log("[AUTH] Setting authentication cookie and redirecting");
        // set cookie and redirect to same URL (GET)
        const headers = new Headers({
          Location: url.pathname + url.search,
        });
        const expires = new Date(Date.now() + AUTH_DURATION_HOURS * 60 * 60 * 1000).toUTCString();
        headers.append(
          "Set-Cookie",
          `${COOKIE_NAME}=ok; Expires=${expires}; Path=/; HttpOnly; SameSite=Lax; Secure`
        );
        console.log(`[AUTH] Cookie expires: ${expires}`);
        return new Response(null, { status: 302, headers });
      } else if (isValid && !email) {
        console.log("[ERROR] Valid password but missing email");
        return passwordForm(url.pathname, "Email address is required.");
      } else {
        console.log("[ERROR] Invalid password attempt");
        return passwordForm(url.pathname, "Wrong password. Try again.");
      }
    }

    // 4) if not authorized, show form
    if (!hasAuth) {
      console.log("[RESPONSE] User not authenticated, showing password form");
      return passwordForm(url.pathname);
    }

    // 5) authorized → check if user wants direct download or landing page
    const wantsDownload = url.searchParams.get('download') === '1';

    if (!wantsDownload) {
      // Show "Download started" page with auto-download
      console.log("[RESPONSE] Showing download page");
      return downloadPage(path);
    }

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
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f5f5f5; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .box { background:white; padding:1.5rem 1.75rem; border-radius:0.75rem; box-shadow:0 10px 30px rgba(0,0,0,.06); width: min(360px, 100% - 2rem); }
    h1 { font-size:1.1rem; margin-bottom:.4rem; }
    p.msg { color:#b00020; margin-bottom:.5rem; }
    label { display:block; font-size:.8rem; margin-bottom:.35rem; margin-top:.75rem; }
    input[type=password], input[type=email] { width:100%; padding:.5rem .6rem; border:1px solid #ddd; border-radius: .4rem; font-size:.9rem; box-sizing: border-box; }
    input:focus { outline: none; border-color: #FFC72C; }
    button { margin-top:.75rem; width:100%; background:#FFC72C; color:#222; border:none; padding:.5rem; border-radius:.4rem; font-weight:600; cursor:pointer; }
    button:hover { background:#ffd740; }
    small { display:block; margin-top:.75rem; color:#888; font-size:.7rem; text-align:center; }
  </style>
</head>
<body>
  <!-- Step 1: Submit email to Bento, then validate password -->
  <form class="box" id="bentoForm" method="POST" action="https://track.bentonow.com/forms/1685a00cdc1fc329724616bec1de09c6/$dl_link?hardened=false" enctype="multipart/form-data" style="display:none;">
    <input type="hidden" name="email" id="bentoEmail" />
    <input type="hidden" name="fields_direct_download" value="true" />
    <input type="hidden" name="redirect" id="bentoRedirect" />
  </form>

  <!-- Step 2: Validate password with worker -->
  <form class="box" id="passwordForm" method="POST" action="${pathname}" style="display:none;">
    <input type="hidden" name="email" id="passwordEmail" />
    <input type="hidden" name="password" id="passwordValue" />
  </form>

  <!-- User-facing form -->
  <form class="box" id="downloadForm">
    <h1>Protected download</h1>
    ${msg ? `<p class="msg">${msg}</p>` : ""}
    <label for="email">Email Address</label>
    <input name="email" id="email" type="email" placeholder="your@email.com" required autofocus />
    <label for="password">Password</label>
    <input name="password" id="password" type="password" placeholder="From your email" required />
    <button type="submit" id="submitBtn">Download Magazine</button>
    <small>This link is protected. Enter your email and the password we sent you.</small>
  </form>

  <script>
    // Check if we're coming back from Bento redirect
    const urlParams = new URLSearchParams(window.location.search);
    const fromBento = urlParams.get('from_bento');
    const savedEmail = sessionStorage.getItem('dl_email');
    const savedPassword = sessionStorage.getItem('dl_password');

    if (fromBento === '1' && savedEmail && savedPassword) {
      // Submit password validation automatically
      document.getElementById('passwordEmail').value = savedEmail;
      document.getElementById('passwordValue').value = savedPassword;
      sessionStorage.removeItem('dl_email');
      sessionStorage.removeItem('dl_password');
      document.getElementById('passwordForm').submit();
    }

    document.getElementById('downloadForm').addEventListener('submit', function(e) {
      e.preventDefault();

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const submitBtn = document.getElementById('submitBtn');

      // Disable button and show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      // Save credentials in session storage
      sessionStorage.setItem('dl_email', email);
      sessionStorage.setItem('dl_password', password);

      // Build redirect URL back to this page with flag
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('from_bento', '1');

      // Set values in hidden form BEFORE submitting
      const bentoForm = document.getElementById('bentoForm');
      document.getElementById('bentoEmail').value = email;
      document.getElementById('bentoRedirect').value = currentUrl.toString();

      // Now submit
      bentoForm.submit();
    });
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
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f5f5f5; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
    .box { background:white; padding:2rem; border-radius:0.75rem; box-shadow:0 10px 30px rgba(0,0,0,.06); width: min(420px, 100% - 2rem); text-align:center; }
    h1 { font-size:1.5rem; margin:0 0 1rem 0; color:#333; }
    .icon { font-size:3rem; margin-bottom:1rem; }
    p { color:#666; margin:0.5rem 0; line-height:1.5; }
    .filename { font-weight:600; color:#333; word-break:break-all; }
    a { display:inline-block; margin-top:1.5rem; padding:.75rem 1.5rem; background:#FFC72C; color:#222; text-decoration:none; border-radius:.5rem; font-weight:600; transition:background 0.2s; }
    a:hover { background:#ffd740; }
    .loading { display:inline-block; width:1rem; height:1rem; border:2px solid #FFC72C; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:0.5rem; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">📥</div>
    <h1>Download Started!</h1>
    <p>Your download should begin shortly.</p>
    <p class="filename">${filename}</p>
    <p style="margin-top:1.5rem;"><span class="loading"></span>Preparing your file...</p>
    <a href="${downloadUrl}" id="retryLink" style="display:none;">Click here if download doesn't start</a>
  </div>

  <script>
    // Auto-trigger download
    window.location.href = '${downloadUrl}';

    // Show retry link after 3 seconds
    setTimeout(() => {
      document.getElementById('retryLink').style.display = 'inline-block';
      document.querySelector('.loading').style.display = 'none';
      document.querySelector('p:last-of-type').textContent = 'Download not starting?';
    }, 3000);
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
