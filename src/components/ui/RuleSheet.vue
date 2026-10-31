<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import RoleIcon from './RoleIcon.vue';
import type { Role } from '@/game/types';
import { ROLE_META } from '@/data/roles';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const roles: Role[] = ['werewolf', 'villager', 'witch', 'guard', 'seer'];

function close() {
  emit('update:open', false);
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) close();
}

watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKey);
    else window.removeEventListener('keydown', onKey);
  },
);

onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-wrap" role="dialog" aria-modal="true" aria-label="游戏规则">
        <div class="sheet-backdrop" @click="close"></div>
        <section class="sheet panel">
          <header class="sheet-head">
            <div>
              <p class="eyebrow">THE RULES · NINE AT THE TABLE</p>
              <h2 class="serif">围炉之前</h2>
            </div>
            <button class="icon-btn" type="button" aria-label="关闭规则" @click="close">
              <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </header>

          <div class="sheet-body">
            <section class="rule-block">
              <span class="rule-index">01</span>
              <div class="rule-content">
                <h3>身份</h3>
                <p class="rule-copy">九人局。三狼，三民，一女巫、一守卫、一预言家。你的身份随机发放，仅你可见。</p>
                <div class="role-grid">
                  <div v-for="role in roles" :key="role" class="role-chip">
                    <RoleIcon :role="role" :size="24" />
                    <div>
                      <b>{{ ROLE_META[role].name }}</b>
                      <span>{{ role === 'werewolf' ? '狼人阵营 ×3' : role === 'villager' ? '好人阵营 ×3' : '好人阵营 ×1' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="rule-block">
              <span class="rule-index">02</span>
              <div class="rule-content">
                <h3>夜晚</h3>
                <p class="rule-copy">所有人闭眼。行动顺序：守卫 → 狼人 → 女巫 → 预言家。天亮后只公布死者，不公布身份。</p>
                <ol class="night-order">
                  <li><i>Ⅰ</i><b>守卫</b><span>守护一人，不能连续两晚守护同一人，可以守自己。</span></li>
                  <li><i>Ⅱ</i><b>狼人</b><span>与同伴共同选择一名好人袭击。</span></li>
                  <li><i>Ⅲ</i><b>女巫</b><span>一瓶解药、一瓶毒药，每晚最多使用一种。</span></li>
                  <li><i>Ⅳ</i><b>预言家</b><span>查验一名玩家的阵营，结果仅自己可见。</span></li>
                </ol>
              </div>
            </section>

            <section class="rule-block">
              <span class="rule-index">03</span>
              <div class="rule-content">
                <h3>白天</h3>
                <p class="rule-copy">公布死讯 → 遗言 → 依次发言 → 放逐投票。票数最多者被放逐；平票则无人出局。</p>
              </div>
            </section>

            <section class="rule-block">
              <span class="rule-index">04</span>
              <div class="rule-content">
                <h3>胜负</h3>
                <div class="win-grid">
                  <div class="win-cell win-cell--good">
                    <span class="eyebrow">GOOD</span>
                    <b>好人阵营</b>
                    <p>放逐或击杀全部三只狼人，迎来破晓。</p>
                  </div>
                  <div class="win-cell win-cell--wolf">
                    <span class="eyebrow">WOLVES</span>
                    <b>狼人阵营</b>
                    <p>屠尽三名村民，或屠尽三名神职，完成屠边。</p>
                  </div>
                </div>
              </div>
            </section>

            <section class="rule-block">
              <span class="rule-index">05</span>
              <div class="rule-content">
                <h3>本作约定</h3>
                <ul class="notes">
                  <li>单机九人局：你与八位由 AI 扮演的旅人同桌，无需联网。</li>
                  <li>女巫可以自救；同守同救时，目标仍然死亡。</li>
                  <li>守卫不能连续两晚守护同一人；投票可以弃票。</li>
                  <li>发言、投票与技能均有时限；你也可以开启托管，让 AI 替你行动。</li>
                </ul>
              </div>
            </section>
          </div>

          <footer class="sheet-foot">
            <span>THE NIGHT IS LONG · THE FIRE IS WARM</span>
            <button class="btn btn--cta" type="button" @click="close">
              <span class="dot"></span>知道了<span class="arrow">→</span>
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-wrap {
  position: fixed;
  inset: 0;
  z-index: var(--z-sheet);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 4vh, 48px);
}

.sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(3, 6, 4, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.sheet {
  position: relative;
  width: min(780px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, rgba(17, 25, 19, 0.97), rgba(8, 12, 9, 0.985));
}

.sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 30px 34px 22px;
  border-bottom: 1px solid var(--line-soft);
}

.sheet-head h2 {
  margin-top: 12px;
  font-size: clamp(28px, 3vw, 38px);
  letter-spacing: 0.12em;
  color: #f0e7d5;
}

.sheet-body {
  overflow-y: auto;
  padding: 6px 34px 12px;
}

.rule-block {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 20px;
  padding: 22px 0;
  border-bottom: 1px solid rgba(224, 210, 180, 0.08);
}

.rule-block:last-child {
  border-bottom: 0;
}

.rule-index {
  font-family: var(--serif);
  font-size: 12px;
  color: rgba(212, 178, 122, 0.5);
  letter-spacing: 0.1em;
  padding-top: 3px;
}

.rule-content h3 {
  font-family: var(--serif);
  font-size: 19px;
  font-weight: 400;
  letter-spacing: 0.16em;
  color: #ece2cf;
}

.rule-copy {
  margin-top: 10px;
  max-width: 58ch;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 2;
  letter-spacing: 0.04em;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
}

.role-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 8px;
  border: 1px solid var(--line-soft);
  background: rgba(9, 14, 11, 0.5);
  color: var(--gold);
}

