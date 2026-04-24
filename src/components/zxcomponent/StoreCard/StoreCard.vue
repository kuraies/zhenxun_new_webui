<script setup lang="ts">
import { ref } from "vue";
import { Download, ExternalLink, RotateCw } from "lucide-vue-next";
import type { StorePlugin } from "@/types/store.types";

const props = defineProps<{
    plugin: StorePlugin;
}>();

const emit = defineEmits<{
    (e: "install", plugin: StorePlugin): void;
    (e: "update", plugin: StorePlugin): void;
}>();

const processing = ref(false);

// 处理安装
const handleInstall = () => {
    if (processing.value) return;
    emit("install", props.plugin);
};

// 处理更新
const handleUpdate = () => {
    if (processing.value) return;
    emit("update", props.plugin);
};
</script>

<template>
    <div
        class="group overflow-hidden rounded-4xl bg-white px-2 pt-2 shadow-sm outline-1 outline-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
        <div class="flex flex-col gap-2 p-4">
            <!-- 头部：插件信息 + 状态 -->
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <h3
                            class="truncate text-lg font-bold text-gray-800"
                            :title="plugin.name"
                        >
                            {{ plugin.name }}
                        </h3>
                    </div>
                    <p class="mt-0.5 truncate text-xs text-gray-500">
                        <span class="font-medium">{{ plugin.module }}</span>
                    </p>
                </div>

                <!-- 状态标签 -->
                <span
                    :class="
                        plugin.is_installed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                    "
                    class="flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-medium"
                >
                    {{ plugin.is_installed ? "已安装" : "未安装" }}
                </span>
            </div>

            <!-- 描述 -->
            <div class="my-2 h-[45px] overflow-hidden">
                <p
                    class="line-clamp-2 text-sm leading-snug break-words text-gray-600"
                >
                    {{ plugin.description || "暂无描述" }}
                </p>
            </div>

            <!-- 版本和作者信息 -->
            <div class="flex flex-wrap items-center gap-2">
                <span
                    class="inline-flex h-5 items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                >
                    v{{ plugin.version || "1.0.0" }}
                </span>
                <span
                    v-if="plugin.plugin_type"
                    class="flex-shrink-0 rounded-full bg-gray-100 px-3 py-0.5 text-[11px] font-bold text-gray-800"
                    :class="{
                        'bg-green-200 text-green-600':
                            plugin.plugin_type == 'NORMAL',
                        'bg-red-200 text-red-600':
                            plugin.plugin_type == 'ADMIN',
                    }"
                >
                    {{ plugin.plugin_type }}
                </span>
                <span
                    v-for="tag in (plugin.tags || []).slice(0, 2)"
                    :key="tag"
                    class="flex-shrink-0 rounded-full bg-blue-50 px-3 py-0.5 text-[11px] font-medium text-blue-600"
                >
                    {{ tag }}
                </span>
            </div>

            <!-- 作者信息 -->
            <div class="text-xs text-gray-500">
                by
                <span class="font-medium">{{ plugin.author || "未知" }}</span>
            </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="flex items-center gap-3 px-4 pt-0 pb-4">
            <template v-if="!plugin.is_installed">
                <!-- 安装按钮 -->
                <button
                    @click="handleInstall"
                    :disabled="processing"
                    class="btn-touch flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-2xl bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                    <Download class="h-4 w-4" />
                    <span>安装</span>
                </button>
            </template>
            <template v-else>
                <!-- 更新按钮 -->
                <button
                    @click="handleUpdate"
                    :disabled="processing"
                    class="btn-touch flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-2xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50"
                >
                    <RotateCw class="h-4 w-4" />
                    <span>更新</span>
                </button>
            </template>

            <!-- 主页链接 -->
            <a
                v-if="plugin.homepage"
                :href="plugin.homepage"
                target="_blank"
                class="btn-touch rounded-2xl bg-gray-100 px-3 py-2 text-gray-600 transition-colors hover:bg-gray-200"
            >
                <ExternalLink class="h-4 w-4" />
            </a>
        </div>
    </div>
</template>
