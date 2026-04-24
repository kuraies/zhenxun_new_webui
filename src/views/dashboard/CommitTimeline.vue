<script lang="ts" setup>
import { History } from "lucide-vue-next";
import { useSystemStore } from "@/store/system.ts";
import { computed, ref } from "vue";

const systemStore = useSystemStore();

// 数据源
const list = computed(() => systemStore.commits || []);

// 整体加载状态：如果没有数据则显示大骨架屏
const loading = computed(() => systemStore.commitsLoading);

// 头像加载状态管理
const avatarLoadedMap = ref<Record<number, boolean>>({});
const onAvatarLoad = (index: number) => {
    avatarLoadedMap.value[index] = true;
};

/**
 * 🧠 GitHub 风格时间转换
 */
function formatTime(dateStr: string) {
    if (!dateStr) return "";

    const now = new Date();
    const date = new Date(dateStr);
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) {
        return "刚刚";
    }

    if (diff < 3600) {
        return `${Math.floor(diff / 60)}分钟前`;
    }

    if (diff < 86400) {
        return `${Math.floor(diff / 3600)}小时前`;
    }

    if (diff < 86400 * 7) {
        return `${Math.floor(diff / 86400)}天前`;
    }

    if (diff < 86400 * 30) {
        return `${Math.floor(diff / (86400 * 7))}周前`;
    }

    return date.toLocaleDateString();
}
</script>

<template>
    <div
        class="flex h-full min-h-0 flex-col rounded-4xl border border-slate-200 bg-white p-5 pr-0.5 shadow-sm"
    >
        <div
            class="mb-2 flex shrink-0 items-center gap-2 border-b border-slate-100 pb-4"
        >
            <History class="h-5 w-5 text-purple-500" />
            <h3 class="text-sm font-semibold text-gray-700 sm:text-base">
                历史更新
            </h3>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden">
            <el-skeleton :loading="loading" animated :count="10">
                <template #template>
                    <div class="mb-6 flex gap-3">
                        <div class="flex flex-col items-center">
                            <el-skeleton-item
                                variant="circle"
                                style="width: 12px; height: 12px"
                            />
                            <div class="mt-1 h-12 w-px bg-slate-100"></div>
                        </div>
                        <div class="flex-1">
                            <el-skeleton-item
                                variant="text"
                                style="width: 80%; margin-bottom: 8px"
                            />
                            <el-skeleton-item
                                variant="text"
                                style="width: 40%"
                            />
                        </div>
                    </div>
                </template>

                <template #default>
                    <ul
                        class="custom-scrollbar h-full space-y-3 overflow-y-auto pt-2 pr-2"
                    >
                        <li
                            v-for="(item, index) in list"
                            :key="index"
                            class="relative flex gap-3"
                        >
                            <div class="relative flex flex-col items-center">
                                <span
                                    :class="
                                        index === 0
                                            ? 'border-3 border-purple-500'
                                            : 'border-2 border-slate-400'
                                    "
                                    class="z-10 h-3 w-3 shrink-0 rounded-full bg-white"
                                ></span>
                                <span
                                    v-if="index !== list.length - 1"
                                    class="absolute top-3 h-full w-px bg-slate-200"
                                ></span>
                            </div>

                            <div
                                class="-mt-1 mb-4 flex flex-1 flex-col break-words"
                            >
                                <div
                                    class="mb-2 text-xs font-semibold text-slate-600"
                                >
                                    {{ item?.message }}
                                </div>
                                <div
                                    class="flex items-center space-x-2 text-xs text-slate-500"
                                >
                                    <div
                                        v-if="!avatarLoadedMap[index]"
                                        class="mr-1 h-4 w-4"
                                    >
                                        <el-skeleton animated>
                                            <template #template>
                                                <el-skeleton-item
                                                    variant="circle"
                                                    style="
                                                        width: 16px;
                                                        height: 16px;
                                                    "
                                                />
                                            </template>
                                        </el-skeleton>
                                    </div>

                                    <img
                                        v-show="avatarLoadedMap[index]"
                                        :src="item?.avatar_url"
                                        class="mr-1 h-4 w-4 rounded-full ring-1 ring-gray-200"
                                        @load="onAvatarLoad(index)"
                                    />

                                    <span
                                        class="text-xs font-medium text-slate-700"
                                        >{{ item?.author }}</span
                                    >
                                    <span>{{ formatTime(item.date) }}</span>
                                </div>
                            </div>
                        </li>
                    </ul>
                </template>
            </el-skeleton>
        </div>
    </div>
</template>

<style scoped>
/* 美化滚动条 */
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
</style>