.role-chip b {
  display: block;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--ink);
}

.role-chip span {
  display: block;
  margin-top: 2px;
  font-size: 7px;
  letter-spacing: 0.12em;
  color: var(--ink-mute);
  white-space: nowrap;
}

.night-order {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.night-order li {
  display: grid;
  grid-template-columns: 22px 56px 1fr;
  align-items: baseline;
  gap: 10px;
  font-size: 11px;
  line-height: 1.8;
  color: var(--ink-soft);
}

.night-order i {
  font-family: var(--serif);
  font-style: normal;
  font-size: 10px;
  color: rgba(212, 178, 122, 0.55);
}

.night-order b {
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 0.1em;
}

.win-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}

.win-cell {
  padding: 14px 16px;
  border: 1px solid var(--line-soft);
  background: rgba(9, 14, 11, 0.45);
}

.win-cell b {
  display: block;
  margin-top: 8px;
  font-family: var(--serif);
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.14em;
}

.win-cell p {
  margin-top: 8px;
  font-size: 10px;
  line-height: 1.9;
  color: var(--ink-mute);
}

.win-cell--good {
  border-color: rgba(143, 176, 142, 0.25);
}

.win-cell--wolf {
  border-color: rgba(169, 85, 77, 0.3);
}

.notes {
  display: grid;
  gap: 7px;
  margin-top: 12px;
}

.notes li {
  position: relative;
  padding-left: 14px;
  color: var(--ink-mute);
  font-size: 11px;
  line-height: 1.9;
}

.notes li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.85em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(212, 178, 122, 0.55);
}

.sheet-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 34px 22px;
  border-top: 1px solid var(--line-soft);
}

.sheet-foot span {
  font-size: 7px;
  letter-spacing: 0.28em;
  color: var(--ink-faint);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.5s var(--ease-out);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.6s var(--ease-out), opacity 0.5s var(--ease-out);
}
.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(18px) scale(0.985);
  opacity: 0;
}

@media (max-width: 720px) {
  .sheet-head,
  .sheet-foot {
    padding-left: 20px;
    padding-right: 20px;
  }
  .sheet-body {
    padding-left: 20px;
    padding-right: 20px;
  }
  .role-grid {
    grid-template-columns: 1fr 1fr;
  }
  .win-grid {
    grid-template-columns: 1fr;
  }
  .sheet-foot span {
    display: none;
  }
  .rule-block {
    grid-template-columns: 22px 1fr;
    gap: 10px;
  }
}
</style>
