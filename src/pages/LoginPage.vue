<template>
  <div
    class="row items-center justify-center q-pa-md"
    style="min-height: 100vh"
  >
    <q-card style="width: 360px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">Admin Login</div>
      </q-card-section>

      <q-card-section class="q-gutter-sm">
        <q-input v-model="email" type="email" label="Email" dense autofocus />
        <q-input
          v-model="password"
          type="password"
          label="Password"
          dense
          @keyup.enter="onSubmit"
        />
        <q-btn
          label="Sign in"
          color="primary"
          class="full-width"
          :loading="loading"
          @click="onSubmit"
        />
        <q-banner v-if="error" class="bg-red-2 text-red-9 q-mt-sm">
          {{ error }}
        </q-banner>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "src/stores/auth";
import { useRoute, useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login(email.value.trim(), password.value);
    const next = (route.query.next as string) || "/";
    router.replace(next);
  } catch (e: any) {
    error.value = e?.response?.data?.error || "Login failed";
  } finally {
    loading.value = false;
  }
}
</script>
