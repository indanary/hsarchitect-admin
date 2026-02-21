<template>
  <q-page padding class="column q-gutter-lg">
    <div class="q-pa-sm bg-yellow-2 text-yellow-9 rounded-borders text-body2">
      ⚠️ Updates may take a few minutes to appear on
      <strong>hsarchitect.id</strong>
    </div>

    <div class="row items-center justify-between">
      <div>
        <div class="text-h5 text-weight-bold">Studio Content</div>
        <div class="text-caption text-grey-7">
          Manage profile, philosophy, and achievements
        </div>
      </div>

      <q-btn
        color="primary"
        icon="save"
        :loading="saving"
        label="Save Changes"
        @click="save"
      />
    </div>

    <q-linear-progress v-if="loading" indeterminate />

    <q-card flat bordered>
      <q-tabs v-model="tab" dense>
        <q-tab name="profile" label="Profile" />
        <q-tab name="philosophy" label="Philosophy" />
        <q-tab name="achievement" label="Achievement" />
      </q-tabs>
    </q-card>

    <!-- EDITOR -->
    <q-card flat bordered>
      <q-card-section>
        <ckeditor
          :editor="editor"
          v-model="form.description"
          :config="editorConfig"
        />
      </q-card-section>
    </q-card>

    <!-- PREVIEW -->
    <q-card flat bordered>
      <q-card-section>
        <div class="ck-content" v-html="form.description" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useQuasar } from "quasar";
import { api } from "src/boot/axios";
import { Ckeditor } from "@ckeditor/ckeditor5-vue";

import "ckeditor5/ckeditor5.css";

// ✅ CKEditor 5 (same as your working project)
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Image,
  ImageToolbar,
  ImageUpload,
  ImageStyle,
  ImageResize,
  ImageResizeEditing,
  ImageResizeHandles,
  Link,
  List,
} from "ckeditor5";

const ckeditor = Ckeditor;
const editor = ClassicEditor;

const $q = useQuasar();

type StudioType = "profile" | "philosophy" | "achievement";

const tab = ref<StudioType>("profile");
const form = ref({ description: "" });

const loading = ref(true);
const saving = ref(false);

// ================= UPLOAD =================
function uploadAdapterPlugin(editor: any) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader: any) => {
    return {
      async upload() {
        const file = await loader.file;

        const fd = new FormData();
        fd.append("files", file);

        const res = await api.post("/studio-media/upload", fd);
        const url = res?.data?.data?.[0]?.url;

        if (!url) throw new Error("Upload failed");

        return { default: url };
      },
    };
  };

  // 👇 THIS PART FIXES THE SIZE AFTER INSERT
  editor.model.document.on("change:data", () => {
    const model = editor.model;
    const root = model.document.getRoot();

    model.change((writer: any) => {
      for (const child of root.getChildren()) {
        if (child.name === "imageBlock" && !child.getAttribute("width")) {
          writer.setAttribute("width", "50%", child);
        }
      }
    });
  });
}

// ================= CONFIG =================
const editorConfig = {
  licenseKey: "GPL",
  plugins: [
    Essentials,
    Paragraph,
    Bold,
    Italic,
    Link,
    List,
    Image,
    ImageToolbar,
    ImageUpload,
    ImageStyle,
    ImageResize,
    ImageResizeEditing,
    ImageResizeHandles,
  ],

  toolbar: [
    "undo",
    "redo",
    "|",
    "bold",
    "italic",
    "link",
    "bulletedList",
    "numberedList",
    "|",
    "imageUpload",
  ],

  image: {
    toolbar: [
      "imageStyle:inline",
      "imageStyle:alignLeft",
      "imageStyle:alignCenter",
      "imageStyle:alignRight",
      "|",
      "resizeImage:25",
      "resizeImage:50",
      "resizeImage:75",
      "resizeImage:original",
    ],
  },

  extraPlugins: [uploadAdapterPlugin],
};

// ================= API =================
async function loadStudio(t: StudioType) {
  loading.value = true;
  try {
    const { data } = await api.get(`/studio/${t}`);
    form.value.description = data?.data?.description || "";
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
  } catch {
    $q.notify({ type: "negative", message: "Error" });
  } finally {
    saving.value = false;
  }
}

watch(tab, (t) => loadStudio(t), { immediate: true });
</script>

<style lang="scss">
.ck-content {
  min-height: 300px;
}

.ck-content img {
  max-width: 100%;
  height: auto;
}

.ck-content .image {
  max-width: 100%;
}

.ck-content .image img {
  max-width: 100%;
  height: auto;
}
</style>
