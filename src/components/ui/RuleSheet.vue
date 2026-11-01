<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import RoleIcon from './RoleIcon.vue';
import type { Role } from '@/game/types';
import { ROLE_COUNTS, ROLE_META } from '@/data/roles';
import werewolfArt from '@/assets/roles/werewolf.svg';
import seerArt from '@/assets/roles/seer.svg';
import witchArt from '@/assets/roles/witch.svg';
import hunterArt from '@/assets/roles/hunter.svg';
import villagerArt from '@/assets/roles/villager.svg';
import guardArt from '@/assets/roles/guard.svg';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const roles: Role[] = ['werewolf', 'villager', 'witch', 'guard', 'seer'];

type CastKey = Role | 'hunter';

interface CastCard {
  key: CastKey;
  name: string;
  en: string;
  faction: string;
  count: string;
  line: string;
  ability: string;
  accent: string;
  image: string;
  alt: string;
  preview?: string;
}

const castArt: Record<CastKey, string> = {
  werewolf: werewolfArt,
  seer: seerArt,
  witch: witchArt,
  hunter: hunterArt,
  villager: villagerArt,
  guard: guardArt,
};

const castAlt: Record<CastKey, string> = {
  werewolf: '暮色森林中，穿旧皮衣的灰毛Q版狼人站在满月下嚎叫，红色眼睛与小獠牙清晰可见。',
  seer: '深蓝星空下，戴兜帽、披星月披风的年轻预言家，双手托着发光的蓝色水晶球。',
  witch: '戴紫色尖帽的Q版女巫，手提绿色药瓶，坐在冒着绿紫色魔法光的大锅旁。',
  hunter: '披短斗篷、戴猎鹿帽的美式卡通猎人，肩扛猎枪，站在暖色夕照的木屋前。',
  villager: '夜色村庄小路上，穿旧布衣的Q版村民，提着温暖的灯笼，神情慌张。',
  guard: '月夜雾门前，披深蓝斗篷的守卫，手持长矛与纹章盾牌，腰间挂着提灯。',
};

const castOrder: CastKey[] = ['werewolf', 'seer', 'witch', 'hunter', 'villager', 'guard'];

const castCount: Record<CastKey, string> = {
  werewolf: `×${ROLE_COUNTS.werewolf}`,
  seer: `×${ROLE_COUNTS.seer}`,
  witch: `×${ROLE_COUNTS.witch}`,
  hunter: '设定',
  villager: `×${ROLE_COUNTS.villager}`,
  guard: `×${ROLE_COUNTS.guard}`,
};

const hunterCard = {
  key: 'hunter' as const,
  name: '猎人',
  en: 'HUNTER',
  faction: '好人阵营',
  count: '设定',
  line: '枪膛里最后一颗子弹，要留给最值得的人。',
  ability: '被狼人袭击或被放逐时，可以开枪带走一名玩家。猎人的枪声，是好人最后的发言。',
  accent: '#d89a62',
  image: hunterArt,
  alt: castAlt.hunter,
  preview: '角色设定 · 未加入本局',
};

const castCards: CastCard[] = castOrder.map((key) => {
  if (key === 'hunter') return hunterCard;
  const meta = ROLE_META[key];
  return {
    key,
    name: meta.name,
    en: meta.en,
    faction: meta.faction === 'wolf' ? '狼人阵营' : '好人阵营',
    count: castCount[key],
    line: meta.line,
    ability: meta.ability,
    accent: meta.color,
    image: castArt[key],
    alt: castAlt[key],
  };
});

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

            <section class="rule-block rule-block--cast">
              <span class="rule-index">02</span>
              <div class="rule-content">
                <div class="cast-heading">
                  <div>
                    <h3>角色图鉴</h3>
                    <span class="eyebrow">THE CAST · SIX FACES IN THE WOODS</span>
                  </div>
                  <span class="cast-caption">每一张牌，都是一个人。</span>
                </div>
                <p class="rule-copy">先认清他们的面孔，再决定夜里相信谁。卡面为暮林世界的角色设定；本局九人阵容仍为三狼、三民、预言家、女巫与守卫。</p>
                <div class="cast-grid">
                  <article
                    v-for="card in castCards"
                    :key="card.key"
                    class="cast-card"
                    :style="`--accent:${card.accent}`"
                  >
                    <div class="cast-art">
                      <img :src="card.image" :alt="card.alt" loading="lazy" decoding="async" />
                      <span class="cast-faction">{{ card.faction }}</span>
                      <span class="cast-count">{{ card.count }}</span>
                      <span v-if="card.preview" class="cast-preview">{{ card.preview }}</span>
                    </div>
                    <div class="cast-body">
                      <div class="cast-title">
                        <h4>{{ card.name }}</h4>
                        <span>{{ card.en }}</span>
                      </div>
                      <p class="cast-line">{{ card.line }}</p>
                      <p class="cast-ability">{{ card.ability }}</p>
                    </div>
                  </article>
                </div>
                <p class="cast-note">猎人卡为角色设定预览；当前九人局由守卫入席，猎人暂未加入夜间行动。</p>
              </div>
            </section>

            <section class="rule-block">
              <span class="rule-index">03</span>
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
              <span class="rule-index">04</span>
              <div class="rule-content">
                <h3>白天</h3>
                <p class="rule-copy">公布死讯 → 遗言 → 依次发言 → 放逐投票。票数最多者被放逐；平票则无人出局。</p>
              </div>
            </section>

            <section class="rule-block">
              <span class="rule-index">05</span>
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
              <span class="rule-index">06</span>
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
  width: min(1040px, 100%);
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

