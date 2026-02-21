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
  Underline,
  Heading,
  Font,
  Alignment,
  BlockQuote,
  List,
  Image,
  ImageBlock,
  ImageToolbar,
  ImageUpload,
  ImageStyle,
  ImageResize,
  ImageResizeEditing,
  ImageResizeHandles,
} from "ckeditor5";

const ckeditor = Ckeditor;
const editor = ClassicEditor;

const $q = useQuasar();

type StudioType = "profile" | "philosophy" | "achievement";

const tab = ref<StudioType>("profile");
const form = ref({ description: "" });

const loading = ref(true);
const saving = ref(false);

function dataWidthConversionPlugin(editor: any) {
  const schema = editor.model.schema;

  const imageTypes = ["imageBlock", "imageInline"];

  imageTypes.forEach((type) => {
    if (schema.isRegistered(type)) {
      // ✅ extend only if exists
      schema.extend(type, {
        allowAttributes: ["dataWidth"],
      });

      editor.conversion.for("downcast").add((dispatcher: any) => {
        dispatcher.on(
          `attribute:dataWidth:${type}`,
          (evt: any, data: any, conversionApi: any) => {
            const viewWriter = conversionApi.writer;
            const viewElement = conversionApi.mapper.toViewElement(data.item);

            if (!viewElement) return;

            const value = data.attributeNewValue;
            if (!value) return;

            viewWriter.setAttribute("data-width", value, viewElement);
          }
        );
      });
    }
  });
}

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

  editor.model.document.on("change:data", () => {
    const model = editor.model;
    const root = model.document.getRoot();

    model.change((writer: any) => {
      for (const child of root.getChildren()) {
        if (child.name === "imageBlock") {
          const width = child.getAttribute("width");

          if (!width) continue;

          if (typeof width === "string" && width.includes("%")) {
            const percent = parseFloat(width);
            const containerWidth = 700;

            const px = Math.round((percent / 100) * containerWidth);

            // ✅ store px
            writer.setAttribute("dataWidth", px, child);
          }
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
    Heading,
    Bold,
    Italic,
    Underline,
    Font,
    Alignment,
    BlockQuote,
    List,
    Image,
    ImageBlock,
    ImageToolbar,
    ImageUpload,
    ImageStyle,
    ImageResize,
    ImageResizeEditing,
    ImageResizeHandles,

    dataWidthConversionPlugin,
  ],

  toolbar: [
    "undo",
    "redo",
    "|",

    "heading",
    "|",

    "fontSize",
    "|",

    "bold",
    "italic",
    "underline",
    "|",

    "alignment",
    "|",

    "bulletedList",
    "numberedList",
    "blockQuote",
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

  fontSize: {
    options: [10, 12, 14, "default", 18, 20, 24, 28, 32],
    supportAllValues: true,
  },
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
  line-height: 1.7;
}

/* Paragraph spacing */
.ck-content p {
  margin: 0 0 1rem;
}

/* Headings */
.ck-content h1,
.ck-content h2,
.ck-content h3 {
  margin: 1.5rem 0 0.75rem;
  font-weight: 600;
}

/* Lists */
.ck-content ul,
.ck-content ol {
  margin: 0 0 1rem 1.25rem;
}

/* Blockquote */
.ck-content blockquote {
  border-left: 3px solid #ccc;
  padding-left: 1rem;
  margin: 1rem 0;
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
