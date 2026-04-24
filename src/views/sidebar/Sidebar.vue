<script setup lang="ts">
import { watch } from "vue";
import { useRoute } from "vue-router";
import { useGlobalStore } from "@/store/global.js";
import { mainMenus } from "@/config/menu";

// 引入刚刚提取的组件 (根据你的实际路径调整)
import SidebarLogo from "./SidebarLogo.vue";
import SidebarMenuItem from "./SidebarMenuItem.vue";
import SidebarLogout from "./SidebarLogout.vue";

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
    <div class="flex h-full w-full flex-col items-center sm:space-y-4">
        <div
            class="top relative flex w-full flex-1 flex-col items-center overflow-y-auto border border-slate-200 bg-white py-3 shadow-sm transition-all duration-300 sm:space-y-4 sm:rounded-4xl sm:py-8"
        >
            <SidebarLogo />

            <div
                class="menus gutter relative w-full snap-y snap-mandatory scroll-py-4 space-y-4 overflow-hidden scroll-smooth p-4 text-sm hover:overflow-y-auto @max-3xs:px-1"
                :class="{ 'no-scrollbar px-1': globalStore.navMini }"
            >
                <SidebarMenuItem
                    v-for="item in mainMenus"
                    :key="item.key"
                    :item="item"
                />
            </div>
        </div>

        <SidebarLogout />
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
