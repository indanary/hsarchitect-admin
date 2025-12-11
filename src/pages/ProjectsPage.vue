<!-- src/pages/ProjectsPage.vue (updated: improved initial loading UX) -->
<template>
  <q-page padding class="column q-gutter-lg" :aria-busy="loading">
    <!-- Header -->
    <div
      class="q-pa-sm q-mt-xs bg-yellow-2 text-yellow-9 rounded-borders text-body2"
    >
      ⚠️ Updates may take a few minutes to appear on
      <strong>hsarchitect.id</strong> after saving.
    </div>

    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="column">
        <div class="text-h5 text-weight-bold">Projects</div>
        <div class="text-caption text-grey-7">
          Manage all architectural projects in your CMS
        </div>
      </div>

      <div class="row items-center q-gutter-sm">
        <!-- Search Box -->
        <q-input
          v-model="q"
          dense
          outlined
          debounce="300"
          placeholder="Search title"
          @update:model-value="fetchList"
          style="width: 260px"
          :disable="loading"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>

          <template #append>
            <q-btn
              v-if="q"
              flat
              dense
              round
              icon="close"
              @click="
                q = '';
                fetchList();
              "
              :disable="loading"
            />
          </template>
        </q-input>

        <!-- New Project Button -->
        <q-btn
          color="primary"
          icon="add"
          label="New Project"
          unelevated
          @click="openCreate"
          :disable="loading"
        />
      </div>
    </div>

    <!-- Linear progress (prominent) -->
    <!-- keep the linear progress visible immediately when loading is true -->
    <q-linear-progress
      v-if="loading"
      indeterminate
      color="primary"
      class="q-mb-md"
    />

    <!-- Table -->
    <q-card flat bordered class="q-pa-none relative-position">
      <!-- Overlay loader: large spinner with dim backdrop -->
      <q-inner-loading :showing="loading">
        <div
          class="row items-center justify-center column"
          style="min-height: 220px"
        >
          <q-spinner-dots size="48px" color="primary" />
          <div class="text-subtitle2 q-mt-md">Loading projects…</div>
        </div>
      </q-inner-loading>

      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        :loading="loading"
        :pagination="{ rowsPerPage: 0 }"
        flat
        separator="horizontal"
        no-data-label="No projects yet"
        no-results-label="No matches found"
      >
        <template #body-cell-project_type="props">
          <q-td :props="props">
            <q-chip
              square
              dense
              color="grey-3"
              text-color="grey-9"
              class="text-uppercase"
            >
              {{ typeLabel(props.row.project_type_id) }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :label="props.row.status"
              color="blue-5"
              class="q-px-sm q-py-xs text-uppercase"
            />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs text-right">
            <q-btn
              dense
              flat
              round
              icon="image"
              color="primary"
              @click="openImages(props.row.id, props.row.title)"
              :disable="loading"
            >
              <q-tooltip>Manage Images</q-tooltip>
            </q-btn>

            <q-btn
              dense
              flat
              round
              icon="edit"
              color="secondary"
              @click="openEdit(props.row.id)"
              :disable="loading"
            >
              <q-tooltip>Edit Project</q-tooltip>
            </q-btn>

            <q-btn
              dense
              flat
              round
              icon="delete"
              color="negative"
              @click="confirmDelete(props.row.id)"
              :disable="loading"
            >
              <q-tooltip>Delete Project</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Editor Dialog -->
    <ProjectEditor
      v-model="editor.open"
      :mode="editor.mode"
      :project-id="editor.id"
      :type-options="typeOptions"
      @saved="onSaved"
    />

    <!-- Images Manager -->
    <ProjectImagesManager
      v-model="imagesOpen"
      :project-id="imagesProjectId"
      :project-title="imagesProjectTitle"
      @changed="onImagesChanged"
    />

    <!-- Delete confirmation -->
    <q-dialog v-model="confirm.open">
      <q-card>
        <q-card-section>
          <div class="text-h6">Delete this project?</div>
          <div class="text-body2 text-grey-7 q-mt-xs">
            This will also remove all associated images.
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancel"
            color="grey-7"
            v-close-popup
            :disable="confirm.loading"
          />
          <q-btn
            color="negative"
            label="Delete"
            :loading="confirm.loading"
            @click="doDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { QTableColumn, useQuasar } from "quasar";
import { api } from "src/boot/axios";
import ProjectEditor from "src/components/ProjectEditor.vue";
import ProjectImagesManager from "src/components/ProjectImagesManager.vue";

// Types (unchanged)
type ProjectRow = {
  id: number;
  title: string;
  location: string | null;
  project_type_id: number | null;
  scope: string | null;
  year: number | null;
  status: string; // free-form now
  area: string | null;
};
type ProjectDetail = ProjectRow & { description: string | null };

type ProjectType = { id: number; project_type: string };

const $q = useQuasar();

/* Search & list */
const q = ref("");
// loading starts as true so the user sees an immediate indicator on first mount
const loading = ref(true);
const rows = ref<ProjectRow[]>([]);
const columns: QTableColumn[] = [
  {
    name: "id",
    label: "ID",
    field: "id",
    align: "left",
    sortable: true,
    style: "width: 70px",
  },
  {
    name: "title",
    label: "Title",
    field: "title",
    align: "left",
    sortable: true,
  },
  {
    name: "project_type",
    label: "Type",
    field: "project_type_id",
    align: "left",
  },
  {
    name: "year",
    label: "Year",
    field: "year",
    align: "left",
    sortable: true,
    style: "width: 90px",
  },
  {
    name: "status",
    label: "Status",
    field: "status",
    align: "left",
    style: "width: 120px",
  },
  {
    name: "actions",
    label: "",
    field: "actions",
    align: "right",
    style: "width: 140px",
  },
];

/* Project types for select and table labels */
const typeOptions = ref<ProjectType[]>([]);
function typeLabel(id: number | null) {
  const t = typeOptions.value.find((x) => x.id === id);
  return t ? t.project_type : "—";
}
async function loadTypes() {
  try {
    const { data } = await api.get<ProjectType[]>("/project-types");
    typeOptions.value = data;
  } catch (e: any) {
    notifyError(e, "Failed to load project types");
  }
}

// fetchList now accepts a `silent` flag. When silent=true it will NOT toggle `loading`.
// This lets us control the global loading state explicitly during initial mount so
// the user sees an immediate loading UI while both types and projects are fetched.
async function fetchList(silent = false) {
  if (!silent) loading.value = true;
  try {
    const params: any = {};
    if (q.value) params.q = q.value;
    const { data } = await api.get<ProjectRow[]>("/projects/admin", { params });
    rows.value = data;
  } catch (e: any) {
    notifyError(e, "Failed to load projects");
  } finally {
    if (!silent) loading.value = false;
  }
}

/* Editor (create/edit) */
const editor = reactive<{
  open: boolean;
  mode: "create" | "edit";
  id: number | null;
}>({
  open: false,
  mode: "create",
  id: null,
});
function openCreate() {
  editor.open = true;
  editor.mode = "create";
  editor.id = null;
}
function openEdit(id: number) {
  editor.open = true;
  editor.mode = "edit";
  editor.id = id;
}
async function onSaved() {
  await fetchList();
}

/* Images manager trigger */
const imagesOpen = ref(false);
const imagesProjectId = ref<number | null>(null);
const imagesProjectTitle = ref<string | null>(null);
function openImages(projectId: number, projectTitle: string) {
  imagesProjectId.value = projectId;
  imagesProjectTitle.value = projectTitle;
  imagesOpen.value = true;
}
async function onImagesChanged() {
  // Optional: refresh list if you show thumbs/derived fields later
  await fetchList();
}

/* Delete */
const confirm = reactive<{
  open: boolean;
  id: number | null;
  loading: boolean;
}>({
  open: false,
  id: null,
  loading: false,
});
function confirmDelete(id: number) {
  confirm.open = true;
  confirm.id = id;
}
async function doDelete() {
  confirm.loading = true;
  try {
    await api.delete(`/projects/admin/${confirm.id}`);
    $q.notify({ type: "positive", message: "Deleted" });
    confirm.open = false;
    await fetchList();
  } catch (e: any) {
    notifyError(e, "Failed to delete");
  } finally {
    confirm.loading = false;
  }
}

/* Utils */
function notifyError(e: any, fallback = "Error") {
  const msg = e?.response?.data?.error || e?.message || fallback;
  $q.notify({ type: "negative", message: msg });
}

// onMounted: explicitly keep `loading` true while we load both types and project list
onMounted(async () => {
  // keep loading = true (set as default) so the UI shows immediately
  try {
    await loadTypes();
    // call fetchList in silent mode so we control the `loading` flag here
    await fetchList(true);
  } finally {
    // initial load finished — hide global loader
    loading.value = false;
  }
});
</script>
