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
        <q-toolbar-title></q-toolbar-title>
        <q-space />
        <q-btn flat dense icon="logout" label="Logout" @click="handleLogout" />
      </q-toolbar>
    </q-header>

    <!-- Left Drawer (Sidebar) -->
    <q-drawer v-model="leftOpen" show-if-above bordered :width="240">
      <div class="q-pa-md text-grey-8 text-subtitle2">HSArchitect</div>
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
import { ref } from "vue";
import { useAuthStore } from "src/stores/auth";
import { useRouter } from "vue-router";
import { MAIN_MENU } from "src/constants/menu";

const leftOpen = ref(true);
const menu = MAIN_MENU;

const auth = useAuthStore();
const router = useRouter();

function handleLogout() {
  auth.logout();
  router.replace("/login");
}
</script>
