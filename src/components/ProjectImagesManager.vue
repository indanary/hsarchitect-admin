<!-- src/components/ProjectImagesManager.vue -->
<template>
  <q-dialog v-model="internalShow" persistent maximized>
    <q-card>
      <!-- Top bar -->
      <q-bar class="bg-grey-2">
        <div class="text-subtitle1">
          Images — Project {{ projectTitle ?? "—" }}
        </div>
        <q-space />
        <q-btn flat dense icon="close" v-close-popup :disable="uploading" />
      </q-bar>

      <!-- Upload progress bar -->
      <q-linear-progress
        v-if="uploading"
        indeterminate
        color="primary"
        class="q-mb-none"
      />

      <q-card-section class="q-pt-md">
        <!-- Upload controls -->
        <div class="row q-col-gutter-md items-center">
          <div class="col-grow">
            <!-- Hidden native input -->
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="image/*"
              :disabled="isBusy"
              class="hidden"
              @change="uploadFiles"
            />

            <q-btn
              color="primary"
              icon="upload"
              label="Select images"
              unelevated
              :disable="isBusy"
              @click="openFilePicker"
            />

            <div class="text-caption text-grey-7 q-mt-xs">
              <div>
                You can upload up to <b>3</b> images at a time. Images upload
                immediately after selection.
              </div>
              <div class="q-mt-xs">
                <b>Recommended:</b> landscape images around
                <b>1600 × 900 px</b> (min width 1200 px), max
                <b>20&nbsp;MB</b> per file. Larger files will be automatically
                resized before upload.
              </div>
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

        <!-- Images grid -->
        <div class="relative-position">
          <div class="row q-col-gutter-md">
            <div
              v-for="img in items"
              :key="img.id"
              class="col-12 col-sm-6 col-md-4 col-lg-3"
            >
              <q-card bordered>
                <q-img
                  :src="img.file_url || img.file_path"
                  :ratio="4 / 3"
                  :alt="img.alt || 'image'"
                  spinner-color="primary"
                />

                <q-card-section class="q-gutter-sm">
                  <q-input
                    v-model="img.alt"
                    dense
                    outlined
                    label="Alt text"
                    :disable="isBusy"
                  />

                  <q-input
                    v-model.number="img.sort_order"
                    dense
                    outlined
                    type="number"
                    label="Sort order"
                    :min="1"
                    :disable="isBusy"
                    @update:model-value="(val) => enforcePositiveSort(img, val)"
                  />

                  <div class="row q-gutter-sm q-mt-xs">
                    <q-btn
                      dense
                      color="primary"
                      icon="save"
                      label="Save"
                      :disable="isBusy"
                      @click="saveImageMeta(img)"
                    />
                    <q-btn
                      dense
                      color="negative"
                      flat
                      icon="delete"
                      label="Delete"
                      :disable="isBusy"
                      @click="deleteImage(img)"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Empty state -->
            <div v-if="!loading && items.length === 0" class="col-12">
              <q-banner dense class="bg-grey-2">
                No images yet. Use the “Select images” button above to upload.
              </q-banner>
            </div>
          </div>

          <!-- Overlay loader for grid -->
          <q-inner-loading :showing="loading">
            <q-spinner-dots size="40px" color="primary" />
          </q-inner-loading>
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
const uploading = ref(false);
const items = ref<ProjectImage[]>([]);
const fileInput = ref<HTMLInputElement>();

const isBusy = computed(() => loading.value || uploading.value);

/** API base for path -> absolute URL */
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
      file_path: toAbsUrl(x.file_path),
      file_url: x.file_url || toAbsUrl(x.file_path),
      alt: x.alt ?? "",
    }));
  } catch (e: any) {
    notifyError(e, "Failed to load images");
  } finally {
    loading.value = false;
  }
}

function openFilePicker() {
  if (fileInput.value && !isBusy.value) {
    fileInput.value.click();
  }
}

async function uploadFiles(ev: Event) {
  const input = ev.target as HTMLInputElement;
  if (!input.files || !props.projectId) return;

  const files = Array.from(input.files);

  // 1) Enforce max 3 files per selection
  if (files.length > 3) {
    $q.notify({
      type: "warning",
      message: "You can upload at most 3 images at a time.",
    });
    input.value = "";
    return;
  }

  // 2) Enforce max file size (20 MB per file, hard cap)
  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
  const oversized = files.filter((f) => f.size > MAX_SIZE);
  if (oversized.length > 0) {
    $q.notify({
      type: "negative",
      message: `Each file must be smaller than 20 MB. (${oversized
        .map((f) => f.name)
        .join(", ")})`,
    });
    input.value = "";
    return;
  }

  // 3) Downscale big images before upload
  const processedFiles = await Promise.all(
    files.map((f) => downscaleImageIfNeeded(f))
  );

  const fd = new FormData();
  processedFiles.forEach((f) => fd.append("files", f));

  try {
    uploading.value = true;
    await api.post(`/projects/admin/${props.projectId}/images`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    $q.notify({ type: "positive", message: "Uploaded" });
    input.value = "";
    await loadImages();
    emit("changed");
  } catch (e: any) {
    notifyError(e, "Upload failed");
  } finally {
    uploading.value = false;
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

const MAX_UPLOAD_WIDTH = 2000; // px
const TARGET_QUALITY = 0.8; // 0–1, for JPEG

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = reader.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Downscale large images on client before uploading
async function downscaleImageIfNeeded(file: File): Promise<File> {
  // Small file? Just send original.
  if (file.size < 5 * 1024 * 1024) {
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await loadImageFromFile(file);
  } catch {
    // If decoding fails, fallback to original
    return file;
  }

  const { width, height } = img;

  // Already small enough? Use original.
  if (width <= MAX_UPLOAD_WIDTH) {
    return file;
  }

  const scale = MAX_UPLOAD_WIDTH / width;
  const targetWidth = MAX_UPLOAD_WIDTH;
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return file;
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", TARGET_QUALITY)
  );

  if (!blob) {
    return file;
  }

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/* When dialog opens, load images */
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await loadImages();
    } else {
      items.value = [];
      if (fileInput.value) fileInput.value.value = "";
    }
  }
);
</script>
