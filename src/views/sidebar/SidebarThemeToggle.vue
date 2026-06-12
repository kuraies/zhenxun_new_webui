<script setup lang="ts">
import { computed } from "vue";
import { Moon, Sun } from "lucide-vue-next";
import { useGlobalStore } from "@/store/global";
import { useThemeStore } from "@/store/theme";

const globalStore = useGlobalStore();
const themeStore = useThemeStore();

const isDark = computed(() => themeStore.activeThemeName === "zhenxun-dark");
</script>

<template>
    <button
        type="button"
        :title="isDark ? '切换浅色主题' : '切换暗黑主题'"
        :aria-label="isDark ? '切换浅色主题' : '切换暗黑主题'"
        :class="[
            'btn-touch group flex h-12 w-full items-center rounded-full border border-slate-200 bg-white p-1 text-sm shadow-sm transition-all duration-[400ms] hover:border-slate-300 hover:shadow-md',
            globalStore.navMini ? 'justify-center px-0' : 'px-1',
        ]"
        @click="themeStore.toggleTheme()"
    >
        <span
            :class="[
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors',
                isDark
                    ? 'bg-slate-900 text-yellow-400'
                    : 'bg-slate-100 text-slate-700 group-hover:bg-black group-hover:text-white',
            ]"
        >
            <Sun v-if="isDark" class="h-5 w-5" />
            <Moon v-else class="h-5 w-5" />
        </span>

        <span
            :class="[
                'min-w-0 overflow-hidden whitespace-nowrap font-medium text-slate-700 transition-all duration-300',
                globalStore.navMini ? 'w-0 opacity-0' : 'ml-3 flex-1 opacity-100',
            ]"
        >
            {{ isDark ? "浅色主题" : "暗黑主题" }}
        </span>
    </button>
</template>
