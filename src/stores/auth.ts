import { defineStore } from "pinia";
import { api } from "src/boot/axios";
import { jwtDecode } from "jwt-decode";

type JwtPayload = { sub: number; email: string; role: "admin"; exp?: number };

type User = {
  id: number;
  email: string;
};

function loadPersisted() {
  const raw = localStorage.getItem("auth");
  if (!raw) return { token: "", user: null as User | null };
  try {
    return JSON.parse(raw);
  } catch {
    return { token: "", user: null };
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: "" as string,
    user: null as User | null,
  }),
  getters: {
    isAuthed: (s) => !!s.token && !!s.user,
    isExpired: (s) => {
      if (!s.token) return true;
      try {
        const { exp } = jwtDecode<JwtPayload>(s.token);
        if (!exp) return false; // token without exp (unlikely)
        return Date.now() >= exp * 1000;
      } catch {
        return true;
      }
    },
  },
  actions: {
    init() {
      const { token, user } = loadPersisted();
      this.token = token;
      this.user = user;
      // auto-logout if expired
      if (this.isExpired) this.logout();
    },
    persist() {
      localStorage.setItem(
        "auth",
        JSON.stringify({ token: this.token, user: this.user })
      );
    },
    async login(email: string, password: string) {
      const { data } = await api.post("/auth/login", { email, password });
      this.token = data.accessToken;
      this.user = data.user;
      this.persist();
    },
    logout() {
      this.token = "";
      this.user = null;
      localStorage.removeItem("auth");
    },
  },
});
