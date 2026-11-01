# Mulin production deployment

Public entry: `https://106.52.117.169/mulin/`

The existing Moonveil site stays at `/`; Mulin is mounted under `/mulin/` and
runs on `127.0.0.1:8787` behind nginx.

## Build

```bash
APP_BASE_PATH=/mulin/ npm run build
```

`APP_BASE_PATH` controls Vite's asset base and the Vue router history base.
`src/game/apiBase.ts` prefixes API calls with the same base, so the browser
calls `/mulin/api/*` and nginx strips `/mulin/` before proxying to Node.

## Server layout

```text
/opt/mulin/app          deployed dist/, server/, .env, agent-registry.json
/etc/systemd/system/mulin.service
/etc/nginx/sites-available/moonveil   # /mulin locations
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

Add `deploy/nginx-mulin-location.conf` to the HTTPS server block, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
curl https://106.52.117.169/mulin/api/health
```

## Health check

Expected fields:

```json
{"ok":true,"agents":9,"linxAgents":9,"tts":{"provider":"xrobot","configured":true}}
```
