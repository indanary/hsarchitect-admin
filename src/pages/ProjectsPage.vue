<!-- src/pages/ProjectsPage.vue -->
<template>
  <q-page padding>
    <!-- Header / actions -->
    <div class="row items-center q-mb-md">
      <div class="text-h6">Projects</div>
      <q-space />
      <q-input
        v-model="q"
        dense
        outlined
        debounce="300"
        class="q-mr-sm"
        style="width: 260px"
        placeholder="Search title, location, scope…"
        @update:model-value="fetchList"
      >
        <template #prepend><q-icon name="search" /></template>
        <template #append>
          <q-btn
            v-if="q"
            flat
            round
            dense
            icon="close"
            @click="
              q = '';
              fetchList();
            "
          />
        </template>
      </q-input>

      <q-btn color="primary" icon="add" label="New" @click="openCreate" />
    </div>

    <!-- Table -->
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :loading="loading"
      :pagination="{ rowsPerPage: 0 }"
      no-data-label="No projects yet"
      no-results-label="No matches"
    >
      <template #body-cell-project_type="props">
        <q-td :props="props">
          <span>{{ typeLabel(props.row.project_type_id) }}</span>
        </q-td>
      </template>

      <template #body-cell-status="props">
        <q-td :props="props">
          <q-badge
            :color="props.row.status === 'published' ? 'positive' : 'grey-7'"
          >
            {{ props.row.status }}
          </q-badge>
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs">
          <q-btn
            dense
            flat
            round
            icon="image"
            @click="openImages(props.row.id)"
          />
          <q-btn dense flat round icon="edit" @click="openEdit(props.row.id)" />
          <q-btn
            dense
            flat
            round
            icon="delete"
            color="negative"
            @click="confirmDelete(props.row.id)"
          />
        </q-td>
      </template>
    </q-table>

    <!-- Editor (create/edit) -->
    <ProjectEditor
      v-model="editor.open"
      :mode="editor.mode"
      :project-id="editor.id"
      :type-options="typeOptions"
      @saved="onSaved"
    />

    <!-- Images manager (separate component) -->
    <ProjectImagesManager
      v-model="imagesOpen"
      :project-id="imagesProjectId"
      @changed="onImagesChanged"
    />

    <!-- Delete confirm -->
    <q-dialog v-model="confirm.open">
      <q-card>
        <q-card-section>
          <div class="text-h6">Delete this project?</div>
          <div class="text-body2 q-mt-xs">
            This will also remove its images.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
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
const loading = ref(false);
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

async function fetchList() {
  loading.value = true;
  try {
    const params: any = {};
    if (q.value) params.q = q.value;
    const { data } = await api.get<ProjectRow[]>("/projects/admin", { params });
    rows.value = data;
  } catch (e: any) {
    notifyError(e, "Failed to load projects");
  } finally {
    loading.value = false;
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
function openImages(projectId: number) {
  imagesProjectId.value = projectId;
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

onMounted(async () => {
  await loadTypes();
  await fetchList();
});
</script>
