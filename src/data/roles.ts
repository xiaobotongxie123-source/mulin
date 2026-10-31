import type { Role, Faction } from '@/game/types';

export interface RoleMeta {
  role: Role;
  name: string;
  en: string;
  faction: Faction;
  line: string;
  ability: string;
  hint: string;
  color: string;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  werewolf: {
    role: 'werewolf',
    name: '狼人',
    en: 'WEREWOLF',
    faction: 'wolf',
    line: '月影之下，猎人亦是猎物。',
    ability: '每晚与同伴共同袭击一名玩家。白天隐藏身份，误导好人，把怀疑引向别人。',
    hint: '你的同伴会以血色印记标出。不要袭击狼人。',
    color: '#a9554d',
  },
  villager: {
    role: 'villager',
    name: '村民',
    en: 'VILLAGER',
    faction: 'good',
    line: '没有火把的人，也要走进夜里。',
    ability: '没有夜间技能。你的判断、发言与投票，是好人阵营最后的火把。',
    hint: '仔细听每个人的发言，把票投给你最怀疑的人。',
    color: '#93ac93',
  },
  seer: {
    role: 'seer',
    name: '预言家',
    en: 'SEER',
    faction: 'good',
    line: '看见的越多，越要学会沉默。',
    ability: '每晚查验一名玩家的阵营，得知其是好人还是狼人。信息越早被信任，破晓越近。',
    hint: '查验结果仅你可见。适时公开，但小心被狼人盯上。',
    color: '#c8b184',
  },
  witch: {
    role: 'witch',
    name: '女巫',
    en: 'WITCH',
    faction: 'good',
    line: '一瓶救人，一瓶杀人，都在你手里。',
    ability: '拥有一瓶解药与一瓶毒药，每晚最多使用一种。解药可救下当晚被袭击者，毒药可毒杀一人。',
    hint: '解药与毒药各只有一次。同守同救，仍然会死。',
    color: '#9b7fa8',
  },
  guard: {
    role: 'guard',
    name: '守卫',
    en: 'GUARD',
    faction: 'good',
    line: '守得住门，守不住人心。',
    ability: '每晚守护一名玩家，使其免于狼人袭击。不能连续两晚守护同一人。',
    hint: '同守同救，目标仍然死亡。可以守护自己。',
    color: '#7e94a8',
  },
};

export const ROLE_ORDER: Role[] = ['werewolf', 'villager', 'seer', 'witch', 'guard'];

export const ROLE_COUNTS: Record<Role, number> = {
  werewolf: 3,
  villager: 3,
  seer: 1,
  witch: 1,
  guard: 1,
};

export const ROLE_POOL: Role[] = [
  'werewolf',
  'werewolf',
  'werewolf',
  'villager',
  'villager',
  'villager',
  'seer',
  'witch',
  'guard',
];

export function roleName(role: Role): string {
  return ROLE_META[role].name;
}

export function factionName(faction: Faction): string {
  return faction === 'wolf' ? '狼人阵营' : '好人阵营';
}
