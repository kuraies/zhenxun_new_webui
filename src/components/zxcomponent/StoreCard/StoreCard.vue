<script setup lang="ts">
import { computed, ref } from "vue";
import { Download, ExternalLink, RotateCw } from "lucide-vue-next";
import type { StorePlugin } from "@/types/store.types";

const props = defineProps<{
    plugin: StorePlugin;
    /** 标签名 -> 背景色（NoneBot 源的标签带品牌色） */
    tagColors?: Record<string, string>;
}>();

const emit = defineEmits<{
    (e: "install", plugin: StorePlugin): void;
    (e: "update", plugin: StorePlugin): void;
}>();

const processing = ref(false);

// 按背景亮度计算可读的文字颜色：亮底深字、暗底白字
const contrastColor = (hex: string): string => {
    let value = hex.trim().replace(/^#/, "");
    if (value.length === 3) {
        value = value
            .split("")
            .map((c) => c + c)
            .join("");
    }
    const m = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);
    if (!m) return "#ffffff";
    const luminance =
        0.2126 * (parseInt(m[1], 16) / 255) +
        0.7152 * (parseInt(m[2], 16) / 255) +
        0.0722 * (parseInt(m[3], 16) / 255);
    return luminance > 0.6 ? "#333333" : "#ffffff";
};

const tagStyle = (tag: string) => {
    const bg = props.tagColors?.[tag];
    return bg ? { background: bg, color: contrastColor(bg) } : undefined;
};

// 鲜艳徽标：饱和底色 + 按亮度计算的字色
const vivid = (bg: string) => ({ background: bg, color: contrastColor(bg) });

// 类型徽标：NORMAL/官方 绿、ADMIN 红、其余用亮灰
const typeStyle = computed(() => {
    const type = props.plugin.plugin_type;
    if (type === "NORMAL" || type === "官方") return vivid("#16a34a");
    if (type === "ADMIN") return vivid("#ef4444");
    return vivid("#71717a");
});

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
    <div class="group relative flex flex-col transition-all duration-300 select-none">
        <div
            class="market-card relative flex flex-1 flex-col overflow-hidden rounded-3xl bg-white px-2 pt-2 shadow-sm border border-slate-200 transition-all duration-300"
        >
        <div class="flex flex-1 flex-col gap-2 p-4">
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
                    class="inline-flex h-[22px] flex-shrink-0 items-center rounded-full px-2 text-[11px] leading-none font-medium whitespace-nowrap"
                    :class="plugin.is_installed ? '' : 'bg-gray-100 text-gray-500'"
                    :style="plugin.is_installed ? vivid('#16a34a') : undefined"
                >
                    {{ plugin.is_installed ? "已安装" : "未安装" }}
                </span>
            </div>

            <!-- 描述 -->
            <div class="my-2 overflow-hidden">
                <p
                    class="line-clamp-4 text-sm leading-snug break-words text-gray-600"
                >
                    {{ plugin.description || "暂无描述" }}
                </p>
            </div>

            <!-- 版本和作者信息 -->
            <div class="flex flex-wrap items-center gap-2">
                <span
                    class="inline-flex h-[22px] items-center rounded-full bg-blue-100 px-2 text-[11px] leading-none font-medium text-blue-600"
                >
                    v{{ plugin.version || "1.0.0" }}
                </span>
                <span
                    v-if="plugin.plugin_type"
                    class="inline-flex h-[22px] flex-shrink-0 items-center rounded-full px-2 text-[11px] leading-none font-medium"
                    :style="typeStyle"
                >
                    {{ plugin.plugin_type }}
                </span>
                <span
                    v-for="tag in (plugin.tags || []).slice(0, 2)"
                    :key="tag"
                    class="inline-flex h-[22px] flex-shrink-0 items-center rounded-full bg-gray-100 px-2 text-[11px] leading-none font-medium text-gray-500"
                    :style="tagStyle(tag)"
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
                    class="btn-touch flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-zx-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zx-primary-hover disabled:opacity-50"
                >
                    <Download class="h-4 w-4" />
                    <span>安装</span>
                </button>
            </template>
            <template v-else>
                <!-- 更新按钮：有更新时主题色实底，否则浅色 -->
                <button
                    @click="handleUpdate"
                    :disabled="processing"
                    class="btn-touch flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                    :class="
                        plugin.has_update
                            ? 'bg-zx-primary text-white hover:bg-zx-primary-hover'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    "
                >
                    <RotateCw class="h-4 w-4" />
                    <span>{{ plugin.has_update ? "有更新" : "更新" }}</span>
                </button>
            </template>

            <!-- 主页链接 -->
            <a
                v-if="plugin.homepage"
                :href="plugin.homepage"
                target="_blank"
                class="btn-touch flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            >
                <ExternalLink class="h-4 w-4" />
            </a>
        </div>
        </div>
    </div>
</template>

<style scoped>
/* 四角取景光标 */
.corner-marker {
    width: 18px;
    height: 18px;
    border: 0 solid var(--zx-color-primary);
    opacity: 0;
    transition: opacity 0.25s ease;
}

.group:hover .corner-marker {
    opacity: 1;
}

.corner-tl {
    border-left-width: 2px;
    border-top-width: 2px;
    border-top-left-radius: 6px;
}

.corner-tr {
    border-right-width: 2px;
    border-top-width: 2px;
    border-top-right-radius: 6px;
}

.corner-bl {
    border-left-width: 2px;
    border-bottom-width: 2px;
    border-bottom-left-radius: 6px;
}

.corner-br {
    border-right-width: 2px;
    border-bottom-width: 2px;
    border-bottom-right-radius: 6px;
}
</style>
