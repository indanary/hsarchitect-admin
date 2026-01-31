<!-- src/components/ProjectImagesManager.vue -->
<template>
  <q-dialog v-model="internalShow" persistent maximized>
    <q-card>
      <q-bar class="bg-grey-2">
        <div class="text-subtitle1">
          Media — Project {{ projectTitle ?? "—" }}
        </div>
        <q-space />
        <q-btn flat dense icon="close" v-close-popup :disable="uploading" />
      </q-bar>

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
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="image/*,video/mp4"
              class="hidden"
              :disabled="isBusy"
              @change="uploadFiles"
            />

            <q-btn
              color="primary"
              icon="upload"
              label="Select media"
              unelevated
              :disable="isBusy"
              @click="openFilePicker"
            />

            <div class="text-caption text-grey-7 q-mt-xs">
              <div>Max <b>3</b> files per upload</div>
              <div class="q-mt-xs">
                <b>Images:</b> auto-resized, max 20 MB<br />
                <b>Videos:</b> MP4, max 20 MB
              </div>
            </div>
          </div>

          <div class="col-auto">
            <q-btn
              outline
              icon="refresh"
              label="Refresh"
              :loading="loading"
              :disable="uploading"
              @click="loadMedia"
            />
          </div>
        </div>

        <q-separator class="q-my-md" />

        <!-- Media grid -->
        <div class="relative-position">
          <div class="row q-col-gutter-md">
            <div
              v-for="item in items"
              :key="`${item.__source}-${item.id}`"
              class="col-12 col-sm-6 col-md-4 col-lg-3"
            >
              <q-card bordered>
                <!-- IMAGE -->
                <q-img
                  v-if="item.type === 'image'"
                  :src="item.file_url"
                  :ratio="4 / 3"
                />

                <!-- VIDEO -->
                <div v-else class="bg-black">
                  <video
                    :src="item.file_url"
                    :poster="item.thumb_url || undefined"
                    controls
                    muted
                    preload="metadata"
                    style="width: 100%"
                  />
                </div>

                <q-card-section class="q-gutter-sm">
                  <q-input
                    v-model="item.alt"
                    dense
                    outlined
                    label="Alt text"
                    :disable="isBusy"
                  />

                  <q-input
                    v-model.number="item.sort_order"
                    dense
                    outlined
                    type="number"
                    label="Sort order"
                    :disable="isBusy"
                  />

                  <div class="row q-gutter-sm">
                    <q-btn
                      dense
                      color="primary"
                      icon="save"
                      label="Save"
                      :disable="isBusy"
                      @click="saveItem(item)"
                    />
                    <q-btn
                      dense
                      color="negative"
                      flat
                      icon="delete"
                      label="Delete"
                      :disable="isBusy"
                      @click="deleteItem(item)"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div v-if="!loading && items.length === 0" class="col-12">
              <q-banner dense class="bg-grey-2">
                No media yet. Upload images or videos.
              </q-banner>
            </div>
          </div>

          <q-inner-loading :showing="loading">
            <q-spinner-dots size="40px" />
          </q-inner-loading>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useQuasar } from "quasar";
import { api } from "src/boot/axios";

type Item = {
  id: number;
  type: "image" | "video";
  file_url: string;
  thumb_url?: string | null;
  sort_order: number;
  alt?: string | null;
  __source: "media" | "image";
};

const props = defineProps<{
  modelValue: boolean;
  projectId: number | null;
  projectTitle: string | null;
}>();

const emit = defineEmits(["update:modelValue", "changed"]);
const $q = useQuasar();

const internalShow = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const items = ref<Item[]>([]);
const loading = ref(false);
const uploading = ref(false);
const fileInput = ref<HTMLInputElement>();
const isBusy = computed(() => loading.value || uploading.value);

async function loadMedia() {
  if (!props.projectId) return;
  loading.value = true;

  try {
    const { data } = await api.get(`/projects/admin/${props.projectId}`);

    if (data.media?.length) {
      items.value = data.media.map((m: any) => ({
        ...m,
        __source: "media",
        alt: m.alt ?? "",
      }));
    } else {
      items.value = (data.images || []).map((img: any) => ({
        id: img.id,
        type: "image",
        file_url: img.file_url,
        thumb_url: img.thumb_url,
        sort_order: img.sort_order,
        alt: img.alt ?? "",
        __source: "image",
      }));
    }
  } finally {
    loading.value = false;
  }
}

function openFilePicker() {
  fileInput.value?.click();
}

async function uploadFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  if (!props.projectId || !files.length) return;

  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));

  uploading.value = true;
  try {
    await api.post(`/projects/admin/${props.projectId}/media`, fd);
    await loadMedia();
    emit("changed");
  } finally {
    uploading.value = false;
  }
}

async function saveItem(item: Item) {
  const base =
    item.__source === "media"
      ? `/projects/admin/${props.projectId}/media/${item.id}`
      : `/projects/admin/${props.projectId}/images/${item.id}`;

  await api.patch(base, {
    alt: item.alt?.trim() || null,
    sort_order: item.sort_order || 0,
  });

  $q.notify({ type: "positive", message: "Saved" });
  await loadMedia();
}

async function deleteItem(item: Item) {
  const base =
    item.__source === "media"
      ? `/projects/admin/${props.projectId}/media/${item.id}`
      : `/projects/admin/${props.projectId}/images/${item.id}`;

  await api.delete(base);
  $q.notify({ type: "positive", message: "Deleted" });
  await loadMedia();
}

watch(
  () => props.modelValue,
  (v) => v && loadMedia()
);
</script>
