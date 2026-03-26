<script setup lang="ts">
import { ref, computed } from 'vue'
import { Settings } from 'lucide-vue-next'
import gsap from 'gsap'
import { pluginApi } from '@/utils/api-next'
import type { PluginInfo } from '@/types/api-next.types'
import { ZXNotification } from '@/components'

const props = defineProps<{
    plugin: PluginInfo
}>()

const emit = defineEmits<{
    (e: 'open-config', plugin: PluginInfo): void
    (e: 'status-change', module: string, newStatus: boolean): void
}>()

const processing = ref(false)
const cardRef = ref<HTMLElement | null>(null)

// 计算开关是否可用 - allow_switch 才是不允许操作
const switchDisabled = computed(() => props.plugin.allow_switch === false)

// 卡片悬停动画
const handleMouseEnter = () => {
    if (!cardRef.value) return
    gsap.to(cardRef.value, {
        y: -4,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        duration: 0.25,
        ease: 'power2.out'
    })
}

const handleMouseLeave = () => {
    if (!cardRef.value) return
    gsap.to(cardRef.value, {
        y: 0,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        duration: 0.25,
        ease: 'power2.out'
    })
}

// 点击反馈动画
const playClickFeedback = () => {
    if (!cardRef.value) return
    gsap.timeline()
        .to(cardRef.value, {
            scale: 0.98,
            duration: 0.08,
            ease: 'power2.in'
        })
        .to(cardRef.value, {
            scale: 1,
            duration: 0.15,
            ease: 'back.out(1.5)'
        })
}

// 切换插件状态
const handleToggleStatus = (newStatus: boolean) => {
    // 如果插件不允许开关，直接返回
    if (props.plugin.allow_switch === false) {
        ZXNotification({
            title: '提示',
            message: `插件 "${props.plugin.name}" 不允许开关操作 (｡•́︿•̀｡)`,
            type: 'info',
            position: 'top-right'
        })
        return
    }

    playClickFeedback()
    processing.value = true

    // 立即更新前端状态
    emit('status-change', props.plugin.module, newStatus)

    pluginApi.togglePluginStatus(props.plugin.module, newStatus)
        .then(res => {
            if (res?.success) {
                ZXNotification({
                    title: '成功啦~',
                    message: `插件 "${props.plugin.name}" 已${newStatus ? '启用' : '禁用'} ♪(´▽｀)`,
                    type: '🥳',
                    position: 'top-right',
                    confetti: true
                })
            } else {
                // API 返回失败，恢复状态
                emit('status-change', props.plugin.module, !newStatus)
                ZXNotification({
                    title: '哎呀~',
                    message: res.message || '操作失败了，请再试一次 (´；ω；`)',
                    type: '😭',
                    position: 'top-right'
                })
            }
        })
        .catch(() => {
            // 请求错误，恢复状态
            emit('status-change', props.plugin.module, !newStatus)
            ZXNotification({
                title: '哎呀~',
                message: '操作失败了，请再试一次 (´；ω；`)',
                type: '😭',
                position: 'top-right'
            })
        })
        .finally(() => {
            processing.value = false
        })
}

// 打开配置
const handleOpenConfig = (event: Event) => {
    event.stopPropagation()
    emit('open-config', props.plugin)
}
</script>

<template>
    <div
        ref="cardRef"
        class="flip-card group bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 overflow-hidden transition-shadow duration-300"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
    >
        <div class="p-4 flex flex-col gap-2">
            <!-- 头部：插件信息 + 状态 -->
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <h3 class="text-base font-bold text-gray-800 truncate" :title="plugin.name">
                            {{ plugin.name }}
                        </h3>
                    </div>
                    <p class="text-xs text-gray-500 mt-0.5 truncate">
                        by <span class="font-medium">{{ plugin.author || '未知' }}</span>
                    </p>
                </div>

                <!-- 状态标签 -->
                <span
                    :class="plugin.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
                    class="px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0"
                >
                    {{ plugin.is_enabled ? '已启用' : '已禁用' }}
                </span>
            </div>

            <!-- 描述 -->
            <div class="h-10">
                <p class="text-sm text-gray-600 leading-relaxed line-clamp-2 break-words">
                    {{ plugin.description || '暂无描述' }}
                </p>
            </div>

            <!-- 版本信息 -->
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center rounded-full bg-blue-100 text-blue-700 h-5 text-xs font-semibold px-2">
                    v{{ plugin.version || '1.0.0' }}
                </span>
                <span
                    class="px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0"
                    :class="plugin.is_builtin ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'"
                >
                    {{ plugin.is_builtin ? '内置' : '三方' }}
                </span>
            </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="px-4 pb-4 pt-0 flex items-center gap-3">
            <!-- 开关 + 标签 -->
            <div
                class="relative inline-flex items-center select-none flex-shrink-0"
                :class="switchDisabled ? 'cursor-not-allowed' : 'cursor-pointer'"
                @click="!switchDisabled && handleToggleStatus(!plugin.is_enabled)"
            >
                <input
                    type="checkbox"
                    class="sr-only peer"
                    :checked="plugin.is_enabled"
                    :disabled="processing || switchDisabled"
                >
                <div
                    class="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                    :class="[
                        switchDisabled
                            ? 'bg-blue-200 peer-checked:bg-blue-300'
                            : 'bg-gray-200 peer-checked:bg-blue-600',
                        !switchDisabled && 'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500'
                    ]"
                ></div>
                <span class="ms-2 text-xs font-medium whitespace-nowrap" :class="switchDisabled ? 'text-blue-400' : 'text-gray-600'">
                    {{ plugin.is_enabled ? '开' : '关' }}
                </span>
            </div>

            <div class="flex-1" />

            <!-- 配置按钮 -->
            <button
                @click.stop="handleOpenConfig"
                class="p-2 rounded-full transition-colors flex-shrink-0"
                :class="plugin.allow_setting ? 'hover:bg-gray-100 text-gray-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed opacity-50'"
                :disabled="plugin.allow_setting === false"
                :title="plugin.allow_setting ? '插件配置' : '没有配置项'"
            >
                <Settings class="w-5 h-5" />
            </button>
        </div>
    </div>
</template>
