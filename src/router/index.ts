import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw,
} from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("@/views/HomeView.vue"),
  },
  {
    path: "/tetris",
    name: "tetris",
    component: () => import("@/views/TetrisView.vue"),
  },
  {
    path: "/sudoku",
    name: "sudoku",
    component: () => import("@/views/SudokuView.vue"),
  },
  {
    path: "/twenty48",
    name: "twenty48",
    component: () => import("@/views/Twenty48View.vue"),
  },
  {
    path: "/snake",
    name: "snake",
    component: () => import("@/views/SnakeView.vue"),
  },
  {
    path: "/gomoku",
    name: "gomoku",
    component: () => import("@/views/GomokuView.vue"),
  },
  {
    path: "/npuzzle",
    name: "npuzzle",
    component: () => import("@/views/NpuzzleView.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
