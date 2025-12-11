<template>
  <div
    class="row items-center justify-center q-pa-md bg-grey-2"
    style="min-height: 100vh"
  >
    <q-card class="q-pa-lg shadow-4" style="width: 380px; max-width: 95vw">
      <q-card-section class="text-center q-pb-none">
        <div class="text-h6 text-weight-bold">Admin Dashboard</div>
        <div class="text-caption text-grey-7 q-mt-xs">
          Sign in to manage your content
        </div>
      </q-card-section>

      <q-form
        ref="formRef"
        @submit.prevent="onSubmit"
        class="q-mt-md q-gutter-md"
      >
        <q-card-section class="q-gutter-sm">
          <q-input
            v-model="email"
            type="email"
            label="Email"
            dense
            outlined
            autofocus
            autocomplete="email"
            :disable="loading"
            :rules="[rules.required, rules.email]"
          />

          <q-input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            dense
            outlined
            autocomplete="current-password"
            :disable="loading"
            :rules="[rules.required]"
            @keyup.enter="onSubmit"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-btn
            label="Sign in"
            color="primary"
            class="full-width q-mt-sm"
            type="submit"
            :loading="loading"
            :disable="loading"
            unelevated
          />

          <q-banner v-if="error" class="bg-red-2 text-red-9 q-mt-sm" dense>
            {{ error }}
          </q-banner>
        </q-card-section>
      </q-form>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "src/stores/auth";
import type { QForm } from "quasar";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const showPassword = ref(false);

const formRef = ref<QForm | null>(null);

const rules = {
  required: (val: string) => !!val || "This field is required",
  email: (val: string) =>
    (!!val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) ||
    "Please enter a valid email",
};

async function onSubmit() {
  error.value = "";

  if (!formRef.value) return;

  const valid = await formRef.value.validate();
  if (!valid) return;

  loading.value = true;
  try {
    await auth.login(email.value.trim(), password.value);
    const next = (route.query.next as string) || "/";
    router.replace(next);
  } catch (e: any) {
    error.value =
      e?.response?.data?.error ||
      e?.message ||
      "Login failed. Please check your credentials.";
  } finally {
    loading.value = false;
  }
}
</script>
