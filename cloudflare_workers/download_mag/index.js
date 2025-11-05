export default {
  async fetch(request, env, ctx) {
    // collect all passwords from env
    const validPasswords = Object.keys(env)
      .filter((k) => k === "DOWNLOAD_PASSWORD" || k.startsWith("DOWNLOAD_PASSWORD_"))
      .map((k) => env[k])
      .filter(Boolean); // remove empty ones

    const COOKIE_NAME = "r2_auth";
    const AUTH_DURATION_HOURS = 24;

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, ""); // remove leading /

    // if no passwords were set in env, refuse
    if (validPasswords.length === 0) {
      return new Response(
        "No passwords configured. Add DOWNLOAD_PASSWORD or DOWNLOAD_PASSWORD_1 in Worker env.",
        { status: 500 }
      );
    }

    // 1) if no file requested, show simple index
    if (!path) {
      return new Response(
        `<html><body><h3>R2 protected bucket</h3><p>Specify a file in the URL.</p></body></html>`,
        { headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }

    // 2) check cookie
    const cookieHeader = request.headers.get("Cookie") || "";
    const hasAuth = cookieHeader.split(";").some((c) => c.trim() === `${COOKIE_NAME}=ok`);

    // 3) if POST, validate password
    if (request.method === "POST") {
      const formData = await request.formData();
      const password = formData.get("password");

      const isValid = validPasswords.includes(password);

      if (isValid) {
        // set cookie and redirect to same URL (GET)
        const headers = new Headers({
          Location: url.pathname + url.search,
        });
        const expires = new Date(Date.now() + AUTH_DURATION_HOURS * 60 * 60 * 1000).toUTCString();
        headers.append(
          "Set-Cookie",
          `${COOKIE_NAME}=ok; Expires=${expires}; Path=/; HttpOnly; SameSite=Lax; Secure`
        );
        return new Response(null, { status: 302, headers });
      } else {
        return passwordForm(url.pathname, "Wrong password. Try again.");
      }
    }

    // 4) if not authorized, show form
    if (!hasAuth) {
      return passwordForm(url.pathname);
    }

    // 5) authorized → get object from R2
    const object = await env.MAG.get(path);
    if (!object) {
      return new Response("File not found", { status: 404 });
    }

    // fill headers from R2 if present
    const headers = new Headers(object.httpMetadata || {});
    // force download
    const filename = path.split("/").pop() || "file";
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/octet-stream");
    }

    return new Response(object.body, {
      status: 200,
      headers,
    });
  },
};

// helper to render password form
function passwordForm(pathname, msg = "") {
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
    label { display:block; font-size:.8rem; margin-bottom:.35rem; }
    input[type=password] { width:100%; padding:.5rem .6rem; border:1px solid #ddd; border-radius: .4rem; font-size:.9rem; }
    button { margin-top:.75rem; width:100%; background:#111827; color:white; border:none; padding:.5rem; border-radius:.4rem; font-weight:500; cursor:pointer; }
    button:hover { background:#000; }
    small { display:block; margin-top:.75rem; color:#888; font-size:.7rem; text-align:center; }
  </style>
</head>
<body>
  <form class="box" method="POST" action="${pathname}">
    <h1>Protected download</h1>
    ${msg ? `<p class="msg">${msg}</p>` : ""}
    <label for="password">Enter password</label>
    <input name="password" id="password" type="password" required autofocus />
    <button type="submit">Continue</button>
    <small>This link is protected.</small>
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
