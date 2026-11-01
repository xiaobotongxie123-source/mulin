# Mulin production deployment

Private entry: `https://106.52.117.169/mulin/`

The existing Moonveil site stays at `/`; Mulin is mounted under `/mulin/` and
runs on `127.0.0.1:8787` behind nginx.

## Build

```bash
APP_BASE_PATH=/mulin/ npm run build
```

`APP_BASE_PATH` controls Vite's asset base and the Vue router history base.
`src/game/apiBase.ts` prefixes API calls with the same base, so the browser
calls `/mulin/api/*` and nginx strips `/mulin/` before proxying to Node.

## Access control

Mulin uses a first-party access cookie instead of Basic Auth. Basic Auth can
fail to authorize module scripts and stylesheet subresources in some mobile
Safari versions, leaving a blank page.

1. Open `https://106.52.117.169/mulin/?access=<ACCESS_TOKEN>` once. This sets
   an `HttpOnly; Secure; SameSite=Lax` cookie for `/mulin/` and redirects to
   the app.
2. After that, `https://106.52.117.169/mulin/` works directly. The cookie lasts
   30 days.
3. The login form at `https://106.52.117.169/mulin/login.html` accepts the same
   token if the direct link is inconvenient.

The real token is only in the server nginx config, never in git. Rotate it by
changing both token comparisons and the `Set-Cookie` value, then reload nginx.
Anyone with the token URL can access the preview, so do not post it publicly.

`auth_basic off;` is required in both Mulin locations because the parent
Moonveil HTTPS server still has Basic Auth enabled.

## Server layout

```text
/opt/mulin/app          deployed dist/, server/, .env, agent-registry.json
/etc/systemd/system/mulin.service
/etc/nginx/sites-available/moonveil   # /mulin locations
/var/www/mulin-login/mulin/login.html
```

The service uses the existing Node 24 binary at
`/opt/moonveil/node/bin/node` and reads the server-only `.env` from its working
directory. Never commit `.env` or `server/agent-registry.json`.

## Install

```bash
sudo install -d -o mulin -g mulin /opt/mulin/app
sudo tar -xzf mulin-deploy.tgz -C /opt/mulin/app
sudo chown -R mulin:mulin /opt/mulin/app
sudo chmod 600 /opt/mulin/app/.env
sudo cp deploy/mulin.service /etc/systemd/system/mulin.service
sudo systemctl daemon-reload
sudo systemctl enable --now mulin
```

Add the locations from `deploy/nginx-mulin-location.conf` to the HTTPS server
block and install the login form:

```bash
sudo install -D -m 644 deploy/login.html /var/www/mulin-login/mulin/login.html
sudo nginx -t && sudo systemctl reload nginx
```

## Health check

Exchange the token for a cookie, then reuse the cookie:

```bash
curl -c /tmp/mulin.cookie -o /dev/null "https://106.52.117.169/mulin/?access=<ACCESS_TOKEN>"
curl -b /tmp/mulin.cookie https://106.52.117.169/mulin/api/health
```

Expected fields:

```json
{"ok":true,"agents":9,"linxAgents":9,"tts":{"provider":"xrobot","configured":true}}
```
