import { colorScaleVars, darkColorScaleVars, type AppTheme, type ThemeColorName, type ThemeColorToken } from "./tokens";

interface HSL {
    h: number;
    s: number;
    l: number;
}

/** 自定义主题挂在根元素上的类名（applyTheme 切回预设时需要一并移除） */
export const CUSTOM_THEME_CLASS = "theme-zhenxun-custom";

function hexToHsl(hex: string): HSL {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
        return { h: 0, s: 0, l: Math.round(l * 100) };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

function hslToHex(hsl: HSL): string {
    const { h, s, l } = hsl;
    const sNorm = s / 100;
    const lNorm = l / 100;

    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;

    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }

    const toHex = (v: number) =>
        Math.round((v + m) * 255)
            .toString(16)
            .padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hsl(h: number, s: number, l: number): string {
    return hslToHex({
        h: ((h % 360) + 360) % 360,
        s: Math.max(0, Math.min(100, s)),
        l: Math.max(0, Math.min(100, l)),
    });
}

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

function generateChartColors(primary: HSL): Record<ThemeColorName, ThemeColorToken> {
    const { h, s } = primary;
    const offsets: Record<ThemeColorName, number> = {
        blue: 0,
        green: 120,
        pink: 300,
        amber: 40,
        violet: 260,
        rose: 340,
        cyan: 180,
        slate: 220,
    };

    const result: Record<string, ThemeColorToken> = {};
    for (const [name, offset] of Object.entries(offsets)) {
        const ch = (h + offset) % 360;
        const cs = clamp(s + 10, 40, 90);
        result[name] = {
            solid: hsl(ch, cs, 55),
            soft: `rgba(${hexToRgb(hsl(ch, cs, 55))}, 0.16)`,
            fill: `rgba(${hexToRgb(hsl(ch, cs, 55))}, 0.10)`,
        };
    }
    return result as Record<ThemeColorName, ThemeColorToken>;
}

function hexToRgb(hex: string): string {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

export function generateThemeFromColors(
    primaryColor: string,
    mode: "light" | "dark" = "light",
): AppTheme {
    const p = hexToHsl(primaryColor);
    const isDark = mode === "dark";

    const cssVars: Record<string, string> = {
        ...(isDark ? darkColorScaleVars : colorScaleVars),

        // Layout & Surface - 使用中性色
        "--zx-color-bg": isDark ? "#0a0a0a" : "#f5f5f5",
        "--zx-color-surface": isDark ? "#141414" : "#ffffff",
        "--zx-color-surface-muted": isDark ? "#1a1a1a" : "#f5f5f5",
        "--zx-color-border": isDark ? "#2a2a2a" : "#e5e5e5",
        "--zx-color-border-soft": isDark ? "#1f1f1f" : "#f0f0f0",

        // Text - 使用中性灰色，不带主色色调
        "--zx-color-text": isDark ? "#e7e7e7" : "#1a1a1a",
        "--zx-color-text-strong": isDark ? "#fafafa" : "#0a0a0a",
        "--zx-color-text-muted": isDark ? "#a3a3a3" : "#666666",
        "--zx-color-text-subtle": isDark ? "#737373" : "#999999",

        // Primary
        "--zx-color-primary": hsl(p.h, p.s, p.l),
        // 主色之上的对比文字色（同取色器对勾规则：亮度>55 用深灰，否则白）
        "--zx-color-on-primary": p.l > 55 ? "#334155" : "#ffffff",
        // hover 方向按主色亮度自适应：亮色变暗、暗色变亮，
        // 否则用户选了深色主色时 hover 再变暗就看不清了
        "--zx-color-primary-hover": isDark
            ? hsl(p.h, clamp(p.s + 5, 0, 100), clamp(p.l + 8, 0, 100))
            : hsl(
                  p.h,
                  clamp(p.s + 5, 0, 100),
                  clamp(p.l + (p.l > 50 ? -8 : 10), 0, 100),
              ),
        "--zx-color-primary-soft": isDark
            ? hsl(p.h, clamp(p.s * 0.4, 10, 40), 20)
            : hsl(p.h, clamp(p.s * 0.5, 15, 50), 92),
        "--zx-color-primary-tint": isDark
            ? hsl(p.h, clamp(p.s * 0.3, 8, 30), 12)
            : hsl(p.h, clamp(p.s * 0.3, 8, 30), 97),

        // Semantic (fixed)
        "--zx-color-success": isDark ? "#34d399" : "#10b981",
        "--zx-color-success-soft": isDark ? "#064e3b" : "#d1fae5",
        "--zx-color-warning": isDark ? "#fbbf24" : "#f59e0b",
        "--zx-color-warning-soft": isDark ? "#78350f" : "#fef3c7",
        "--zx-color-danger": isDark ? "#f87171" : "#ef4444",
        "--zx-color-danger-soft": isDark ? "#7f1d1d" : "#fee2e2",
        "--zx-color-info": isDark ? "#22d3ee" : "#06b6d4",
        "--zx-color-info-soft": isDark ? "#164e63" : "#cffafe",

        // UI Chrome - 根据主色亮度自动计算对比色
        "--zx-color-active": isDark ? "#ffffff" : "#000000",
        "--zx-color-on-accent": p.l > 55 ? "#000000" : "#ffffff",
        "--zx-nav-icon-bg": isDark ? "#1f1f1f" : "#f0f0f0",
        "--zx-nav-icon-hover-bg": hsl(p.h, p.s, p.l),
        "--zx-nav-icon-hover-text": p.l > 55 ? "#000000" : "#ffffff",

        // Sidebar
        "--zx-sidebar-logo-filter": isDark ? "brightness(0.82)" : "none",

        // User Card
        "--zx-user-card-image-filter": isDark
            ? "brightness(0.58) saturate(0.98)"
            : "brightness(0.92) saturate(1.08)",
        "--zx-user-card-overlay": isDark
            ? "rgba(0, 0, 0, 0.54)"
            : "rgba(0, 0, 0, 0.45)",
        "--zx-user-card-chip-bg": isDark
            ? "rgba(18, 18, 18, 0.74)"
            : "rgba(255, 255, 255, 0.86)",
        "--zx-user-card-chip-text": isDark ? "#f5f5f5" : "#1a1a1a",
        "--zx-user-card-text": "#ffffff",

        // Radius (fixed)
        "--zx-radius-card": "1.5rem",
        "--zx-radius-control": "1rem",
        "--zx-radius-pill": "9999px",

        // Shadows - 使用中性阴影
        "--zx-shadow-card": isDark
            ? "0 1px 2px 0 rgb(0 0 0 / 0.28)"
            : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "--zx-shadow-popover": isDark
            ? "0 18px 44px -18px rgb(0 0 0 / 0.58), 0 6px 18px -10px rgb(0 0 0 / 0.48)"
            : "0 10px 30px -12px rgb(0 0 0 / 0.24), 0 4px 12px -8px rgb(0 0 0 / 0.18)",

        // Overlays
        "--zx-overlay": isDark ? "rgba(0, 0, 0, 0.56)" : "rgba(0, 0, 0, 0.4)",
        "--zx-overlay-light": isDark ? "rgba(0, 0, 0, 0.38)" : "rgba(0, 0, 0, 0.25)",
        "--zx-overlay-dark": isDark ? "rgba(0, 0, 0, 0.72)" : "rgba(0, 0, 0, 0.55)",

        // Chart
        "--zx-chart-grid": isDark ? "rgba(82, 82, 82, 0.48)" : "rgba(229, 229, 229, 0.72)",
        "--zx-chart-tooltip": isDark ? "rgba(20, 20, 20, 0.96)" : "rgba(255, 255, 255, 0.96)",
    };

    if (isDark) {
        cssVars["--zx-tile-glow-color"] = "rgba(255, 255, 255, 0.42)";
    }

    const charts = generateChartColors(p);

    return {
        name: "zhenxun-custom",
        className: CUSTOM_THEME_CLASS,
        cssVars,
        charts,
    };
}
