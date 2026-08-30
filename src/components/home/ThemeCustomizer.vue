<script setup lang="ts">
import { ref, computed, watch, useTemplateRef } from "vue";
import { generateThemeFromColors } from "@/theme";
import { useThemeStore } from "@/store/theme";
import { ZXNotification } from "@/services/ui";
import {
    RotateCcw,
    Check,
    Sun,
    Moon,
    Monitor,
    CircleHelp,
    Pipette,
} from "lucide-vue-next";
import ColorPicker from "./ColorPicker.vue";

const themeStore = useThemeStore();
const colorPickerContainer = useTemplateRef("colorPickerContainer");

const emit = defineEmits<{ applied: [] }>();

// 跟随系统时按系统深浅偏好解析（预览/校验用，取快照即可）
const systemDark =
    typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : false;

const primaryColor = ref(themeStore.customColor || "#6366f1");
const mode = ref<"light" | "dark" | "system">(
    themeStore.customColor
        ? themeStore.customMode
        : themeStore.activeThemeName === "zhenxun-dark"
          ? "dark"
          : "light",
);
const colorSelected = ref(!!themeStore.customColor);
const showColorPicker = ref(false);

// 跟随系统时解析出的实际模式
const resolvedMode = computed<"light" | "dark">(() =>
    mode.value === "system" ? (systemDark ? "dark" : "light") : mode.value,
);

const previewTheme = computed(() =>
    generateThemeFromColors(primaryColor.value, resolvedMode.value),
);

// 黑白合并为一个自适应色板：浅色模式下是黑色、深色模式下是白色，
// 即永远展示与当前模式"相反"的那个极端色（另一个在本模式下不可用）
const extremeColor = computed(() =>
    mode.value === "light" ? "#000000" : "#ffffff",
);

const presetColors = [
    { color: "#3b82f6" },
    { color: "#6366f1" },
    { color: "#8b5cf6" },
    { color: "#ec4899" },
    { color: "#e91e63" },
    { color: "#f43f5e" },
    { color: "#ef4444" },
    { color: "#f97316" },
    { color: "#f59e0b" },
    { color: "#10b981" },
    { color: "#14b8a6" },
    { color: "#06b6d4" },
];

function selectColor(item: { color: string }) {
    primaryColor.value = item.color;
    colorSelected.value = true;
    showColorPicker.value = false;
}

// 模式切换后，原先合法的极端色（黑/白）在另一个模式下不可用，自动换成对面那个
watch(resolvedMode, (m) => {
    const c = primaryColor.value.toLowerCase();
    if (m === "dark" && c === "#000000") primaryColor.value = "#ffffff";
    if (m === "light" && c === "#ffffff") primaryColor.value = "#000000";
});

/** hex 颜色的 HSL 亮度（0-100） */
function hexLightness(hex: string): number {
    const v = hex.replace("#", "");
    if (v.length !== 6) return 50;
    const r = parseInt(v.substring(0, 2), 16) / 255;
    const g = parseInt(v.substring(2, 4), 16) / 255;
    const b = parseInt(v.substring(4, 6), 16) / 255;
    return Math.round(((Math.max(r, g, b) + Math.min(r, g, b)) / 2) * 100);
}

/** 对勾颜色按底色亮度自适应：浅色底配深对勾，深色底配白对勾 */
function checkColorFor(color: string): string {
    return hexLightness(color) > 55 ? "#334155" : "#ffffff";
}

function handleApply() {
    // 浅色主题禁选接近白的颜色、深色主题禁选接近黑的颜色（应用时看不清）
    const l = hexLightness(primaryColor.value);
    if (resolvedMode.value === "light" && l >= 90) {
        ZXNotification({
            title: "颜色太浅啦",
            message: "浅色主题下这个颜色会看不清，换一个吧",
            type: "warning",
        });
        return;
    }
    if (resolvedMode.value === "dark" && l <= 12) {
        ZXNotification({
            title: "颜色太深啦",
            message: "深色主题下这个颜色会看不清，换一个吧",
            type: "warning",
        });
        return;
    }
    themeStore.applyCustomColorTheme(primaryColor.value, mode.value);
    // 多端统一：把新主题推到云端，其他端通过 theme_update 同步
    if (themeStore.syncEnabled) themeStore.pushToBackend();
    // 应用成功后关闭外层主题面板
    emit("applied");
}

