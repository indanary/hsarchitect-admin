import { defineStore } from "pinia";
import { api } from "src/boot/axios";

type MailState = {
  unread: number;
  loading: boolean;
  error: string | null;
};

export const useMailStore = defineStore("mail", {
  state: (): MailState => ({
    unread: 0,
    loading: false,
    error: null,
  }),

  getters: {
    hasUnread: (s) => s.unread > 0,
  },

  actions: {
    async fetchUnread() {
      this.loading = true;
      this.error = null;

      try {
        const { data } = await api.get("/mail/unread-count");
        this.unread = data.unread || 0;
      } catch (err: any) {
        this.error = "Failed to fetch unread mail count";
        console.error("MAIL STORE ERROR:", err);
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.unread = 0;
      this.loading = false;
      this.error = null;
    },
  },
});
