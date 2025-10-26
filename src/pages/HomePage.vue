<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Welcome</div>
    <div>
      You're logged in as <b>{{ auth.user?.email }}</b
      >.
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useAuthStore } from "src/stores/auth";
const auth = useAuthStore();
</script>
