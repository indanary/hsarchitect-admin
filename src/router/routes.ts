import { RouteRecordRaw } from "vue-router";
import MainLayout from "src/layouts/MainLayout.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("src/pages/LoginPage.vue"),
  },

  {
    path: "/",
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "home",
        component: () => import("src/pages/HomePage.vue"),
      },

      // new sections
      {
        path: "project-types",
        name: "project-types",
        component: () => import("src/pages/ProjectTypesPage.vue"),
      },
      {
        path: "projects",
        name: "projects",
        component: () => import("src/pages/ProjectsPage.vue"),
      },
      {
        path: "studio",
        name: "studio",
        component: () => import("src/pages/StudioPage.vue"),
      },
    ],
  },

  { path: "/:catchAll(.*)*", redirect: "/" },
];

export default routes;
