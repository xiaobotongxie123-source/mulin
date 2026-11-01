import { createRouter, createWebHistory } from 'vue-router';
import type { WorldMode } from '@/three/ForestWorld';
import { useGameStore } from '@/stores/game';
import HomeView from '@/views/HomeView.vue';
import LobbyView from '@/views/LobbyView.vue';
import RevealView from '@/views/RevealView.vue';
import TableView from '@/views/TableView.vue';
import ResultView from '@/views/ResultView.vue';

declare module 'vue-router' {
  interface RouteMeta {
    world?: WorldMode;
  }
}

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { world: 'home' } },
    { path: '/lobby', name: 'lobby', component: LobbyView, meta: { world: 'lobby' } },
    { path: '/reveal', name: 'reveal', component: RevealView, meta: { world: 'reveal' } },
    { path: '/table', name: 'table', component: TableView, meta: { world: 'table' } },
    { path: '/result', name: 'result', component: ResultView, meta: { world: 'result' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach((to) => {
  const store = useGameStore();
  const needsGame = to.name === 'reveal' || to.name === 'table' || to.name === 'result';

  if (needsGame && store.phase === 'idle') {
    return { name: 'lobby' };
  }
  if (to.name === 'reveal' && store.phase !== 'reveal') {
    if (store.phase === 'result') return { name: 'result' };
    return { name: 'table' };
  }
  if (to.name === 'table' && store.phase === 'reveal') {
    return { name: 'reveal' };
  }
  if (to.name === 'table' && store.phase === 'result') {
    return { name: 'result' };
  }
  if (to.name === 'result' && !store.winner) {
    if (store.phase === 'result') return { name: 'lobby' };
    return { name: store.phase === 'reveal' ? 'reveal' : 'table' };
  }
  return true;
});

if (import.meta.env.DEV) {
  (window as unknown as { __mulinRouter?: typeof router }).__mulinRouter = router;
}
