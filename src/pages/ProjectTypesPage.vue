<template>
  <q-page padding class="column q-gutter-lg" :aria-busy="loading">
    <!-- Header -->
    <div
      class="q-pa-sm q-mt-xs bg-yellow-2 text-yellow-9 rounded-borders text-body2"
    >
      ⚠️ Updates may take a few minutes to appear on
      <strong>hsarchitect.id</strong> after saving.
    </div>

    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="column">
        <div class="text-h5 text-weight-bold">Project Types</div>
        <div class="text-caption text-grey-7">
          Define and manage categories for your projects
        </div>
      </div>

      <div class="row items-center q-gutter-sm">
        <q-input
          v-model="q"
          dense
          outlined
          debounce="300"
          placeholder="Search project types…"
          style="width: 260px"
          @update:model-value="() => fetchList()"
          :disable="loading"
        >
          <template #prepend><q-icon name="search" /></template>
          <template #append>
            <q-btn
              v-if="q"
              flat
              round
              dense
              icon="close"
              @click="clearSearch"
              :disable="loading"
            />
          </template>
        </q-input>

        <q-btn
          color="primary"
          icon="add"
          label="New Type"
          unelevated
          @click="openCreate"
          :disable="loading"
        />
      </div>
    </div>

    <!-- Table wrapped in card -->
    <q-card flat bordered>
      <!-- top linear progress to show immediate activity when loading -->
      <q-linear-progress v-if="loading" indeterminate class="q-mb-xs" />

      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 0 }"
        separator="horizontal"
        no-data-label="No project types yet"
        no-results-label="No matches"
      >
        <!-- Project Type as a chip -->
        <template #body-cell-project_type="props">
          <q-td :props="props">
            <q-chip
              dense
              square
              color="grey-3"
              text-color="grey-9"
              class="text-capitalize"
            >
              {{ props.row.project_type }}
            </q-chip>
          </q-td>
        </template>

        <!-- Actions with tooltips -->
        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs text-right">
            <q-btn
              dense
              flat
              round
              icon="edit"
              color="primary"
              @click="openEdit(props.row)"
              :disable="loading"
            >
              <q-tooltip>Edit</q-tooltip>
            </q-btn>
            <q-btn
              dense
              flat
              round
              icon="delete"
              color="negative"
              @click="confirmDelete(props.row)"
              :disable="loading"
            >
              <q-tooltip>Delete</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Create / Edit dialog -->
    <q-dialog v-model="dialog.open" persistent>
      <q-card style="min-width: 420px; max-width: 90vw">
        <q-card-section class="row items-center">
          <div class="text-h6">
            {{
              dialog.mode === "create"
                ? "New Project Type"
                : "Edit Project Type"
            }}
          </div>
          <q-space />
          <q-btn
            icon="close"
            flat
            round
            dense
            v-close-popup
            :disable="saving"
          />
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
            :disable="saving"
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
          <q-btn flat label="Cancel" v-close-popup :disable="deleting" />
          <q-btn
            color="negative"
            label="Delete"
            :loading="deleting"
            @click="doDelete"
            :disable="deleting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { QTableColumn, useQuasar } from "quasar";
import { api } from "src/boot/axios";

type Row = { id: number; project_type: string };

const $q = useQuasar();

// Start loading true so the UI immediately shows activity on first render
const loading = ref(true);
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

// fetchList supports a silent flag: when silent=true it won't toggle the global loading flag.
async function fetchList(silent = false) {
  if (!silent) loading.value = true;
  try {
    const { data } = await api.get<Row[]>("/project-types", {
      params: q.value ? { q: q.value } : undefined,
    });
    rows.value = data;
  } catch (e: any) {
    notifyError(e, "Failed to load project types");
  } finally {
    if (!silent) loading.value = false;
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
}>({ open: false, mode: "create", editingId: null });
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
      await api.post("/project-types", {
        project_type: form.value.project_type.trim(),
      });
      $q.notify({ type: "positive", message: "Created" });
    } else {
      await api.patch(`/project-types/${dialog.value.editingId}`, {
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
    await api.delete(`/project-types/${confirm.value.id}`);
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

// initial fetch: do a silent fetch so the loading state (true by default) remains until both boot tasks complete
onMounted(async () => {
  try {
    await fetchList(true);
  } finally {
    loading.value = false;
  }
});
</script>
