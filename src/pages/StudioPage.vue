<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h6">Studio</div>
      <q-space />
      <q-btn
        color="primary"
        class="q-ml-sm"
        dense
        icon="save"
        :loading="saving"
        label="Save"
        @click="save"
      />
    </div>

    <q-tabs
      v-model="tab"
      dense
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="q-mb-md"
    >
      <q-tab name="profile" label="Profile" icon="badge" />
      <q-tab name="philosophy" label="Philosophy" icon="lightbulb" />
      <q-tab name="achievement" label="Achievement" icon="emoji_events" />
    </q-tabs>

    <q-separator />

    <div class="q-mt-md">
      <q-editor
        v-model="form.description"
        :readonly="loading || saving"
        min-height="300px"
        :definitions="editorDefs"
        :toolbar="toolbar"
        placeholder="Write content here…"
      />
    </div>

    <q-separator class="q-my-lg" />

    <div>
      <div class="text-subtitle2 q-mb-sm">Preview</div>
      <div class="q-pa-md bg-grey-2" v-html="form.description"></div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useQuasar } from "quasar";
import { api } from "src/boot/axios";

type StudioType = "profile" | "philosophy" | "achievement";
type StudioRow = { id: number; type: StudioType; description: string | null };

const $q = useQuasar();

const tab = ref<StudioType>("profile");
const form = ref<{ description: string }>({ description: "" });

const loading = ref(false);
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

const editorDefs = {
  // optional custom defs if you want later
};

async function loadStudio(t: StudioType) {
  loading.value = true;
  try {
    const { data } = await api.get<StudioRow>(`/studio/${t}`);
    form.value.description = data?.description || "";
  } catch (e: any) {
    if (e?.response?.status === 404) {
      // not created yet
      form.value.description = "";
    } else {
      notifyError(e, "Failed to load");
    }
  } finally {
    loading.value = false;
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

async function resetFromServer() {
  await loadStudio(tab.value);
  $q.notify({ message: "Reset to server content", type: "info" });
}

function notifyError(e: any, fallback = "Error") {
  const msg = e?.response?.data?.error || e?.message || fallback;
  $q.notify({ type: "negative", message: msg });
}

// initial load + react to tab change
watch(tab, (t) => loadStudio(t), { immediate: true });
</script>
