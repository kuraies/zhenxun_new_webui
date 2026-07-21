<script setup lang="ts">
import { watch } from "vue";
import { useRoute } from "vue-router";
import { useGlobalStore } from "@/store/global.js";
import { mainMenus } from "@/config/menu";

// 引入刚刚提取的组件 (根据你的实际路径调整)
import SidebarLogo from "./SidebarLogo.vue";
import SidebarMenuItem from "./SidebarMenuItem.vue";

const route = useRoute();
const globalStore = useGlobalStore();

// 监听路由变化，同步 Pinia 中的 activeMenuKey
watch(
    () => route.meta.menuKey,
    (newKey) => {
        if (newKey) {
            globalStore.setActiveMenuKey(newKey as string);
        }
    },
    { immediate: true },
);
</script>

<template>
    <div class="flex h-full w-full flex-col items-center">
        <div
            v-tile-glow="120"
            class="top relative flex w-full flex-1 flex-col items-center overflow-hidden border border-slate-200 bg-white py-3 shadow-sm transition-[padding,border-radius] duration-[400ms] ease-in-out sm:rounded-3xl sm:py-8"
        >
            <SidebarLogo />

            <div
                class="menus gutter relative w-full flex-1 snap-y snap-mandatory scroll-py-4 space-y-4 overflow-hidden scroll-smooth text-sm transition-[padding] duration-[400ms] ease-in-out hover:overflow-y-auto"
                :class="
                    globalStore.navMini
                        ? 'no-scrollbar px-2 py-4'
                        : 'p-4'
                "
            >
                <SidebarMenuItem
                    v-for="item in mainMenus"
                    :key="item.key"
                    :item="item"
                />
            </div>

        </div>
    </div>
</template>

<style scoped>
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
