#!/usr/bin/env node
/**
 * Provision the eight MULIN NIGHTFALL characters as Linx / Xrobot agents.
 *
 * Usage:
 *   XROBO_API_KEY=... npm run agents:provision -- --dry-run
 *   XROBO_API_KEY=... npm run agents:provision
 *
 * Optional:
 *   XROBO_BASE_URL=https://xrobo.qiniu.com
 *   XROBO_LLM_MODEL_ID=f3626c105383d71654a57f2bb8a973f3
 *   XROBO_AGENT_PREFIX=暮林夜话
 *
 * The script only creates or updates agents matched by agentName; it never
 * deletes anything. The returned agent IDs are written to server/agent-registry.json.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_PROFILES, agentSystemPrompt } from './agents.mjs';

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
    break;
  } catch {
    // File is optional.
  }
}

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const baseUrl = (process.env.XROBO_BASE_URL || 'https://xrobo.qiniu.com').replace(/\/+$/, '');
const apiKey = process.env.XROBO_API_KEY || '';
const modelId = process.env.XROBO_LLM_MODEL_ID || 'f3626c105383d71654a57f2bb8a973f3';
const memModelId = process.env.XROBO_MEM_MODEL_ID || 'Memory_nomem';
const intentModelId = process.env.XROBO_INTENT_MODEL_ID || 'Intent_nointent';
const prefix = process.env.XROBO_AGENT_PREFIX || '暮林夜话';
const modelNameFallback = process.env.XROBO_LLM_MODEL_NAME || 'deepseek-v4-flash';
const __dirname = dirname(fileURLToPath(import.meta.url));

function agentName(profile) {
  return `${prefix}·${profile.name}`;
}

function payload(profile) {
  return {
    agentName: agentName(profile),
    assistantName: profile.name,
    langCode: 'zh',
    llmModelId: modelId,
    memModelId,
    intentModelId,
    systemPrompt: agentSystemPrompt(profile),
    extra: {
      llm: {
        temperature: 0.95,
        top_p: 0.95,
        max_tokens: 180,
      },
    },
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers ?? {}),
    },
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`HTTP ${response.status}: ${raw.slice(0, 240)}`);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data?.msg || data?.message || raw.slice(0, 240)}`);
  }
  if (data?.code !== undefined && data.code !== 0) {
    throw new Error(`API ${data.code}: ${data.msg || 'request failed'}`);
  }
  return data;
}

async function resolveModelName() {
  try {
    const data = await request('/v1/agents/models/llm');
    const all = [...(data?.data?.publics ?? []), ...(data?.data?.privates ?? [])];
    const found = all.find((item) => item.id === modelId);
    return found?.name || modelNameFallback;
  } catch {
    return modelNameFallback;
  }
}

async function listAgents() {
  const all = [];
  let cursor = '';
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const data = await request(`/xiaozhi/agent/list?${query.toString()}`);
    const items = Array.isArray(data?.data) ? data.data : [];
    all.push(...items);
    cursor = data?.nextCursor || '';
    if (!cursor || items.length === 0) break;
  }
  return all;
}

async function main() {
  const plans = AGENT_PROFILES.map((profile) => ({
    profile,
    name: agentName(profile),
    body: payload(profile),
  }));

  if (dryRun) {
    console.log(`DRY RUN · ${baseUrl} · model ${modelId}`);
    console.log(`Would create/update ${plans.length} agents (API key ${apiKey ? 'present' : 'missing'}).`);
    console.log(JSON.stringify(plans.map((plan) => plan.body), null, 2));
    return;
  }

  if (!apiKey) {
    console.error('XROBO_API_KEY is required. Create one at https://xrobo.qiniu.com/#/api-key-management');
    process.exitCode = 1;
    return;
  }

  const existing = await listAgents();
  const modelName = await resolveModelName();
  const byName = new Map(existing.map((item) => [item.agentName, item]));
  const registry = {};

  for (const plan of plans) {
    const found = byName.get(plan.name);
    if (found?.id) {
      await request(`/xiaozhi/agent/${encodeURIComponent(found.id)}`, {
        method: 'PUT',
        body: JSON.stringify(plan.body),
      });
      registry[plan.profile.seat] = {
        id: found.id,
        agentName: plan.name,
        assistantName: plan.profile.name,
        action: 'updated',
      };
      console.log(`updated  ${String(plan.profile.seat).padStart(2, '0')} ${plan.name} (${found.id})`);
    } else {
      const created = await request('/xiaozhi/agent', {
        method: 'POST',
        body: JSON.stringify(plan.body),
      });
      const id = typeof created?.data === 'string' ? created.data : created?.data?.id;
      if (!id) throw new Error(`create ${plan.name}: response did not include an agent id`);
      registry[plan.profile.seat] = {
        id,
        agentName: plan.name,
        assistantName: plan.profile.name,
        action: 'created',
      };
      console.log(`created  ${String(plan.profile.seat).padStart(2, '0')} ${plan.name} (${id})`);
    }
  }

  const output = resolve(__dirname, 'agent-registry.json');
  await writeFile(output, `${JSON.stringify({ baseUrl, modelId, modelName, agents: registry }, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${output}`);
  console.log('The game bridge uses the persona prompts directly; these agent IDs are for the Linx console / devices.');
}

main().catch((error) => {
  console.error(`Provisioning failed: ${error.message}`);
  process.exitCode = 1;
});
