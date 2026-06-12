import { createApp } from "vue";
import "./assets/style.css";
import App from "./App.vue";
import { router } from "@/router";
import { createPinia } from "pinia";
// @ts-ignore - Element Plus ESM subpath
import { ElLoading } from "element-plus/es/components/loading/index.mjs";
import "element-plus/es/components/loading/style/css.mjs";
import { registerEvent } from "@/events";
import { vOdometer } from "@/directives/odometer.ts";
import { vTileGlow } from "@/directives/tileGlow";
import { useThemeStore } from "@/store/theme";

const app = createApp(App);
const pinia = createPinia();

app.use(router);
app.use(pinia);
app.use(ElLoading);

useThemeStore(pinia).initTheme();

app.directive("odometer", vOdometer);
app.directive("tile-glow", vTileGlow);

app.mount("#app");

registerEvent();

//解决edge最小化问题(要放在引入router之后)
if (navigator.userAgent.includes("Edg/")) {
    window.history.replaceState = function (state, title, url) {
        return;
    };
}