function handleReset() {
    themeStore.setTheme("zhenxun-light");
    themeStore.customMode = "light";
    primaryColor.value = "#3b82f6";
    mode.value = "light";
    colorSelected.value = false;
    if (themeStore.syncEnabled) themeStore.pushToBackend();
}

function onSyncToggle(value: string | number | boolean) {
    themeStore.setSyncEnabled(Boolean(value));
}
</script>

<template>
    <div class="space-y-4">
        <div class="text-xs font-medium text-[var(--zx-color-text-muted)]">自定义主题</div>

        <div class="flex flex-wrap items-center gap-2">
            <!-- 黑白合并的自适应色板：展示当前模式下可用的那个极端色 -->
            <button
                class="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[var(--zx-color-border)] transition-transform hover:scale-110"
                :style="{ background: extremeColor }"
                :title="mode === 'light' ? '黑色' : '白色'"
                @click="selectColor({ color: extremeColor })"
            >
                <Check
                    v-if="
                        colorSelected &&
                        primaryColor.toLowerCase() ===
                            extremeColor.toLowerCase()
                    "
                    class="h-3 w-3 drop-shadow"
                    :style="{ color: checkColorFor(extremeColor) }"
                />
            </button>
            <button
                v-for="item in presetColors"
                :key="item.color"
                class="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[var(--zx-color-border)] transition-transform hover:scale-110"
                :style="{
                    background: item.color,
                }"
                @click="selectColor(item)"
            >
                <Check
                    v-if="colorSelected && primaryColor.toLowerCase() === item.color.toLowerCase()"
                    class="h-3 w-3 drop-shadow"
                    :style="{ color: checkColorFor(item.color) }"
                />
            </button>
            <div class="relative" ref="colorPickerContainer">
                <button
                    class="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-all hover:scale-110"
                    :class="showColorPicker ? 'bg-[var(--zx-color-text-strong)] text-[var(--zx-color-bg)]' : 'bg-[var(--zx-color-surface-muted)] text-[var(--zx-color-text-muted)] hover:opacity-80'"
                    @click="showColorPicker = true"
                >
                    <Pipette class="h-3 w-3" />
                </button>
                <ColorPicker
                    v-model="primaryColor"
                    v-model:visible="showColorPicker"
                    :ignore="[colorPickerContainer]"
                    @update:model-value="colorSelected = true"
                />
            </div>
        </div>

        <!-- 模式切换：轨道跟随主题（深色下轨道为深灰，白色选中块才看得清） -->
        <div
            class="flex rounded-full p-0.5"
            :style="{
                background:
                    themeStore.activeTheme.cssVars['--zx-color-surface-muted'],
            }"
        >
            <button
                class="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-medium transition-all"
                :class="
                    mode === 'light'
                        ? themeStore.effectiveMode === 'dark'
                            ? 'bg-[#ffffff] text-[#27272a] shadow-sm'
                            : 'bg-[#27272a] text-[#ffffff] shadow-sm'
                        : 'bg-transparent hover:opacity-80'
                "
                :style="mode !== 'light' ? { color: themeStore.activeTheme.cssVars['--zx-color-text-muted'] } : undefined"
                @click="mode = 'light'"
            >
                <Sun class="h-3 w-3" />
                浅色
            </button>
            <button
                class="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-medium transition-all"
                :class="
                    mode === 'dark'
                        ? themeStore.effectiveMode === 'dark'
                            ? 'bg-[#ffffff] text-[#27272a] shadow-sm'
                            : 'bg-[#27272a] text-[#ffffff] shadow-sm'
                        : 'bg-transparent hover:opacity-80'
                "
                :style="mode !== 'dark' ? { color: themeStore.activeTheme.cssVars['--zx-color-text-muted'] } : undefined"
                @click="mode = 'dark'"
            >
                <Moon class="h-3 w-3" />
                深色
            </button>
            <button
                class="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-medium transition-all"
                :class="
                    mode === 'system'
                        ? themeStore.effectiveMode === 'dark'
                            ? 'bg-[#ffffff] text-[#27272a] shadow-sm'
                            : 'bg-[#27272a] text-[#ffffff] shadow-sm'
                        : 'bg-transparent hover:opacity-80'
                "
                :style="mode !== 'system' ? { color: themeStore.activeTheme.cssVars['--zx-color-text-muted'] } : undefined"
                @click="mode = 'system'"
            >
                <Monitor class="h-3 w-3" />
                跟随系统
            </button>
        </div>

        <!-- 多端统一 -->
        <div
            class="flex items-center justify-between rounded-xl bg-[var(--zx-color-surface-muted)] px-3 py-2"
        >
            <div class="flex items-center gap-1.5">
                <span class="text-xs font-medium text-[var(--zx-color-text)]">多端同步</span>
                <div class="group/tip relative flex items-center">
                    <CircleHelp
                        class="h-3.5 w-3.5 cursor-help text-[var(--zx-color-text-subtle)] transition-colors group-hover/tip:text-[var(--zx-color-text)]"
                    />
                    <div
                        class="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-52 -translate-x-1/2 rounded-xl px-3 py-2 text-left text-[11px] leading-relaxed opacity-0 shadow-lg transition-all duration-150 group-hover/tip:opacity-100"
                        :style="{
                            background:
                                themeStore.activeTheme.cssVars['--zx-color-text-strong'],
                            color: themeStore.activeTheme.cssVars['--zx-color-bg'],
                        }"
                    >
                        开启后主题会保存到服务器，所有设备的主题保持一致，任意一端修改都会自动同步到其他端
                        <div
                            class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                            :style="{
                                borderTopColor:
                                    themeStore.activeTheme.cssVars[
                                        '--zx-color-text-strong'
                                    ],
                            }"
                        ></div>
                    </div>
                </div>
            </div>
            <el-switch
                :model-value="themeStore.syncEnabled"
                size="small"
                style="--el-switch-on-color: var(--zx-color-primary); --el-switch-off-color: var(--zx-color-border)"
                @change="onSyncToggle"
            />
        </div>

        <!-- 预览 -->
        <div
            class="overflow-hidden rounded-xl border"
            :style="{ borderColor: previewTheme.cssVars['--zx-color-border'] }"
        >
            <div
                class="flex items-center gap-2 px-3 py-2"
                :style="{ background: previewTheme.cssVars['--zx-color-bg'] }"
            >
                <div
                    class="h-5 w-5 rounded-full shadow-sm"
                    :style="{ background: previewTheme.cssVars['--zx-color-primary'] }"
                />
                <div class="flex flex-1 flex-col gap-0.5">
                    <div
                        class="h-1.5 w-16 rounded-full"
                        :style="{ background: previewTheme.cssVars['--zx-color-text'] }"
                    />
                    <div
                        class="h-1.5 w-10 rounded-full"
                        :style="{ background: previewTheme.cssVars['--zx-color-text-muted'] }"
                    />
                </div>
            </div>
            <div
                class="flex gap-1.5 border-t px-3 py-2"
                :style="{
                    background: previewTheme.cssVars['--zx-color-surface'],
                    borderColor: previewTheme.cssVars['--zx-color-border-soft'],
                }"
            >
                <div
                    class="h-4 flex-1 rounded-full"
                    :style="{ background: previewTheme.cssVars['--zx-color-primary-soft'] }"
                />
                <div
                    class="h-4 flex-1 rounded-full"
                    :style="{ background: previewTheme.cssVars['--zx-color-primary-soft'] }"
                />
            </div>
        </div>

        <div class="flex gap-2">
            <button
                class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-black/5 px-3 py-1.5 text-xs font-medium transition-all hover:border-black/10"
                :style="{
                    background: previewTheme.cssVars['--zx-color-primary'],
                    color: previewTheme.cssVars['--zx-color-on-accent'],
                }"
                @click="handleApply"
            >
                应用
            </button>
            <button
                class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[var(--zx-color-surface-muted)] text-xs text-[var(--zx-color-text-muted)] transition-colors hover:opacity-80"
                @click="handleReset"
            >
                <RotateCcw class="h-3 w-3" />
            </button>
        </div>
    </div>
</template>