.sheet {
  border: 1px solid rgba(224, 210, 180, 0.16);
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.62), 0 1px 0 rgba(255, 255, 255, 0.04) inset;
}

.rule-block--cast {
  padding-bottom: 26px;
}

.cast-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}

.cast-heading .eyebrow {
  display: block;
  margin-top: 7px;
  font-size: 7px;
  letter-spacing: 0.2em;
  color: rgba(212, 178, 122, 0.5);
}

.cast-caption {
  padding-bottom: 2px;
  font-family: var(--serif);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--ink-mute);
}

.cast-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.cast-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(224, 210, 180, 0.13);
  background: linear-gradient(180deg, rgba(18, 27, 21, 0.78), rgba(7, 11, 9, 0.94));
  transition: transform 0.45s var(--ease-out), border-color 0.45s var(--ease-out), box-shadow 0.45s var(--ease-out);
}

.cast-card::before {
  content: "";
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.66;
}

.cast-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--accent) 48%, transparent);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.32);
}

.cast-art {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: #070b09;
}

.cast-art::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(3, 6, 4, 0.12) 0%, rgba(3, 6, 4, 0) 45%, rgba(3, 6, 4, 0.82) 100%),
    linear-gradient(90deg, rgba(3, 6, 4, 0.3), rgba(3, 6, 4, 0) 20%, rgba(3, 6, 4, 0) 80%, rgba(3, 6, 4, 0.3));
}

.cast-art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  filter: saturate(0.94) contrast(1.03);
  transition: transform 0.7s var(--ease-out), filter 0.7s var(--ease-out);
}

.cast-card:hover .cast-art img {
  transform: scale(1.035);
  filter: saturate(1.04) contrast(1.04);
}

.cast-faction,
.cast-count {
  position: absolute;
  z-index: 3;
  top: 9px;
  padding: 4px 7px;
  font-size: 7px;
  line-height: 1;
  letter-spacing: 0.14em;
  color: var(--accent);
  background: rgba(5, 9, 7, 0.64);
  border: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.cast-faction {
  left: 9px;
}

.cast-count {
  right: 9px;
  color: var(--ink-soft);
  border-color: rgba(224, 210, 180, 0.16);
}

.cast-preview {
  position: absolute;
  z-index: 3;
  left: 9px;
  bottom: 9px;
  padding: 5px 8px;
  font-size: 7px;
  letter-spacing: 0.1em;
  color: #e6c88f;
  background: rgba(8, 12, 9, 0.82);
  border: 1px solid rgba(212, 178, 122, 0.28);
}

.cast-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 12px 13px 15px;
}

.cast-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.cast-title h4 {
  font-family: var(--serif);
  font-size: 19px;
  font-weight: 400;
  letter-spacing: 0.14em;
  color: #efe5d2;
}

.cast-title span {
  font-size: 7px;
  letter-spacing: 0.18em;
  color: var(--ink-faint);
}

.cast-line {
  margin-top: 6px;
  font-family: var(--serif);
  font-size: 10px;
  line-height: 1.65;
  color: var(--accent);
  opacity: 0.82;
}

.cast-ability {
  margin-top: 7px;
  font-size: 10px;
  line-height: 1.8;
  color: var(--ink-mute);
}

.cast-note {
  margin-top: 11px;
  font-size: 9px;
  line-height: 1.75;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
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
  .cast-heading {
    display: block;
  }
  .cast-caption {
    display: block;
    margin-top: 7px;
  }
  .cast-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .cast-card {
    display: grid;
    grid-template-columns: 42% 1fr;
  }
  .cast-art {
    aspect-ratio: auto;
    height: 100%;
    min-height: 188px;
  }
  .cast-body {
    justify-content: center;
    padding: 14px 15px;
  }
  .cast-title h4 {
    font-size: 21px;
  }
  .cast-line {
    font-size: 10px;
  }
  .cast-ability {
    font-size: 10px;
  }
}

@media (min-width: 721px) and (max-width: 940px) {
  .cast-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
