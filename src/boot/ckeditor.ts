import { defineBoot } from "#q-app/wrappers";
import { CkeditorPlugin } from "@ckeditor/ckeditor5-vue";

export default defineBoot(({ app }) => {
  app.use(CkeditorPlugin);
});
