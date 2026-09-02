import {
    defaultTheme,
    themePresets,
    type AppTheme,
    type ThemePresetName,
} from "./tokens";
import { CUSTOM_THEME_CLASS } from "./colorGenerator";

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
    // 自定义主题类不在预设表里，切回预设时也要清掉，
    // 否则深色自定义残留的类会让浅色下命中 tile-glow 等自定义选择器
    root.classList.remove(CUSTOM_THEME_CLASS);
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
