<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { gsap } from 'gsap'
import { useRoute } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'

import { useGlobalStore } from '@/store/global.js'
import { auth } from '@/utils/auth.ts'
import { router } from '@/router/index.js'
import { ZXMessageBox } from '@/components/index.js'
import type { MenuItem } from '@/config/menu'
import { mainMenus, bottomMenus } from '@/config/menu'

import logo from '@/assets/img/title.png'

const route = useRoute()
const globalStore = useGlobalStore()

// 选中的菜单 key
const activeMenuKey = ref<string>('dashboard')

// 动画相关引用
const breathElement = ref<HTMLElement | null>(null)
const arrow_right = ref<HTMLElement | null>(null)
let breathAnimation: gsap.core.Animation | null = null
let rightAnimation: gsap.core.Animation | null = null

// 退出登录
const handleLogout = () => {
    ZXMessageBox({
        title: '退出登录',
        message: '你是否要退出登录',
        cancelButtonText: '取消',
        onConfirm: () => {
            auth.logout()
            router.push({ name: 'Login' })
        }
    })
}

// 开始呼吸动画
const startBreathAnimation = (el: HTMLElement, menuKey: string) => {
    // 如果已经有选中的菜单，先停止它的动画
    if (activeMenuKey.value) {
        stopBreathAnimation()
    }

    // 设置新的选中菜单
    activeMenuKey.value = menuKey

    breathElement.value = el.querySelector('.icon')
    arrow_right.value = el.querySelector('.arrow-right')

    if (!breathElement.value || !arrow_right.value) return

    // 创建呼吸效果：缩放 + 透明度变化
    breathAnimation = gsap.fromTo(
        breathElement.value,
        { scale: 0.85 },
        {
            scale: 1.15,
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut'
        }
    )

    rightAnimation = gsap.fromTo(
        arrow_right.value,
        { x: -5 },
        {
            x: 5,
            duration: 1,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut'
        }
    )
}

// 停止呼吸动画
const stopBreathAnimation = () => {
    if (breathAnimation) {
        breathAnimation.kill()
        if (breathElement.value) {
            gsap.to(breathElement.value, {
                scale: 1,
                duration: 0.2,
                ease: 'back.out(1.7)'
            })
        }
    }
    if (rightAnimation) {
        rightAnimation.kill()
        if (arrow_right.value) {
            gsap.to(arrow_right.value, {
                x: 0,
                duration: 0.2
            })
        }
    }
}

// 导航到指定菜单
const navigateTo = (item: MenuItem) => {
    if (item.key === 'logout') {
        handleLogout()
        return
    }
    startBreathAnimation(document.querySelector(`[data-key="${item.key}"]`) as HTMLElement, item.key)
    if (item.path) {
        router.push(item.path)
    }
}

// 监听路由变化，自动选中对应菜单
watch(
    () => route.meta.menuKey,
    (newKey) => {
        if (newKey) {
            activeMenuKey.value = newKey as string
            const menuItem = document.querySelector(`.menus-item[data-key="${newKey}"]`)
            if (menuItem) {
                // 更新动画元素引用
                breathElement.value = menuItem.querySelector('.icon') as HTMLElement | null
                arrow_right.value = menuItem.querySelector('.arrow-right') as HTMLElement | null
            }
        }
    },
    { immediate: true }
)

onMounted(() => {
    // 初始化时根据当前路由选中对应菜单
    const currentMenuKey = route.meta.menuKey as string || 'dashboard'
    const currentMenu = document.querySelector(`.menus-item[data-key="${currentMenuKey}"]`)
    if (currentMenu) {
        startBreathAnimation(currentMenu as HTMLElement, currentMenuKey)
    }
})
</script>

