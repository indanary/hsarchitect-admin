<!-- src/components/ProjectImagesManager.vue -->
<template>
  <q-dialog v-model="internalShow" persistent maximized>
    <q-card>
      <q-bar class="bg-grey-2">
        <div class="text-subtitle1">
          Images — Project {{ projectTitle ?? "—" }}
        </div>
        <q-space />
        <q-btn flat dense icon="close" v-close-popup :disable="uploading" />
      </q-bar>

      <!-- Upload progress -->
      <q-linear-progress
        v-if="uploading"
        indeterminate
        color="primary"
        class="q-mb-none"
      />

      <q-card-section class="q-pt-md">
        <div class="row q-col-gutter-md items-center">
          <div class="col-grow">
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="image/*"
              :disabled="loading || uploading"
              @change="uploadFiles"
            />
            <div class="text-caption text-grey-7 q-mt-xs">
              Select up to <b>3</b> images. They’ll upload immediately.
            </div>
          </div>
          <div class="col-auto row items-center q-gutter-sm">
            <div v-if="uploading" class="row items-center q-gutter-xs">
              <q-spinner size="sm" />
              <span class="text-caption">Uploading…</span>
            </div>
            <q-btn
              outline
              icon="refresh"
              label="Refresh"
              :loading="loading"
              :disable="uploading"
              @click="loadImages"
            />
          </div>
        </div>

        <q-separator class="q-my-md" />

        <div class="row q-col-gutter-md">
          <div class="col-12" v-if="loading">
            <q-spinner size="md" />
          </div>

          <div
            v-for="img in items"
            :key="img.id"
            class="col-12 col-sm-6 col-md-4 col-lg-3"
          >
            <q-card bordered>
              <q-img
                :src="img.file_url"
                :ratio="4 / 3"
                :alt="img.alt || 'image'"
              />
              <q-card-section class="q-gutter-sm">
                <q-input
                  v-model="img.alt"
                  dense
                  outlined
                  label="Alt text"
                  :disable="uploading || loading"
                />
                <q-input
                  v-model.number="img.sort_order"
                  dense
                  outlined
                  type="number"
                  label="Sort order"
                  :disable="uploading || loading"
                  :min="1"
                  @update:model-value="(val) => enforcePositiveSort(img, val)"
                />

                <div class="row q-gutter-sm">
                  <q-btn
                    dense
                    color="primary"
                    icon="save"
                    label="Save"
                    :disable="uploading || loading"
                    @click="saveImageMeta(img)"
                  />
                  <q-btn
                    dense
                    color="negative"
                    flat
                    icon="delete"
                    label="Delete"
                    :disable="uploading || loading"
                    @click="deleteImage(img)"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div v-if="!loading && items.length === 0" class="col-12">
            <q-banner dense class="bg-grey-2">
              No images yet. Use the file picker above to upload.
            </q-banner>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuasar } from "quasar";
import { api } from "src/boot/axios";

type ProjectImage = {
  id: number;
  file_path: string; // will be absolute after mapping
  file_url: string;
  alt: string | null;
  sort_order: number;
};
type ProjectDetailWithImages = {
  images?: ProjectImage[];
};

const props = defineProps<{
  modelValue: boolean;
  projectId: number | null;
  projectTitle: string | null;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "changed"): void; // emit after upload/save/delete
}>();

const $q = useQuasar();

const internalShow = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const loading = ref(false);
const uploading = ref(false); // NEW: uploading state
const items = ref<ProjectImage[]>([]);
const fileInput = ref<HTMLInputElement>();

/** === Option A: prefix relative paths with API base === */
const API_BASE = (import.meta.env.VITE_API_BASE as string) || "";
function toAbsUrl(p?: string | null) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return `${API_BASE.replace(/\/$/, "")}${p}`;
}

async function loadImages() {
  if (!props.projectId) return;
  loading.value = true;
  try {
    const { data } = await api.get<ProjectDetailWithImages>(
      `/projects/admin/${props.projectId}`
    );
    items.value = (data.images || []).map((x: any) => ({
      ...x,
      file_path: toAbsUrl(x.file_path), // <-- make absolute here
      file_url: x.file_url,
      alt: x.alt ?? "",
    }));
  } catch (e: any) {
    notifyError(e, "Failed to load images");
  } finally {
    loading.value = false;
  }
}

async function uploadFiles(ev: Event) {
  const input = ev.target as HTMLInputElement;
  if (!input.files || !props.projectId) return;

  // Enforce max 3 files per selection
  const files = Array.from(input.files);
  if (files.length > 3) {
    $q.notify({
      type: "warning",
      message: "You can upload at most 3 images at a time.",
    });
    input.value = ""; // reset selection
    return;
  }

  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));

  try {
    uploading.value = true; // start uploading state
    await api.post(`/projects/admin/${props.projectId}/images`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    $q.notify({ type: "positive", message: "Uploaded" });
    input.value = "";
    await loadImages(); // reload → mapping keeps absolute URLs
    emit("changed");
  } catch (e: any) {
    notifyError(e, "Upload failed");
  } finally {
    uploading.value = false; // stop uploading state
  }
}

async function saveImageMeta(img: ProjectImage) {
  if (!props.projectId) return;
  try {
    await api.patch(`/projects/admin/${props.projectId}/images/${img.id}`, {
      alt: (img.alt ?? "") || null,
      sort_order: Number.isFinite(img.sort_order) ? img.sort_order : 0,
    });
    $q.notify({ type: "positive", message: "Saved" });
    await loadImages();
    emit("changed");
  } catch (e: any) {
    notifyError(e, "Failed to save meta");
  }
}

async function deleteImage(img: ProjectImage) {
  if (!props.projectId) return;
  try {
    await api.delete(`/projects/admin/${props.projectId}/images/${img.id}`);
    $q.notify({ type: "positive", message: "Deleted" });
    await loadImages();
    emit("changed");
  } catch (e: any) {
    notifyError(e, "Failed to delete image");
  }
}

function notifyError(e: any, fallback = "Error") {
  const msg = e?.response?.data?.error || e?.message || fallback;
  $q.notify({ type: "negative", message: msg });
}

function enforcePositiveSort(img: ProjectImage, val: number | string) {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 1) {
    img.sort_order = 1;
    $q.notify({
      type: "warning",
      message: "Sort order must be at least 1.",
    });
  } else {
    img.sort_order = num;
  }
}

/* When dialog opens, load images */
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await loadImages();
    } else {
      // Optional: clear local state when closing
      items.value = [];
      if (fileInput.value) fileInput.value.value = "";
    }
  }
);
</script>
