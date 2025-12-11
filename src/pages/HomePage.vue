<template>
  <q-page class="q-pa-lg">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-subtitle2 text-grey-7">{{ greeting }}</div>
        <div class="text-h5 text-weight-bold">
          Welcome back
          <span v-if="auth.user?.email" class="text-primary">
            {{ shortEmail }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="row q-col-gutter-md">
      <!-- User info card -->
      <div class="col-12 col-md-6">
        <q-card class="q-pa-md">
          <div class="row items-center">
            <q-avatar size="40px" color="primary" text-color="white">
              {{ avatarInitial }}
            </q-avatar>

            <div class="q-ml-md">
              <div class="text-subtitle1">
                {{ auth.user?.email || "Admin user" }}
              </div>
              <div class="text-caption text-grey-7">
                Logged in to CMS dashboard
              </div>
            </div>
          </div>

          <q-separator spaced />

          <div class="row q-col-gutter-md q-mt-xs">
            <div class="col-6">
              <div class="text-caption text-grey-7 q-mb-xs">Role</div>
              <div class="text-body2">Admin</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-7 q-mb-xs">Logged in at</div>
              <div class="text-body2">
                {{ loginTime }}
              </div>
            </div>
          </div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "src/stores/auth";

const auth = useAuthStore();

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
});

const shortEmail = computed(() => {
  const email = auth.user?.email || "";
  return email.length > 24 ? email.slice(0, 24) + "…" : email;
});

const avatarInitial = computed(() => {
  const email = auth.user?.email || "A";
  return email[0]?.toUpperCase() || "A";
});

// For now just show current time as "login time" placeholder.
// You can replace this with real last_login from backend later.
const loginTime = new Date().toLocaleString();
</script>
