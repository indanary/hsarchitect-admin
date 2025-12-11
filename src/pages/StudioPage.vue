<template>
  <q-page padding class="column q-gutter-lg" :aria-busy="loading">
    <!-- Header -->
    <div
      class="q-pa-sm q-mt-xs bg-yellow-2 text-yellow-9 rounded-borders text-body2"
    >
      ⚠️ Updates may take a few minutes to appear on
      <strong>hsarchitect.id</strong> after saving.
    </div>

    <div class="row items-center justify-between">
      <div class="column">
        <div class="text-h5 text-weight-bold">Studio Content</div>
        <div class="text-caption text-grey-7">
          Manage profile, philosophy, and achievements displayed on the website
        </div>
      </div>

      <q-btn
        color="primary"
        dense
        unelevated
        icon="save"
        :loading="saving"
        :disable="loading || saving"
        label="Save Changes"
        @click="save"
      />
    </div>

    <!-- Immediate top progress when loading -->
    <q-linear-progress v-if="loading" indeterminate class="q-mt-sm q-mb-sm" />

    <!-- Tabs -->
    <q-card flat bordered>
      <q-tabs
        v-model="tab"
        dense
        align="left"
        active-color="primary"
        indicator-color="primary"
        class="bg-grey-1"
      >
        <q-tab name="profile" label="Profile" icon="badge" />
        <q-tab name="philosophy" label="Philosophy" icon="lightbulb" />
        <q-tab name="achievement" label="Achievement" icon="emoji_events" />
      </q-tabs>
    </q-card>

    <!-- Editor Section -->
    <q-card flat bordered>
      <!-- Overlay loader to make load state more obvious -->
      <q-inner-loading :showing="loading">
        <div
          class="row items-center justify-center column"
          style="min-height: 300px"
        >
          <q-spinner-dots size="48px" />
          <div class="text-subtitle2 q-mt-md">Loading content…</div>
        </div>
      </q-inner-loading>

      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          Content Editor
        </div>
        <div class="text-caption text-grey-7 q-mb-md">
          Write formatted text using the toolbar below. This content will appear
          on the website.
        </div>

        <q-editor
          v-model="form.description"
          :readonly="loading || saving"
          min-height="300px"
          :definitions="editorDefs"
          :toolbar="toolbar"
          placeholder="Write content here…"
        />
      </q-card-section>
    </q-card>

    <!-- Preview Section -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Preview</div>
        <div class="text-caption text-grey-7 q-mb-md">
          Live preview of your content below:
        </div>

        <div
          class="q-pa-md bg-grey-2 rounded-borders"
          style="min-height: 150px; border: 1px solid #ddd"
          v-html="form.description"
        ></div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useQuasar } from "quasar";
import { api } from "src/boot/axios";

type StudioType = "profile" | "philosophy" | "achievement";
type StudioRow = {
  data: { id: number; type: StudioType; description: string | null };
};

const $q = useQuasar();

const tab = ref<StudioType>("profile");
const form = ref<{ description: string }>({ description: "" });

// start loading = true so users see immediate feedback
const loading = ref(true);
const saving = ref(false);

const toolbar = [
  ["bold", "italic", "strike", "underline"],
  ["quote", "unordered", "ordered", "outdent", "indent"],
  ["link", "hr"],
  ["undo", "redo"],
  [
    {
      label: "H",
      icon: "title",
      list: "no-icons",
      options: ["p", "h2", "h3", "h4"],
    },
  ],
  ["removeFormat"],
];

const editorDefs = {};

// loadStudio supports silent flag so we can control when the global loading hides
async function loadStudio(t: StudioType, silent = false) {
  if (!silent) loading.value = true;
  try {
    const { data } = await api.get<StudioRow>(`/studio/${t}`);
    form.value.description = data?.data?.description || "";
  } catch (e: any) {
    if (e?.response?.status === 404) {
      form.value.description = "";
    } else {
      notifyError(e, "Failed to load");
    }
  } finally {
    if (!silent) loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await api.put(`/studio/admin/${tab.value}`, {
      description: form.value.description || null,
    });
    $q.notify({ type: "positive", message: "Saved" });
  } catch (e: any) {
    notifyError(e, "Failed to save");
  } finally {
    saving.value = false;
  }
}

function notifyError(e: any, fallback = "Error") {
  const msg = e?.response?.data?.error || e?.message || fallback;
  $q.notify({ type: "negative", message: msg });
}

// initial load: keep loading true until the first fetch completes
watch(tab, (t) => loadStudio(t), { immediate: true });
</script>
