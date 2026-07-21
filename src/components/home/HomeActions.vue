<script setup lang="ts">
import { Bell, Settings, Palette } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useThemeStore } from "@/store/theme";
import { onClickOutside } from "@vueuse/core";
import ThemeCustomizer from "./ThemeCustomizer.vue";

const themeStore = useThemeStore();

const messageCount = ref(1);

const showThemePanel = ref(false);
const themePanelRef = ref<HTMLElement | null>(null);

onClickOutside(themePanelRef, () => {
    showThemePanel.value = false;
});
</script>

<template>
    <div class="flex items-center space-x-1 sm:space-x-2">
        <button
            class="bell-btn group relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:shadow-md sm:h-9 sm:w-9"
            title="通知"
        >
            <Bell class="h-3.5 w-3.5 transition-colors sm:h-4 sm:w-4" :class="messageCount > 0 ? 'text-orange-500 bell-notify' : 'text-slate-600 group-hover:text-orange-500'" />
            <span v-if="messageCount > 0" class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold leading-none text-white">{{ messageCount }}</span>
        </button>

        <div class="relative" ref="themePanelRef">
            <button
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:shadow-md sm:h-9 sm:w-9"
                title="主题选择"
                @click="showThemePanel = !showThemePanel"
            >
                <Palette class="h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" />
            </button>
            <Transition name="dropdown">
                <div
                    v-if="showThemePanel"
                    class="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
                >
                    <ThemeCustomizer />
                </div>
            </Transition>
        </div>

        <button
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:shadow-md sm:h-9 sm:w-9"
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

@keyframes bell-ring {
    0% { transform: rotate(0); }
    15% { transform: rotate(14deg); }
    30% { transform: rotate(-12deg); }
    45% { transform: rotate(10deg); }
    60% { transform: rotate(-8deg); }
    75% { transform: rotate(4deg); }
    90% { transform: rotate(-2deg); }
    100% { transform: rotate(0); }
}

.bell-btn:hover :deep(svg),
.bell-notify {
    animation: bell-ring 0.6s ease-in-out infinite;
    transform-origin: top center;
}
</style>
