<script setup lang="ts">
import { Bell, Settings, Palette, Check, type LucideIcon } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useThemeStore } from "@/store/theme";
import { onClickOutside } from "@vueuse/core";

const themeStore = useThemeStore();
const isDark = computed(() => themeStore.activeThemeName === "zhenxun-dark");

const showThemePanel = ref(false);
const themePanelRef = ref<HTMLElement | null>(null);

onClickOutside(themePanelRef, () => {
    showThemePanel.value = false;
});

interface ThemeOptionDef {
    name: string;
    label: string;
    icon?: LucideIcon;
    colors: {
        bg: string;
        surface: string;
        primary: string;
        text: string;
        border: string;
    };
}

const themeOptions: ThemeOptionDef[] = [
    {
        name: "zhenxun-light",
        label: "浅色",
        icon: Palette,
        colors: {
            bg: "#f8fafc",
            surface: "#ffffff",
            primary: "#3b82f6",
            text: "#212121",
            border: "#e2e8f0",
        },
    },
    {
        name: "zhenxun-dark",
        label: "深色",
        icon: Palette,
        colors: {
            bg: "#050505",
            surface: "#121212",
            primary: "#d4d4d8",
            text: "#e7e7e7",
            border: "#2f2f32",
        },
    },
];
</script>

<template>
    <div class="flex items-center space-x-1 sm:space-x-2">
        <button
            class="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:shadow-md sm:h-9 sm:w-9"
            title="通知"
        >
            <Bell class="h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" />
        </button>

        <div class="relative" ref="themePanelRef">
            <button
                class="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:shadow-md sm:h-9 sm:w-9"
                title="主题选择"
                @click="showThemePanel = !showThemePanel"
            >
                <Palette class="h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" />
            </button>
            <Transition name="dropdown">
                <div
                    v-if="showThemePanel"
                    class="absolute right-0 top-full mt-2 w-48 space-y-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                    <button
                        v-for="opt in themeOptions"
                        :key="opt.name"
                        class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all"
                        :style="{
                            background: opt.colors.surface,
                            color: opt.colors.text,
                            border: '1px solid ' + opt.colors.border,
                        }"
                        @click="themeStore.setTheme(opt.name)"
                    >
                        <div class="flex items-center space-x-4">
                            <component :is="opt.icon" v-if="opt.icon" class="h-4 w-4" :style="{ color: opt.colors.primary }" />
                            <span>{{ opt.label }}</span>
                        </div>
                        <Check v-if="themeStore.activeThemeName === opt.name" class="h-4 w-4" :style="{ color: opt.colors.primary }" />
                    </button>
                </div>
            </Transition>
        </div>

        <button
            class="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:shadow-md sm:h-9 sm:w-9"
            title="设置"
        >
            <Settings class="h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" />
        </button>
    </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
    transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-4px) scale(0.95);
}
</style>
