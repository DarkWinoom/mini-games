import { createRouter, createWebHashHistory } from "vue-router";
import { games } from "@/games/registry";
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    ...games.map((game) => ({
      path: game.path,
      name: game.id,
      component: game.load,
    })),
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
