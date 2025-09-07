import { boot } from "quasar/wrappers";
import axios from "axios";
import { useAuthStore } from "src/stores/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  withCredentials: false, // we use Authorization header, not cookies
});

export default boot(({ app, router }) => {
  // attach token on every request
  api.interceptors.request.use((config) => {
    const auth = useAuthStore();
    if (auth.token) {
      config.headers.Authorization = `Bearer ${auth.token}`;
    }
    return config;
  });

  // handle 401 globally
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.response?.status === 401) {
        const auth = useAuthStore();
        auth.logout();
        if (router.currentRoute.value.path !== "/login") {
          router.replace({
            path: "/login",
            query: { next: router.currentRoute.value.fullPath },
          });
        }
      }
      return Promise.reject(err);
    }
  );

  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
