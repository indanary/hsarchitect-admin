<!-- src/pages/ProjectTypesPage.vue -->
<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h6">Project Types</div>
      <q-space />
      <q-input
        v-model="q"
        dense
        outlined
        debounce="300"
        placeholder="Search project types…"
        style="width: 260px"
        @update:model-value="fetchList"
      >
        <template #prepend><q-icon name="search" /></template>
        <template #append>
          <q-btn v-if="q" flat round dense icon="close" @click="clearSearch" />
        </template>
      </q-input>
      <q-btn
        color="primary"
        class="q-ml-sm"
        icon="add"
        label="New"
        @click="openCreate"
      />
    </div>

    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :loading="loading"
      :pagination="{ rowsPerPage: 0 }"
      no-data-label="No project types yet"
      no-results-label="No matches"
    >
      <template #body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs">
          <q-btn dense flat round icon="edit" @click="openEdit(props.row)" />
          <q-btn
            dense
            flat
            round
            icon="delete"
            color="negative"
            @click="confirmDelete(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <!-- Create / Edit dialog -->
    <q-dialog v-model="dialog.open" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center">
          <div class="text-h6">
            {{
              dialog.mode === "create"
                ? "New Project Type"
                : "Edit Project Type"
            }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <q-form @submit="save">
            <q-input
              v-model="form.project_type"
              label="Project type *"
              outlined
              :rules="[
                (v) => (!!v && v.trim().length > 0) || 'Required',
                (v) => (v?.length ?? 0) <= 120 || 'Max 120 chars',
              ]"
              autofocus
              :disable="saving"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup :disable="saving" />
          <q-btn
            color="primary"
            :loading="saving"
            :label="dialog.mode === 'create' ? 'Create' : 'Save'"
            @click="save"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete confirm -->
    <q-dialog v-model="confirm.open">
      <q-card>
        <q-card-section>
          <div class="text-h6">Delete project type?</div>
          <div class="text-body2 q-mt-xs">This action cannot be undone.</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="negative"
            label="Delete"
            :loading="deleting"
            @click="doDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { QTableColumn, useQuasar } from "quasar";
import { api } from "src/boot/axios";

type Row = { id: number; project_type: string };

const $q = useQuasar();

const loading = ref(false);
const rows = ref<Row[]>([]);
const q = ref("");

const columns: QTableColumn[] = [
  { name: "id", label: "ID", field: "id", align: "left", sortable: true },
  {
    name: "project_type",
    label: "Project Type",
    field: "project_type",
    align: "left",
    sortable: true,
  },
  { name: "actions", label: "", field: "actions", align: "right" },
];

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await api.get<Row[]>("/admin/project-types", {
      params: q.value ? { q: q.value } : undefined,
    });
    rows.value = data;
  } catch (e: any) {
    notifyError(e, "Failed to load project types");
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  q.value = "";
  fetchList();
}

/* Dialog state */
const dialog = ref<{
  open: boolean;
  mode: "create" | "edit";
  editingId: number | null;
}>({
  open: false,
  mode: "create",
  editingId: null,
});
const form = ref<{ project_type: string }>({ project_type: "" });
const saving = ref(false);

function openCreate() {
  dialog.value = { open: true, mode: "create", editingId: null };
  form.value = { project_type: "" };
}

function openEdit(row: Row) {
  dialog.value = { open: true, mode: "edit", editingId: row.id };
  form.value = { project_type: row.project_type };
}

async function save() {
  if (!form.value.project_type?.trim()) {
    $q.notify({ type: "warning", message: "Project type is required" });
    return;
  }
  saving.value = true;
  try {
    if (dialog.value.mode === "create") {
      await api.post("/admin/project-types", {
        project_type: form.value.project_type.trim(),
      });
      $q.notify({ type: "positive", message: "Created" });
    } else {
      await api.patch(`/admin/project-types/${dialog.value.editingId}`, {
        project_type: form.value.project_type.trim(),
      });
      $q.notify({ type: "positive", message: "Saved" });
    }
    dialog.value.open = false;
    await fetchList();
  } catch (e: any) {
    if (e?.response?.status === 409) {
      $q.notify({
        type: "negative",
        message: "That project type already exists",
      });
    } else {
      notifyError(e, "Failed to save");
    }
  } finally {
    saving.value = false;
  }
}

/* Delete confirm */
const confirm = ref<{ open: boolean; id: number | null }>({
  open: false,
  id: null,
});
const deleting = ref(false);

function confirmDelete(row: Row) {
  confirm.value = { open: true, id: row.id };
}

async function doDelete() {
  deleting.value = true;
  try {
    await api.delete(`/admin/project-types/${confirm.value.id}`);
    $q.notify({ type: "positive", message: "Deleted" });
    confirm.value.open = false;
    await fetchList();
  } catch (e: any) {
    notifyError(e, "Failed to delete");
  } finally {
    deleting.value = false;
  }
}

/* Utils */
function notifyError(e: any, fallback = "Error") {
  const msg = e?.response?.data?.error || e?.message || fallback;
  $q.notify({ type: "negative", message: msg });
}

/* boot */
fetchList();
</script>
