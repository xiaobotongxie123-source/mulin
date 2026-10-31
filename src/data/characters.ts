export type PortraitVariant = 'hood' | 'hat' | 'braid' | 'crop' | 'long' | 'bun';
export type Accessory = 'compass' | 'herb' | 'antler' | 'mask' | 'pine' | 'key' | 'quill' | 'mushroom' | 'lantern';
export type Tone = 'calm' | 'warm' | 'blunt' | 'sly' | 'nervous';

export interface Character {
  id: string;
  name: string;
  title: string;
  trait: string;
  tone: Tone;
  variant: PortraitVariant;
  accessory: Accessory;
  palette: {
    cloak: string;
    cloakDeep: string;
    accent: string;
    skin: string;
    hair: string;
  };
}

export const CHARACTERS: Character[] = [
  {
    id: 'shen-yan',
    name: '沈砚',
    title: '制图师',
    trait: '把每一条山路，都记在纸上',
    tone: 'calm',
    variant: 'hood',
    accessory: 'compass',
    palette: { cloak: '#6f8070', cloakDeep: '#33443a', accent: '#c9b184', skin: '#d8b394', hair: '#2d2a24' },
  },
  {
    id: 'bai-tang',
    name: '白棠',
    title: '药师',
    trait: '识得百草，也识得人心',
    tone: 'warm',
    variant: 'braid',
    accessory: 'herb',
    palette: { cloak: '#9c7466', cloakDeep: '#4b3631', accent: '#d6b58c', skin: '#e0bb9c', hair: '#3a2b26' },
  },
  {
    id: 'lu-li',
    name: '陆离',
    title: '猎户',
    trait: '箭不虚发，话不多',
    tone: 'blunt',
    variant: 'crop',
    accessory: 'antler',
    palette: { cloak: '#68775d', cloakDeep: '#313d2e', accent: '#ccb183', skin: '#c9a07f', hair: '#241f1a' },
  },
  {
    id: 'su-jiu',
    name: '苏九',
    title: '说书人',
    trait: '故事里的事，往往是真的',
    tone: 'sly',
    variant: 'long',
    accessory: 'mask',
    palette: { cloak: '#836b80', cloakDeep: '#3d303c', accent: '#d3b184', skin: '#dcb595', hair: '#2a2229' },
  },
  {
    id: 'gu-qing',
    name: '顾青',
    title: '守林人',
    trait: '在这片林子里走了三十年',
    tone: 'blunt',
    variant: 'hood',
    accessory: 'pine',
    palette: { cloak: '#526b5c', cloakDeep: '#26382f', accent: '#b9a077', skin: '#bf9678', hair: '#332d25' },
  },
  {
    id: 'jiang-mian',
    name: '江眠',
    title: '旅店老板',
    trait: '山舍的灯，是我点的',
    tone: 'warm',
    variant: 'bun',
    accessory: 'key',
    palette: { cloak: '#93744d', cloakDeep: '#463623', accent: '#e0c28c', skin: '#d7ad8e', hair: '#3b2a1d' },
  },
  {
    id: 'wen-ci',
    name: '温辞',
    title: '抄经人',
    trait: '抄了十万字，还是看不透人',
    tone: 'nervous',
    variant: 'crop',
    accessory: 'quill',
    palette: { cloak: '#65708a', cloakDeep: '#2d3446', accent: '#c3ae86', skin: '#d4ad91', hair: '#2b2b31' },
  },
  {
    id: 'a-ruo',
    name: '阿箬',
    title: '采菇人',
    trait: '雨后林子里的东西，不能乱碰',
    tone: 'nervous',
    variant: 'braid',
    accessory: 'mushroom',
    palette: { cloak: '#78865a', cloakDeep: '#39422a', accent: '#d1b883', skin: '#dbb492', hair: '#332b20' },
  },
  {
    id: 'pei-zhao',
    name: '裴照',
    title: '提灯人',
    trait: '灯照到的地方，才算路',
    tone: 'calm',
    variant: 'hat',
    accessory: 'lantern',
    palette: { cloak: '#83674c', cloakDeep: '#3d2f22', accent: '#e2c58e', skin: '#cba584', hair: '#2e2620' },
  },
];

export const HUMAN_CHARACTER = CHARACTERS[0];
export const BOT_CHARACTERS = CHARACTERS.slice(1);
