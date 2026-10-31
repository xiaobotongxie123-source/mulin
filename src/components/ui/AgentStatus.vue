<script setup lang="ts">
import { computed } from 'vue';
import { agentRuntime, refreshAgentRuntime } from '@/game/agentClient';

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

const label = computed(() => {
  if (agentRuntime.state === 'checking') return '连接智能体…';
  if (agentRuntime.state === 'online') {
    if (agentRuntime.provider === 'mock') {
      return props.compact ? '智能体演示' : '智能体演示 · 本地模拟';
    }
    return props.compact ? `智能体 ${agentRuntime.agents}` : `智能体在线 · ${agentRuntime.agents} 位`;
  }
  if (agentRuntime.state === 'degraded') return props.compact ? '智能体降级' : '智能体降级 · 使用本地发言';
  if (agentRuntime.linxAgents > 0) {
    return props.compact ? `灵矽 ${agentRuntime.linxAgents}` : `灵矽智能体 · ${agentRuntime.linxAgents} 位已建`;
  }
  return props.compact ? '本地策略' : '本地策略 · 配置智能体';
});

const detail = computed(() => {
  if (agentRuntime.state === 'online') {
    return `${agentRuntime.provider}${agentRuntime.model ? ` · ${agentRuntime.model}` : ''}`;
  }
  if (agentRuntime.linxAgents > 0) {
    return `已创建 ${agentRuntime.linxAgents} 个灵矽智能体（${agentRuntime.model || 'deepseek-v4-flash'}）；再配置 AGENT_LLM_API_KEY 即可让发言走模型`;
  }
  return agentRuntime.lastError || '设置 AGENT_LLM_API_KEY 后刷新即可接入灵矽/七牛模型';
});

function refresh() {
  void refreshAgentRuntime();
}
</script>

<template>
  <button
    class="agent-status"
    :class="[
      `is-${agentRuntime.state}`,
      { 'is-compact': compact, 'is-provisioned': agentRuntime.state !== 'online' && agentRuntime.linxAgents > 0 },
    ]"
    type="button"
    :title="detail"
    :aria-label="`${label}。点击重新检测`"
    @click="refresh"
  >
    <span class="agent-dot" aria-hidden="true"></span>
    <span class="agent-label">{{ label }}</span>
    <span v-if="!compact" class="agent-model">{{ agentRuntime.model || 'LOCAL FALLBACK' }}</span>
  </button>
</template>

<style scoped>
.agent-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 9px;
  border: 1px solid rgba(224, 210, 180, 0.14);
  background: rgba(8, 13, 10, 0.36);
  color: rgba(232, 222, 203, 0.52);
  font-size: 7px;
  letter-spacing: 0.12em;
  line-height: 1;
  white-space: nowrap;
  transition: border-color 0.3s ease, color 0.3s ease, background 0.3s ease;
}
.agent-status:hover {
  border-color: rgba(226, 195, 140, 0.4);
  color: rgba(241, 231, 210, 0.86);
}
.agent-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(230, 220, 200, 0.3);
  box-shadow: 0 0 7px transparent;
}
.is-checking .agent-dot {
  background: var(--gold);
  box-shadow: 0 0 8px rgba(212, 178, 122, 0.6);
  animation: agent-pulse 1.2s ease-in-out infinite;
}
.is-online {
  border-color: rgba(140, 178, 143, 0.32);
  color: rgba(183, 208, 174, 0.78);
  background: rgba(18, 34, 23, 0.42);
}
.is-online .agent-dot {
  background: #9ec59d;
  box-shadow: 0 0 9px rgba(158, 197, 157, 0.6);
}
.is-degraded {
  border-color: rgba(212, 178, 122, 0.3);
  color: rgba(219, 190, 145, 0.72);
}
.is-degraded .agent-dot {
  background: #d4b27a;
  box-shadow: 0 0 8px rgba(212, 178, 122, 0.45);
}
.is-offline .agent-dot {
  background: rgba(230, 220, 200, 0.28);
}
.is-provisioned {
  border-color: rgba(212, 178, 122, 0.24);
  color: rgba(224, 204, 170, 0.68);
  background: rgba(25, 21, 14, 0.32);
}
.is-provisioned .agent-dot {
  background: var(--gold);
  box-shadow: 0 0 8px rgba(212, 178, 122, 0.38);
}
.agent-model {
  display: none;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(230, 220, 200, 0.28);
  font-size: 6px;
  letter-spacing: 0.08em;
}
@media (min-width: 1181px) {
  .agent-model {
    display: inline-block;
  }
}
.is-compact {
  gap: 5px;
  padding: 4px 7px;
  font-size: 6.5px;
}
.is-compact .agent-model {
  display: none;
}
@keyframes agent-pulse {
  50% {
    opacity: 0.34;
  }
}
</style>
