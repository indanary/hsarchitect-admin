import { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";

import { Essentials } from "@ckeditor/ckeditor5-essentials";
import { Paragraph } from "@ckeditor/ckeditor5-paragraph";
import { Heading } from "@ckeditor/ckeditor5-heading";
import { Bold, Italic, Underline } from "@ckeditor/ckeditor5-basic-styles";
import { Link } from "@ckeditor/ckeditor5-link";
import { List } from "@ckeditor/ckeditor5-list";
import { BlockQuote } from "@ckeditor/ckeditor5-block-quote";

import {
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
} from "@ckeditor/ckeditor5-image";

import { FileRepository } from "@ckeditor/ckeditor5-upload";

export default class MyEditor extends ClassicEditor {}

MyEditor.builtinPlugins = [
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  BlockQuote,

  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,

  FileRepository,
];

MyEditor.defaultConfig = {
  toolbar: {
    items: [
      "heading",
      "|",
      "bold",
      "italic",
      "underline",
      "link",
      "bulletedList",
      "numberedList",
      "|",
      "imageUpload",
      "|",
      "undo",
      "redo",
    ],
  },

  image: {
    toolbar: [
      "imageTextAlternative",
      "toggleImageCaption",
      "imageStyle:inline",
      "imageStyle:block",
      "imageStyle:side",
      "|",
      "resizeImage:25",
      "resizeImage:50",
      "resizeImage:75",
      "resizeImage:original",
    ],
    resizeOptions: [
      { name: "resizeImage:original", label: "Original", value: null },
      { name: "resizeImage:25", label: "25%", value: "25" },
      { name: "resizeImage:50", label: "50%", value: "50" },
      { name: "resizeImage:75", label: "75%", value: "75" },
    ],
  },

  language: "en",
};
