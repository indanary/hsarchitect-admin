<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Header -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          @click="leftOpen = !leftOpen"
          aria-label="Menu"
        />

        <q-toolbar-title />

        <q-btn flat dense icon="logout" label="Logout" @click="handleLogout" />
      </q-toolbar>
    </q-header>

    <!-- Left Drawer (Sidebar) -->
    <q-drawer v-model="leftOpen" show-if-above bordered :width="240">
      <!-- Title + Mail Icon -->
      <div
        class="q-pa-md row items-center justify-between text-grey-8 text-subtitle2"
      >
        <span>HSArchitect</span>

        <!-- Email icon + unread badge -->
        <q-btn flat round dense icon="mail" @click="openWebmail">
          <q-badge v-if="mail.hasUnread" color="red" floating rounded>
            {{ mail.unread }}
          </q-badge>
        </q-btn>
      </div>

      <q-list padding>
        <q-item
          v-for="item in menu"
          :key="item.label"
          :to="item.to"
          clickable
          v-ripple
          :active="$route.name === (item.to as any).name"
          active-class="bg-primary text-white"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Page Container -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useAuthStore } from "src/stores/auth";
import { useMailStore } from "src/stores/mail"; // ✅ mail store
import { useRouter } from "vue-router";
import { MAIN_MENU } from "src/constants/menu";

const leftOpen = ref(true);
const menu = MAIN_MENU;

const auth = useAuthStore();
const mail = useMailStore();
const router = useRouter();

let poller: any = null;

/* ===== Mail ===== */
function openWebmail() {
  window.open("https://hsarchitect.id/webmail", "_blank");
}

/* ===== Lifecycle ===== */
onMounted(() => {
  // initial fetch
  mail.fetchUnread();

  // polling every 60s
  poller = setInterval(() => {
    mail.fetchUnread();
  }, 60000);
});

onBeforeUnmount(() => {
  if (poller) clearInterval(poller);
});

/* ===== Auth ===== */
function handleLogout() {
  auth.logout();
  mail.reset(); // clear mail state
  router.replace("/login");
}
</script>
