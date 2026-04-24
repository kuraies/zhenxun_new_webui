<script setup lang="ts">
import { computed, ref } from "vue";
import { Settings } from "lucide-vue-next";
import { pluginApi } from "@/utils/api-next";
import type { PluginInfo } from "@/types/api-next.types";
import { ZXNotification } from "@/components";

const props = defineProps<{
    plugin: PluginInfo;
}>();

const emit = defineEmits<{
    (e: "open-config", plugin: PluginInfo): void;
    (e: "status-change", module: string, newStatus: boolean): void;
}>();

const processing = ref(false);

// 计算开关是否可用 - allow_switch 才是不允许操作
const switchDisabled = computed(() => !props.plugin.allow_switch);
let toggleTimer: ReturnType<typeof setTimeout> | null = null;

// 切换插件状态
const handleToggleStatus = (newStatus: boolean) => {
    if (!props.plugin.allow_switch) {
        ZXNotification({
            title: "提示",
            message: `插件 "${props.plugin.name}" 不允许开关操作 (｡•́︿•̀｡)`,
            type: "info",
            position: "top-right",
        });
        return;
    }

    // UI立即更新
    emit("status-change", props.plugin.module, newStatus);

    // 清掉上一次待发送请求
    if (toggleTimer) {
        clearTimeout(toggleTimer);
    }

    toggleTimer = setTimeout(() => {
        processing.value = true;

        pluginApi
            .togglePluginStatus(props.plugin.module, newStatus)
            .then((res) => {
                if (res?.success) {
                    ZXNotification({
                        title: "成功啦~",
                        message: `插件 "${props.plugin.name}" 已${newStatus ? "启用" : "禁用"} ♪(´▽｀)`,
                        type: "🥳",
                        position: "top-right",
                        confetti: true,
                    });
                } else {
                    emit("status-change", props.plugin.module, !newStatus);

                    ZXNotification({
                        title: "哎呀~",
                        message:
                            res.message || "操作失败了，请再试一次 (´；ω；`)",
                        type: "😭",
                        position: "top-right",
                    });
                }
            })
            .catch(() => {
                emit("status-change", props.plugin.module, !newStatus);

                ZXNotification({
                    title: "哎呀~",
                    message: "操作失败了，请再试一次 (´；ω；`)",
                    type: "😭",
                    position: "top-right",
                });
            })
            .finally(() => {
                processing.value = false;
            });
    }, 400); // 防抖时间
};

// 打开配置
const handleOpenConfig = (event: Event) => {
    event.stopPropagation();
    emit("open-config", props.plugin);
};
</script>

<template>
    <div
        class="group overflow-hidden rounded-4xl bg-white px-2 pt-2 shadow-sm outline-1 outline-slate-200 transition-all duration-300 select-none hover:-translate-y-1 hover:shadow-xl"
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
                        by
                        <span class="font-medium">{{
                            plugin.author || "未知"
                        }}</span>
                    </p>
                </div>

                <!-- 状态标签 -->
                <span
                    :class="
                        plugin.is_enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                    "
                    class="flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-medium"
                >
                    {{ plugin.is_enabled ? "已启用" : "已禁用" }}
                </span>
            </div>

            <!-- 描述 -->
            <div class="h-10">
                <p
                    class="line-clamp-2 text-sm leading-relaxed break-words text-gray-600"
                >
                    {{ plugin.description || "暂无描述" }}
                </p>
            </div>

            <!-- 版本信息 -->
            <div class="flex items-center gap-2">
                <span
                    class="inline-flex h-5 items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                >
                    v{{ plugin.version || "1.0.0" }}
                </span>
                <span
                    class="flex-shrink-0 rounded-full px-3 py-0.5 text-[11px] font-medium"
                    :class="
                        plugin.is_builtin
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-orange-100 text-orange-700'
                    "
                >
                    {{ plugin.is_builtin ? "内置" : "三方" }}
                </span>
            </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="flex items-center gap-3 px-4 pt-0 pb-3">
            <!-- 开关 + 标签 -->
            <div
                class="relative inline-flex flex-shrink-0 items-center select-none"
                :class="
                    switchDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                "
                @click="
                    !switchDisabled && handleToggleStatus(!plugin.is_enabled)
                "
            >
                <input
                    type="checkbox"
                    class="peer sr-only"
                    :checked="plugin.is_enabled"
                    :disabled="processing || switchDisabled"
                />
                <div
                    class="peer h-6 w-11 rounded-full after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
                    :class="[
                        switchDisabled
                            ? 'bg-blue-200 peer-checked:bg-blue-300'
                            : 'bg-gray-200 peer-checked:bg-blue-600',
                        !switchDisabled &&
                            'peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:outline-none',
                    ]"
                ></div>
                <span
                    class="ms-2 text-xs font-medium whitespace-nowrap"
                    :class="switchDisabled ? 'text-blue-400' : 'text-gray-600'"
                >
                    {{ plugin.is_enabled ? "开" : "关" }}
                </span>
            </div>

            <div class="flex-1" />

            <!-- 配置按钮 -->
            <button
                @click.stop="handleOpenConfig"
                class="flex-shrink-0 rounded-full p-2 transition-colors"
                :class="
                    plugin.allow_setting
                        ? 'cursor-pointer text-gray-600 hover:bg-gray-100'
                        : 'cursor-not-allowed text-gray-300 opacity-50'
                "
                :disabled="!plugin.allow_setting"
                :title="plugin.allow_setting ? '插件配置' : '没有配置项'"
            >
                <Settings class="h-5 w-5" />
            </button>
        </div>
    </div>
</template>
