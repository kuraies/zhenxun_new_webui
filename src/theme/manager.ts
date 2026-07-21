import {
    defaultTheme,
    themePresets,
    type AppTheme,
    type ThemePresetName,
} from "./tokens";

let activeTheme: AppTheme = defaultTheme;

const canUseDOM = () => typeof document !== "undefined";

export const applyTheme = (theme: AppTheme = defaultTheme) => {
    activeTheme = theme;

    if (!canUseDOM()) {
        return theme;
    }

    const root = document.documentElement;

    Object.values(themePresets).forEach((preset) => {
        root.classList.remove(preset.className);
    });
    root.classList.add(theme.className);
    root.dataset.theme = theme.name;

    Object.entries(theme.cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });

    return theme;
};

export const applyThemePreset = (name: ThemePresetName) =>
    applyTheme(themePresets[name]);

export const getActiveTheme = () => activeTheme;

export const getThemePresets = () => themePresets;
