<template>
  <q-dialog v-model="internalShow" persistent>
    <q-card style="min-width: 760px; max-width: 95vw">
      <!-- Header -->
      <q-card-section class="row items-center">
        <div class="text-h6 text-weight-bold">
          {{ mode === "create" ? "New Project" : "Edit Project" }}
        </div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <q-separator />

      <!-- FORM CONTENT -->
      <q-card-section
        style="max-height: 70vh; overflow-y: auto; position: relative"
      >
        <div class="column q-gutter-lg" :aria-busy="loading">
          <!-- SECTION: GENERAL INFO -->
          <div>
            <div class="text-subtitle2 text-grey-7 q-mb-sm">
              General Information
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-input
                  v-model="form.title"
                  label="Title *"
                  outlined
                  :disable="saving || loading"
                  :rules="[(v) => (!!v && v.trim().length > 0) || 'Required']"
                  autofocus
                />
              </div>

              <div class="col-6">
                <q-input
                  v-model="form.location"
                  label="Location"
                  outlined
                  :disable="saving || loading"
                />
              </div>

              <div class="col-6">
                <q-select
                  v-model="form.project_type_id"
                  :options="typeOptions"
                  option-value="id"
                  option-label="project_type"
                  emit-value
                  map-options
                  outlined
                  clearable
                  label="Project Type"
                  :disable="saving || loading"
                />
              </div>
            </div>
          </div>

          <!-- SECTION: DETAILS -->
          <div>
            <div class="text-subtitle2 text-grey-7 q-mb-sm">
              Project Details
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model="form.scope"
                  label="Scope"
                  outlined
                  :disable="saving || loading"
                />
              </div>

              <div class="col-3">
                <q-input
                  v-model.number="form.year"
                  type="number"
                  label="Year"
                  outlined
                  :disable="saving || loading"
                  min="1900"
                  max="2100"
                />
              </div>

              <div class="col-3">
                <q-input
                  v-model="form.status"
                  label="Status"
                  outlined
                  :disable="saving || loading"
                />
              </div>

              <div class="col-6">
                <q-input
                  v-model="form.area"
                  label="Area (e.g. 350 m²)"
                  outlined
                  :disable="saving || loading"
                />
              </div>
            </div>
          </div>

          <!-- SECTION: DESCRIPTION -->
          <div>
            <div class="text-subtitle2 text-grey-7 q-mb-sm">
              Description (HTML Content)
            </div>

            <q-editor
              v-model="form.description"
              min-height="200px"
              :readonly="saving || loading"
              :toolbar="[
                ['bold', 'italic', 'strike', 'underline'],
                ['quote', 'unordered', 'ordered', 'outdent', 'indent'],
                ['link', 'hr'],
                ['undo', 'redo'],
                ['removeFormat'],
              ]"
            />
          </div>
        </div>

        <!-- Overlay loading indicator -->
        <q-inner-loading :showing="loading">
          <q-spinner-dots size="40px" color="primary" />
        </q-inner-loading>
      </q-card-section>

      <q-separator />

      <!-- ACTIONS -->
      <q-card-actions align="right">
        <q-btn
          flat
          label="Cancel"
          :disable="saving || loading"
          @click="close"
        />
        <q-btn
          color="primary"
          :loading="saving"
          :disable="loading"
          :label="mode === 'create' ? 'Create Project' : 'Save Changes'"
          @click="save"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useQuasar } from "quasar";
import { api } from "src/boot/axios";

type ProjectDetail = {
  id: number;
  title: string;
  location: string | null;
  description: string | null;
  project_type_id: number | null;
  scope: string | null;
  year: number | null;
  status: string;
  area: string | null;
};

type ProjectType = { id: number; project_type: string };

const props = defineProps<{
  modelValue: boolean;
  mode: "create" | "edit";
  projectId: number | null;
  typeOptions: ProjectType[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "saved", id: number): void;
}>();

const $q = useQuasar();

const internalShow = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

/* FORM DATA */
const form = reactive<ProjectDetail>({
  id: 0,
  title: "",
  location: "",
  description: "",
  project_type_id: null,
  scope: "",
  year: null,
  status: "",
  area: "",
});

const saving = ref(false);
const loading = ref(false);

/* UTIL */
function coerceDetail(d: Partial<ProjectDetail>) {
  form.id = (d.id as number) ?? 0;
  form.title = (d.title ?? "") as string;
  form.location = (d.location ?? "") as string;
  form.description = (d.description ?? "") as string;
  form.project_type_id = (d.project_type_id ?? null) as number | null;
  form.scope = (d.scope ?? "") as string;
  form.year = Number.isFinite(d.year as any) ? (d.year as number) : null;
  form.status = (d.status ?? "") as string;
  form.area = (d.area ?? "") as string;
}

/* LOAD DATA WHEN EDITING */
async function loadForEdit() {
  if (!props.projectId) return;
  loading.value = true;
  try {
    const { data } = await api.get<ProjectDetail>(
      `/projects/admin/${props.projectId}`
    );
    coerceDetail(data);
  } catch (e: any) {
    notifyError(e, "Failed to load project");
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  coerceDetail({});
}

function close() {
  internalShow.value = false;
}

async function save() {
  if (!form.title?.trim()) {
    $q.notify({ type: "warning", message: "Title is required" });
    return;
  }

  if (!form.project_type_id) {
    $q.notify({ type: "warning", message: "Project type is required" });
    return;
  }

  saving.value = true;
  try {
    if (props.mode === "create") {
      const { data } = await api.post<{ id: number }>("/projects/admin", {
        title: form.title,
        location: form.location || null,
        description: form.description || "",
        project_type_id: form.project_type_id,
        scope: form.scope || null,
        year: form.year ?? null,
        status: form.status,
        area: form.area || null,
      });
      emit("saved", data.id);
    } else {
      await api.patch(`/projects/admin/${props.projectId}`, {
        title: form.title,
        location: form.location || null,
        description: form.description || "",
        project_type_id: form.project_type_id,
        scope: form.scope || null,
        year: form.year ?? null,
        status: form.status,
        area: form.area || null,
      });
      emit("saved", props.projectId as number);
    }
    close();
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

/* WATCH DIALOG OPENING */
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    if (props.mode === "edit" && props.projectId) {
      await loadForEdit();
    } else {
      resetForm();
    }
  }
);
</script>
