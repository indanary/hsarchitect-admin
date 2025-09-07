import { boot } from "quasar/wrappers";
import { useAuthStore } from "src/stores/auth";

export default boot(({ router }) => {
  const auth = useAuthStore();
  auth.init();

  router.beforeEach((to) => {
    const needsAuth = to.meta.requiresAuth === true;
    if (needsAuth && (!auth.isAuthed || auth.isExpired)) {
      auth.logout();
      return { path: "/login", query: { next: to.fullPath } };
    }
    if (to.path === "/login" && auth.isAuthed && !auth.isExpired) {
      return { path: "/" };
    }
  });
});
