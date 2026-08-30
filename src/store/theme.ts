import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
    applyTheme,
    applyThemePreset,
    defaultTheme,
    generateThemeFromColors,
    getThemePresets,
    type AppTheme,
    type ThemePresetName,
} from "@/theme";
import { themeApi, type ThemeConfig } from "@/utils/api-next";

const THEME_STORAGE_KEY = "zhenxun-theme";
const CUSTOM_COLOR_KEY = "zhenxun-custom-color";
// 多端统一是每台设备自己的开关，存本地而非云端
const SYNC_ENABLED_KEY = "zhenxun-theme-sync";

const systemDarkQuery =
    typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

const isThemePresetName = (value: string): value is ThemePresetName =>
    value in getThemePresets();

export const useThemeStore = defineStore("theme", () => {
    const activeThemeName = ref<ThemePresetName>(defaultTheme.name);
    const customTheme = ref<AppTheme | null>(null);
    const customColor = ref<string | null>(null);
    // light | dark | system（system = 跟随系统，实际模式由系统偏好解析）
    const customMode = ref<"light" | "dark" | "system">("light");
    // 多端统一：开启后应用云端主题并跟随 theme_update 事件（设备本地开关）
    const syncEnabled = ref(
        typeof window !== "undefined" &&
            localStorage.getItem(SYNC_ENABLED_KEY) === "true",
    );
    const systemDark = ref(systemDarkQuery?.matches ?? false);

    // 实际生效的模式（跟随系统时由系统偏好决定）
    const effectiveMode = computed<"light" | "dark">(() =>
        customMode.value === "system"
            ? systemDark.value
                ? "dark"
                : "light"
            : customMode.value,
    );

    const presets = computed(() => getThemePresets());
    const activeTheme = computed(
        () => customTheme.value || presets.value[activeThemeName.value],
    );

    // 跟随系统：系统深浅切换时实时重应用当前自定义色
    systemDarkQuery?.addEventListener("change", (e) => {
        systemDark.value = e.matches;
        if (customMode.value === "system" && customColor.value) {
            applyCustomColorTheme(customColor.value, "system", true);
        }
    });

    function setTheme(name: ThemePresetName) {
        customTheme.value = null;
        customColor.value = null;
        activeThemeName.value = name;
        applyThemePreset(name);
        // 同步模式：预设自带深浅（当前仅 zhenxun-dark 为深色），
        // effectiveMode 依赖它，不同步会导致深色预设下仍按浅色计算
        customMode.value = name === "zhenxun-dark" ? "dark" : "light";
        localStorage.setItem(THEME_STORAGE_KEY, name);
        localStorage.removeItem(CUSTOM_COLOR_KEY);
    }

    function setCustomTheme(theme: AppTheme) {
        customTheme.value = theme;
        applyTheme(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme.name);
    }

    function applyCustomColorTheme(
        primary: string,
        mode: "light" | "dark" | "system" = "light",
        skipWrite = false,
    ) {
        const resolved =
            mode === "system"
                ? systemDark.value
                    ? "dark"
                    : "light"
                : mode;
        const theme = generateThemeFromColors(primary, resolved);
        customColor.value = primary;
        customMode.value = mode;
        setCustomTheme(theme);
        if (!skipWrite) {
            localStorage.setItem(
                CUSTOM_COLOR_KEY,
                JSON.stringify({ primary, mode }),
            );
        }
    }

    function resetTheme() {
        setTheme(defaultTheme.name);
    }

    function forceApplyLight() {
        setTheme("zhenxun-light");
    }

    function restoreSavedTheme() {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme && isThemePresetName(storedTheme)) {
            applyThemePreset(storedTheme);
        } else {
            applyThemePreset(defaultTheme.name);
        }
    }

    function toggleTheme() {
        setTheme(
            activeThemeName.value === "zhenxun-dark"
                ? "zhenxun-light"
                : "zhenxun-dark",
        );
    }

    /** 当前主题状态 → 云端配置结构 */
    function buildThemeConfig(): ThemeConfig {
        return {
            source: customColor.value ? "custom" : "preset",
            preset: activeThemeName.value,
            primary: customColor.value ?? "#6366f1",
            mode: customMode.value,
        };
    }

    /** 应用一份云端主题配置 */
    function applyThemeConfig(config: ThemeConfig) {
        if (config.source === "custom") {
            applyCustomColorTheme(config.primary, config.mode);
        } else if (isThemePresetName(config.preset)) {
            setTheme(config.preset);
            customMode.value = config.mode;
        }
    }

    /** 收到 theme_update 广播：本端开启了多端统一才跟随 */
    function applyRemoteTheme(config: ThemeConfig) {
        if (!syncEnabled.value) return;
        applyThemeConfig(config);
    }

    /** 把本地主题推送到云端（后端会广播给其他端） */
    async function pushToBackend() {
        try {
            await themeApi.saveTheme(buildThemeConfig());
        } catch {
            // 推送失败静默：本地主题仍生效，下次修改会再尝试
        }
    }

    /** 拉取云端主题并应用（多端统一开启时） */
    async function syncFromBackend() {
        if (!syncEnabled.value) return;
        try {
            const res = await themeApi.getTheme();
            if (res?.success && res.data) {
                applyThemeConfig(res.data);
            }
        } catch {
            // 后端不可用时保持本地主题
        }
    }

    function setSyncEnabled(value: boolean) {
        syncEnabled.value = value;
        localStorage.setItem(SYNC_ENABLED_KEY, String(value));
        if (value) {
            void adoptOrPush();
        }
    }

    /** 开启多端统一瞬间：云端已有主题就跟随，还是初始默认才推本地主题 */
    async function adoptOrPush() {
        try {
            const res = await themeApi.getTheme();
            const cloud = res?.data;
            const untouched =
                !cloud ||
                (cloud.source === "preset" &&
                    cloud.preset === "zhenxun-light" &&
                    cloud.mode === "light");
            if (untouched) {
                await pushToBackend();
            } else {
                applyThemeConfig(cloud);
            }
        } catch {
            // 后端不可用：仅记住开关状态，联网后再同步
        }
    }

    function initTheme() {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        const storedColor = localStorage.getItem(CUSTOM_COLOR_KEY);

        if (storedColor) {
            try {
                const { primary, mode } = JSON.parse(storedColor);
                applyCustomColorTheme(primary, mode, true);
            } catch {
                localStorage.removeItem(CUSTOM_COLOR_KEY);
                setTheme(defaultTheme.name);
            }
        } else if (storedTheme && isThemePresetName(storedTheme)) {
            setTheme(storedTheme);
        } else {
            setTheme(defaultTheme.name);
        }

        // 多端统一：本地先按缓存显示，再用云端配置覆盖
        if (syncEnabled.value) {
            void syncFromBackend();
        }
    }

    return {
        activeThemeName,
        activeTheme,
        customTheme,
        customColor,
        customMode,
        effectiveMode,
        syncEnabled,
        presets,
        setTheme,
        setCustomTheme,
        applyCustomColorTheme,
        applyThemeConfig,
        applyRemoteTheme,
        buildThemeConfig,
        pushToBackend,
        syncFromBackend,
        setSyncEnabled,
        resetTheme,
        toggleTheme,
        initTheme,
        forceApplyLight,
        restoreSavedTheme,
    };
});