<template>
    <div class="flex flex-col h-full w-full items-center space-y-2 sm:space-y-3">
        <!-- 菜单容器 - 改进响应式和触摸反馈 -->
        <div
            class="top mx-2 sm:mx-3 flex w-full flex-1 flex-col items-center space-y-2 sm:space-y-3 overflow-y-auto bg-white py-3 sm:py-6 shadow-sm outline-1 outline-slate-200 transition-all duration-300
                   rounded-l-none rounded-r-2xl sm:rounded-2xl"
        >
            <!-- Logo 区域 -->
            <div class="logo duration-200 ease-in-out flex items-center justify-center flex-shrink-0"
                :class="{
                    'hidden': globalStore.navMini,
                    'w-full px-2 sm:px-4': !globalStore.navMini
                }"
            >
                <img :src="logo" alt="Logo" class="h-14 sm:h-20 max-w-full object-contain" />
            </div>

            <!-- 菜单列表 -->
            <div
                class="menus relative w-full space-y-1.5 sm:space-y-2 overflow-y-auto overflow-x-hidden p-1.5 sm:p-2 text-sm flex-1"
                :class="{
                    'px-1 no-scrollbar': globalStore.navMini
                }"
            >
                <div
                    v-for="item in mainMenus"
                    :key="item.key"
                    :data-key="item.key"
                    class="menus-item group relative flex h-10 sm:h-12 w-full cursor-pointer items-center rounded-full p-1 sm:p-1.5 transition-all duration-300 btn-touch
                           hover:shadow-md"
                    :class="{
                        'scale-105 shadow-sm outline outline-1 outline-slate-300 bg-gradient-to-r from-slate-50 to-white':
                            activeMenuKey === item.key,
                        'hover:scale-105 hover:outline hover:outline-1 hover:outline-slate-200':
                            activeMenuKey !== item.key,
                        '!p-1 !space-x-0 !outline-none !shadow-none !translate-x-0.5 !h-10': globalStore.navMini
                    }"
                    @click="navigateTo(item)"
                    @mouseenter="
                        !activeMenuKey &&
                        startBreathAnimation($event.currentTarget as HTMLElement, item.key)
                    "
                    @mouseleave="!activeMenuKey && stopBreathAnimation()"
                >
                    <!-- 图标容器 -->
                    <div
                        :class="[
                            'icon flex items-center justify-center rounded-full transition-all duration-300 flex-shrink-0',
                            activeMenuKey === item.key ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-inner' : 'bg-slate-100 text-slate-600 group-hover:bg-gradient-to-br group-hover:from-slate-800 group-hover:to-slate-900 group-hover:text-white',
                            globalStore.navMini ? 'h-8 w-8' : 'h-8 w-8 sm:h-9 sm:w-9'
                        ]"
                    >
                        <component :is="item.icon" class="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    </div>

                    <!-- 文字和箭头 -->
                    <div class="right flex items-center flex-1 min-w-0 pl-1.5 sm:pl-2"
                        :class="{
                            'hidden': globalStore.navMini
                        }"
                    >
                        <span class="truncate text-xs sm:text-sm font-medium text-slate-700 group-hover:text-slate-900">
                            {{ item.name }}
                        </span>
                        <div
                            ref="arrow_right"
                            :class="{
                                'flex opacity-100': activeMenuKey === item.key,
                                'hidden opacity-0': activeMenuKey !== item.key,
                            }"
                            class="arrow-right ml-auto flex items-center justify-end transition-all duration-300"
                        >
                            <ChevronRight class="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 退出登录按钮 - 改进动效 -->
        <div
            class="bottom flex h-12 sm:h-14 w-full flex-col justify-center bg-white hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 duration-300 space-y-4 px-2 sm:px-3 shadow-sm cursor-pointer outline-1 outline-slate-200 transition-all btn-touch
                   rounded-l-none rounded-r-2xl sm:rounded-full"
        >
            <div class="logout flex items-center rounded-full space-x-2 sm:space-x-3 p-1 sm:p-1.5 text-sm transition-all duration-300"
                 @click="handleLogout">
                <div class="icon rounded-full text-red-500 group-hover:text-red-600 flex items-center justify-center bg-red-50 group-hover:bg-red-100 transition-all duration-300 h-8 w-8 sm:h-9 sm:w-9">
                    <component :is="bottomMenus[0].icon" class="size-4 sm:size-5" />
                </div>
                <div class="text text-red-500 font-medium group-hover:text-red-600 truncate transition-colors duration-300 text-xs sm:text-sm"
                     :class="{ 'hidden': globalStore.navMini }">
                    退出登录
                </div>
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