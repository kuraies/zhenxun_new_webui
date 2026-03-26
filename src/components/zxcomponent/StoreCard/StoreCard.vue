<script setup lang="ts">
import { ref } from 'vue'
import { Download, RotateCw, ExternalLink } from 'lucide-vue-next'
import gsap from 'gsap'
import type { StorePlugin } from '@/types/store.types'

const props = defineProps<{
    plugin: StorePlugin
}>()

const emit = defineEmits<{
    (e: 'install', plugin: StorePlugin): void
    (e: 'update', plugin: StorePlugin): void
}>()

const processing = ref(false)
const cardRef = ref<HTMLElement | null>(null)

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

// 处理安装
const handleInstall = () => {
    if (processing.value) return
    playClickFeedback()
    emit('install', props.plugin)
}

// 处理更新
const handleUpdate = () => {
    if (processing.value) return
    playClickFeedback()
    emit('update', props.plugin)
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
                        <span class="font-medium">{{ plugin.module }}</span>
                    </p>
                </div>

                <!-- 状态标签 -->
                <span
                    :class="plugin.is_installed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
                    class="px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0"
                >
                    {{ plugin.is_installed ? '已安装' : '未安装' }}
                </span>
            </div>

            <!-- 描述 -->
            <div class="my-2 h-[45px] overflow-hidden">
                <p class="text-sm text-gray-600 leading-snug line-clamp-2 break-words">
                    {{ plugin.description || '暂无描述' }}
                </p>
            </div>

            <!-- 版本和作者信息 -->
            <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center rounded-full bg-blue-100 text-blue-700 h-5 text-xs font-semibold px-2">
                    v{{ plugin.version || '1.0.0' }}
                </span>
                <span
                    v-if="plugin.plugin_type"
                    class="px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 bg-gray-100 text-gray-600"
                >
                    {{ plugin.plugin_type }}
                </span>
                <span
                    v-for="tag in (plugin.tags || []).slice(0, 2)"
                    :key="tag"
                    class="px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 bg-blue-50 text-blue-600"
                >
                    {{ tag }}
                </span>
            </div>

            <!-- 作者信息 -->
            <div class="text-xs text-gray-500">
                by <span class="font-medium">{{ plugin.author || '未知' }}</span>
            </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="px-4 pb-4 pt-0 flex items-center gap-3">
            <template v-if="!plugin.is_installed">
                <!-- 安装按钮 -->
                <button
                    @click="handleInstall"
                    :disabled="processing"
                    class="flex-1 px-3 py-2 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 btn-touch"
                >
                    <Download class="w-4 h-4" />
                    <span>安装</span>
                </button>
            </template>
            <template v-else>
                <!-- 更新按钮 -->
                <button
                    @click="handleUpdate"
                    :disabled="processing"
                    class="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-2xl text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 btn-touch"
                >
                    <RotateCw class="w-4 h-4" />
                    <span>更新</span>
                </button>
            </template>

            <!-- 主页链接 -->
            <a
                v-if="plugin.homepage"
                :href="plugin.homepage"
                target="_blank"
                class="px-3 py-2 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-colors btn-touch"
            >
                <ExternalLink class="w-4 h-4" />
            </a>
        </div>
    </div>
</template>
