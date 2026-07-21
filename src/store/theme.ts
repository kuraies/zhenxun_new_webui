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

const THEME_STORAGE_KEY = "zhenxun-theme";
const CUSTOM_COLOR_KEY = "zhenxun-custom-color";

const isThemePresetName = (value: string): value is ThemePresetName =>
    value in getThemePresets();

export const useThemeStore = defineStore("theme", () => {
    const activeThemeName = ref<ThemePresetName>(defaultTheme.name);
    const customTheme = ref<AppTheme | null>(null);
    const customColor = ref<string | null>(null);
    const customMode = ref<"light" | "dark">("light");

    const presets = computed(() => getThemePresets());
    const activeTheme = computed(
        () => customTheme.value || presets.value[activeThemeName.value],
    );

    function setTheme(name: ThemePresetName) {
        customTheme.value = null;
        customColor.value = null;
        activeThemeName.value = name;
        applyThemePreset(name);
        localStorage.setItem(THEME_STORAGE_KEY, name);
        localStorage.removeItem(CUSTOM_COLOR_KEY);
    }

    function setCustomTheme(theme: AppTheme) {
        customTheme.value = theme;
        applyTheme(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme.name);
    }

    function applyCustomColorTheme(primary: string, mode: "light" | "dark" = "light") {
        const theme = generateThemeFromColors(primary, mode);
        customColor.value = primary;
        customMode.value = mode;
        setCustomTheme(theme);
        localStorage.setItem(CUSTOM_COLOR_KEY, JSON.stringify({ primary, mode }));
    }

    function resetTheme() {
        setTheme(defaultTheme.name);
    }

    function forceApplyLight() {
        applyThemePreset("zhenxun-light");
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

    function initTheme() {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        const storedColor = localStorage.getItem(CUSTOM_COLOR_KEY);

        if (storedColor) {
            try {
                const { primary, mode } = JSON.parse(storedColor);
                customMode.value = mode;
                applyCustomColorTheme(primary, mode);
                return;
            } catch {
                localStorage.removeItem(CUSTOM_COLOR_KEY);
            }
        }

        if (storedTheme && isThemePresetName(storedTheme)) {
            setTheme(storedTheme);
            return;
        }

        setTheme(defaultTheme.name);
    }

    return {
        activeThemeName,
        activeTheme,
        customTheme,
        customColor,
        customMode,
        presets,
        setTheme,
        setCustomTheme,
        applyCustomColorTheme,
        resetTheme,
        toggleTheme,
        initTheme,
        forceApplyLight,
        restoreSavedTheme,
    };
});
