import { reactive } from 'vue';
import type { Claim, Role, SeerCheck } from './types';

export type AgentRuntimeState = 'unknown' | 'checking' | 'online' | 'offline' | 'degraded';

export interface AgentSpeechContext {
  seat: number;
  name: string;
  role: Role;
  faction: 'good' | 'wolf';
  tone: string;
  round: number;
  day: number;
  aliveSeats: number[];
  deadSeats: number[];
  lastNightDeaths: number[];
  lastExiled: number | null;
  teammates: number[];
  claims: Claim[];
  seerChecks: SeerCheck[];
  witch: { antidote: boolean; poison: boolean };
  guardLast: number | null;
  players: Array<{ seat: number; name: string; alive: boolean; isHuman: boolean }>;
  recentPublic: Array<{ seat?: number; kind: string; text: string }>;
}

export const agentRuntime = reactive({
  state: 'unknown' as AgentRuntimeState,
  provider: 'offline',
  model: '',
  agents: 8,
  linxAgents: 0,
  configured: false,
  lastError: '',
  lastCheckedAt: 0,
});

let healthPromise: Promise<boolean> | null = null;
let lastHealthAt = 0;

function setOffline(message = '') {
  agentRuntime.state = 'offline';
  agentRuntime.provider = 'offline';
  agentRuntime.configured = false;
  agentRuntime.lastError = message;
}

function applyHealth(data: Record<string, unknown>) {
  const configured = Boolean(data.configured);
  agentRuntime.configured = configured;
  agentRuntime.provider = String(data.provider ?? (configured ? 'openai-compatible' : 'offline'));
  agentRuntime.model = configured
    ? String(data.model ?? '')
    : String(data.linxModel ?? '');
  agentRuntime.agents = Number(data.agents) || 8;
  agentRuntime.linxAgents = Number(data.linxAgents) || 0;
  agentRuntime.lastCheckedAt = Date.now();
  agentRuntime.lastError = '';
  agentRuntime.state = configured ? 'online' : 'offline';
}

export async function checkAgentRuntime(force = false): Promise<boolean> {
  const now = Date.now();
  if (!force && agentRuntime.state !== 'unknown' && now - lastHealthAt < 15_000) {
    return agentRuntime.state === 'online';
  }
  if (healthPromise) return healthPromise;

  agentRuntime.state = 'checking';
  healthPromise = (async () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1800);
    try {
      const response = await fetch('/api/health', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        setOffline(`health ${response.status}`);
        lastHealthAt = Date.now();
        return false;
      }
      const data = (await response.json()) as Record<string, unknown>;
      applyHealth(data);
      lastHealthAt = Date.now();
      return agentRuntime.state === 'online';
    } catch (error) {
      setOffline(error instanceof Error ? error.message : 'agent bridge unavailable');
      lastHealthAt = Date.now();
      return false;
    } finally {
      window.clearTimeout(timer);
      healthPromise = null;
    }
  })();

  return healthPromise;
}

export function refreshAgentRuntime(): Promise<boolean> {
  lastHealthAt = 0;
  return checkAgentRuntime(true);
}

export async function requestAgentSpeech(
  seat: number,
  context: AgentSpeechContext,
): Promise<string | null> {
  const available = await checkAgentRuntime();
  if (!available) return null;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`/api/agents/${seat}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ context }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (response.status === 503) {
        setOffline(String(data.message ?? 'agent not configured'));
      } else {
        agentRuntime.state = 'degraded';
        agentRuntime.lastError = String(data.message ?? data.error ?? `agent ${response.status}`);
      }
      return null;
    }
    const data = (await response.json()) as { text?: unknown; model?: unknown };
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!text) {
      agentRuntime.state = 'degraded';
      agentRuntime.lastError = 'empty response';
      return null;
    }
    agentRuntime.state = 'online';
    if (typeof data.model === 'string') agentRuntime.model = data.model;
    return text;
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      agentRuntime.state = 'degraded';
      agentRuntime.lastError = error.message;
    }
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
