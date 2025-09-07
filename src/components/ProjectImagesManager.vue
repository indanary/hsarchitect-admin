<!-- src/components/ProjectImagesManager.vue -->
<template>
  <q-dialog v-model="internalShow" persistent maximized>
    <q-card>
      <q-bar class="bg-grey-2">
        <div class="text-subtitle1">
          Images — Project #{{ projectId ?? "—" }}
        </div>
        <q-space />
        <q-btn flat dense icon="close" v-close-popup />
      </q-bar>

      <q-card-section class="q-pt-md">
        <div class="row q-col-gutter-md items-center">
          <div class="col-grow">
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="image/*"
              @change="uploadFiles"
            />
            <div class="text-caption text-grey-7 q-mt-xs">
              Select 1–10 images. They’ll upload immediately.
            </div>
          </div>
          <div class="col-auto">
            <q-btn
              outline
              icon="refresh"
              label="Refresh"
              :loading="loading"
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
                :src="img.file_path"
                :ratio="4 / 3"
                :alt="img.alt || 'image'"
              />
              <q-card-section class="q-gutter-sm">
                <q-input v-model="img.alt" dense outlined label="Alt text" />
                <q-input
                  v-model.number="img.sort_order"
                  dense
                  outlined
                  type="number"
                  label="Sort order"
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    dense
                    color="primary"
                    icon="save"
                    label="Save"
                    @click="saveImageMeta(img)"
                  />
                  <q-btn
                    dense
                    color="negative"
                    flat
                    icon="delete"
                    label="Delete"
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
  alt: string | null;
  sort_order: number;
};
type ProjectDetailWithImages = {
  images?: ProjectImage[];
};

const props = defineProps<{
  modelValue: boolean;
  projectId: number | null;
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
  const fd = new FormData();
  Array.from(input.files).forEach((f) => fd.append("files", f));
  try {
    await api.post(`/projects/admin/${props.projectId}/images`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    $q.notify({ type: "positive", message: "Uploaded" });
    input.value = "";
    await loadImages(); // reload → mapping keeps absolute URLs
    emit("changed");
  } catch (e: any) {
    notifyError(e, "Upload failed");
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
