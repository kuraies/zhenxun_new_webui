import { createApp } from "vue";
import "./assets/style.css";
import App from "./App.vue";
import { router } from "@/router";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

// @ts-ignore - Element Plus locale file
import zhCn from "element-plus/es/locale/lang/zh-cn";
import { registerEvent } from "@/events";
import { vOdometer } from "@/directives/odometer.ts";

const app = createApp(App);
const pinia = createPinia();

app.use(router);
app.use(pinia);
app.use(ElementPlus, { locale: zhCn });

app.directive("odometer", vOdometer);

app.mount("#app");

registerEvent();

//解决edge最小化问题(要放在引入router之后)
if (navigator.userAgent.includes("Edg/")) {
    window.history.replaceState = function (state, title, url) {
        return;
    };
}