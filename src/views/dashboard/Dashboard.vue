<script lang="ts" setup>
import { onBeforeUnmount, onMounted } from "vue";
import UserCard from "@/views/dashboard/UserCard.vue";
import CommitTimeline from "@/views/dashboard/CommitTimeline.vue";
import LogCard from "@/views/dashboard/LogCard.vue";
import SystemInfoCard from "@/views/dashboard/SystemInfoCard.vue";
import DashboardStatsGrid from "@/views/dashboard/DashboardStatsGrid.vue";
import DashboardResourceGrid from "@/views/dashboard/DashboardResourceGrid.vue";
import { useDashboardData } from "@/views/dashboard/composables/useDashboardData";

const {
    systemStore,
    systemInfo,
    networkStatus,
    statCards,
    startDashboard,
    stopDashboard,
} = useDashboardData();

onMounted(async () => {
    await startDashboard();
});

onBeforeUnmount(() => {
    stopDashboard();
});
</script>

<template>
    <div
        class="relative flex min-h-full w-full flex-col sm:space-y-4"
        data-dashboard-root
    >
        <div
            class="grid flex-1 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 2xl:min-h-0 2xl:grid-cols-[30rem_1fr_24rem] 2xl:grid-rows-[16rem_auto_minmax(0,1fr)]"
        >
            <!-- 顶部状态栏 -->
            <UserCard />
            <DashboardStatsGrid :cards="statCards" />

            <div
                class="col-span-1 flex min-h-0 flex-col gap-4 max-2xl:order-last lg:col-span-2 2xl:col-span-1 2xl:col-start-3 2xl:row-span-3 2xl:row-start-1 2xl:h-full"
            >
                <CommitTimeline
                    class="min-h-0 flex-1 max-2xl:max-h-96 max-lg:max-h-64"
                />

                <SystemInfoCard
                    :system-info="systemInfo"
                    :network-status="networkStatus"
                    class="shrink-0"
                />
            </div>

            <DashboardResourceGrid
                :cpu="systemStore.systemStatus.cpu"
                :memory="systemStore.systemStatus.memory"
                :disk="systemStore.systemStatus.disk"
            />

            <LogCard
                class="col-span-1 max-2xl:max-h-96 max-lg:max-h-64 lg:col-span-2 2xl:col-span-2 2xl:row-start-3 2xl:h-full 2xl:min-h-0"
            />
        </div>
    </div>
</template>

<style scoped></style>
