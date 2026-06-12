import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
    applyTheme,
    applyThemePreset,
    defaultTheme,
    getThemePresets,
    type AppTheme,
    type ThemePresetName,
} from "@/theme";

const THEME_STORAGE_KEY = "zhenxun-theme";

const isThemePresetName = (value: string): value is ThemePresetName =>
    value in getThemePresets();

export const useThemeStore = defineStore("theme", () => {
    const activeThemeName = ref<ThemePresetName>(defaultTheme.name);
    const customTheme = ref<AppTheme | null>(null);

    const presets = computed(() => getThemePresets());
    const activeTheme = computed(
        () => customTheme.value || presets.value[activeThemeName.value],
    );

    function setTheme(name: ThemePresetName) {
        customTheme.value = null;
        activeThemeName.value = name;
        applyThemePreset(name);
        localStorage.setItem(THEME_STORAGE_KEY, name);
    }

    function setCustomTheme(theme: AppTheme) {
        customTheme.value = theme;
        applyTheme(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme.name);
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
        presets,
        setTheme,
        setCustomTheme,
        resetTheme,
        toggleTheme,
        initTheme,
        forceApplyLight,
        restoreSavedTheme,
    };
});
