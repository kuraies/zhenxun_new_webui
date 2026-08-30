/**
 * OneBot 调试客户端独立入口
 *
 * 不依赖主站的 router / pinia / element-plus，
 * 只挂载一个全屏页面：登录页 + OneBot 模拟客户端。
 */
import { createApp } from "vue";
import "@/assets/style.css";
import {
    applyTheme,
    applyThemePreset,
    generateThemeFromColors,
    getThemePresets,
    type ThemePresetName,
} from "@/theme";
import App from "./App.vue";

// ==================== 跟随主站主题 ====================
// 与主站共用 localStorage 的同一组主题 key（zhenxun-theme / zhenxun-custom-color），
// 读取逻辑与主站 store/theme.ts 的 initTheme 一致：
// 自定义主色 > 主题预设 > 默认亮色
const THEME_STORAGE_KEY = "zhenxun-theme";
const CUSTOM_COLOR_KEY = "zhenxun-custom-color";

const applySharedTheme = () => {
    const storedColor = localStorage.getItem(CUSTOM_COLOR_KEY);
    if (storedColor) {
        try {
            const { primary, mode } = JSON.parse(storedColor) as {
                primary: string;
                mode: "light" | "dark";
            };
            applyTheme(generateThemeFromColors(primary, mode));
            return;
        } catch {
            localStorage.removeItem(CUSTOM_COLOR_KEY);
        }
    }

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme && storedTheme in getThemePresets()) {
        applyThemePreset(storedTheme as ThemePresetName);
        return;
    }

    applyThemePreset("zhenxun-light");
};

applySharedTheme();

// 主站窗口里换主题时本窗口实时跟随（storage 事件只在其他窗口触发，
// 正好对应"主站改、调试端跟"的场景）
window.addEventListener("storage", event => {
    if (
        event.key === THEME_STORAGE_KEY ||
        event.key === CUSTOM_COLOR_KEY ||
        event.key === null
    ) {
        applySharedTheme();
    }
});

createApp(App).mount("#app");

// 生产环境注册 Service Worker（dev 下不注册，避免缓存干扰调试）。
// 独立构建的 base 为 /next/debug/，SW 与页面同目录
if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register(`${import.meta.env.BASE_URL}sw.js`)
            .catch(err => console.warn("Service Worker 注册失败:", err));
    });
}
