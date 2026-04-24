<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import DashboardIsland from "components/Island/DashboardIsland.vue";
import AnalyticsIsland from "components/Island/AnalyticsIsland.vue";
import ChatIsland from "components/Island/ChatIsland.vue";
import PluginIsland from "components/Island/PluginIsland.vue";
import StoreIsland from "components/Island/StoreIsland.vue";
import FilesIsland from "components/Island/FilesIsland.vue";
import ManageIsland from "components/Island/ManageIsland.vue";
import { useGlobalStore } from "@/store/global.ts";
import DatabaseIsland from "components/Island/DatabaseIsland.vue";
import LogIsland from "components/Island/LogIsland.vue";

const route = useRoute();

const globalStore = useGlobalStore();

const islandMap: Record<string, any> = {
    "/chat": ChatIsland,
    "/analytics": AnalyticsIsland,
    "/plugin": PluginIsland,
    "/store": StoreIsland,
    "/files": FilesIsland,
    "/manage": ManageIsland,
    "/database": DatabaseIsland,
    "/logs": LogIsland,
};

const currentIsland = computed(() => islandMap[route.path] || DashboardIsland);
</script>

<template>
    <div class="flex flex-1 space-x-4" v-if="globalStore.isDesktopMode">
        <keep-alive>
            <component :is="currentIsland" />
        </keep-alive>
    </div>
</template>

<style scoped></style>
