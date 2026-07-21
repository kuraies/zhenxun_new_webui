<script setup lang="ts">
import { ref, computed, useTemplateRef } from "vue";
import { generateThemeFromColors } from "@/theme";
import { useThemeStore } from "@/store/theme";
import { RotateCcw, Check, Sun, Moon, Pipette } from "lucide-vue-next";
import ColorPicker from "./ColorPicker.vue";

const themeStore = useThemeStore();
const colorPickerContainer = useTemplateRef("colorPickerContainer");

const primaryColor = ref(themeStore.customColor || "#6366f1");
const mode = ref<"light" | "dark">(themeStore.customColor ? themeStore.customMode : (themeStore.activeThemeName === "zhenxun-dark" ? "dark" : "light"));
const colorSelected = ref(!!themeStore.customColor);
const showColorPicker = ref(false);

const previewTheme = computed(() => generateThemeFromColors(primaryColor.value, mode.value));

const presetColors = [
    { color: "#000000" },
    { color: "#ffffff" },
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

function handleApply() {
    themeStore.applyCustomColorTheme(primaryColor.value, mode.value);
}

function handleReset() {
    themeStore.setTheme("zhenxun-light");
    primaryColor.value = "#3b82f6";
    mode.value = "light";
    colorSelected.value = false;
}
</script>

<template>
    <div class="space-y-4">
        <div class="text-xs font-medium text-slate-500">自定义主题</div>

        <div class="flex flex-wrap items-center gap-2">
            <button
                v-for="item in presetColors"
                :key="item.color"
                class="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-110"
                :style="{
                    background: item.color,
                }"
                @click="selectColor(item)"
            >
                <Check v-if="colorSelected && primaryColor.toLowerCase() === item.color.toLowerCase()" class="h-3 w-3 text-white drop-shadow" />
            </button>
            <div class="relative" ref="colorPickerContainer">
                <button
                    class="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-all hover:scale-110"
                    :class="showColorPicker ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
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

        <!-- 模式切换 -->
        <div class="flex rounded-full bg-slate-100 p-0.5">
            <button
                class="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-medium transition-all"
                :class="mode === 'light' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                @click="mode = 'light'"
            >
                <Sun class="h-3 w-3" />
                浅色
            </button>
            <button
                class="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-medium transition-all"
                :class="mode === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                @click="mode = 'dark'"
            >
                <Moon class="h-3 w-3" />
                深色
            </button>
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
                class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600 transition-colors hover:bg-slate-200"
                @click="handleReset"
            >
                <RotateCcw class="h-3 w-3" />
            </button>
        </div>
    </div>
</template>
