<script setup>
import {
    LayoutPanelLeft,
    Monitor,
    Blocks,
    Package,
    MessageSquareMore,
    ChartBar,
    Folder,
    Database,
    Info
} from 'lucide-vue-next'

import {gsap} from 'gsap'


/*
图片导入区
 */

import logo from '@/assets/img/title.png'
import { auth } from '@/utils/auth.js'
import { router } from '@/router/index.js'


/*
图片导入区结束
 */

const dd = () => {
    auth.setAuthState(false)
    auth.deleteAuthToken()
    router.push({
        name: 'Login'
    })
}


const menus = ref([
    {
        name: '首页',
        icon: LayoutPanelLeft
    },
    {
        name: '控制台',
        icon: Monitor
    },
    {
        name: '插件列表',
        icon: Blocks
    },
    {
        name: '插件市场',
        icon: Package
    },
    {
        name: '聊天',
        icon: MessageSquareMore
    },
    {
        name: '数据统计',
        icon: ChartBar
    },
    {
        name: '文件',
        icon: Folder
    },
    {
        name: '数据库',
        icon: Database
    },
    {
        name: '关于',
        icon: Info
    }
])

// function handleMouseEnter(el) {
//     gsap.to(el, {
//         x:100,
//     })
//     // gsap.to(el, {
//     //     x:0,
//     // })
// }
const hoveredIndex = ref(null)
const hoveredPosition = reactive({ top: 0, left: 0, width: 0, height: 0 })

let hideTimeout = null

function onListItemEnter(index) {
    clearTimeout(hideTimeout)
    hoveredIndex.value = index
    // 获取目标元素位置
    const el = document.querySelectorAll('.menus-item')[index]
    if (el) {
        const rect = el.getBoundingClientRect()
        hoveredPosition.top = rect.top
        hoveredPosition.left = rect.left
        hoveredPosition.width = rect.width
        hoveredPosition.height = rect.height
    }
}

function onListItemLeave(index) {
    // 延迟清空，防止闪烁
    hideTimeout = setTimeout(() => {
        hoveredIndex.value = null
    }, 150)
}

// function handleMouseLeave() {
//     // 鼠标离开悬浮层时也清除悬浮
//     hideTimeout = setTimeout(() => {
//         hoveredIndex.value = null
//     }, 150)
// }

function clearHideTimeout() {
    if (hideTimeout) {
        clearTimeout(hideTimeout)
        hideTimeout = null
    }
}

const hoverEl = ref(null)
const leaving = ref(false) // 标记是否正在离场动画

function handleMouseLeave() {
    if (leaving.value) return // 防止重复触发

    hideTimeout = setTimeout(() => {
        hoveredIndex.value = null
    }, 150)

    leaving.value = true
    if (hoverEl.value) {
        gsap.to(hoverEl.value, {
            opacity: 0,
            x: 0,
            scale: 0.9,
            duration: 0.3,
            ease: 'power2.in',
            onComplete() {
                hoveredIndex.value = null  // 动画结束后再隐藏元素
                leaving.value = false
            }
        })
    } else {
        // 没有元素直接隐藏
        hoveredIndex.value = null
        leaving.value = false
    }
}

watch(
    () => hoveredIndex.value,
    async (newVal) => {
        if (newVal !== null) {
            leaving.value = false
            await nextTick()
            if (hoverEl.value) {
                gsap.killTweensOf(hoverEl.value)
                gsap.set(hoverEl.value, { opacity: 0, x: 0, scale: 0.9 })
                gsap.to(hoverEl.value, {
                    opacity: 1,
                    x: 20,
                    scale: 1.1,
                    duration: 0.3,
                    ease: 'power2.out',
                })
            }
        }
    }
)



</script>

<template>
    <div class="flex-1 min-h-100 flex flex-col items-center space-y-4">
        <div
            class="top w-full flex-1 flex flex-col items-center space-y-4 bg-gray-50 rounded-4xl shadow-sm py-8 mx-4 min-h-80">
            <div class="logo">
                <img :src="logo" alt="" class="w-50" />
            </div>
            <div class="menus w-full space-y-4 overflow-y-auto overflow-x-visible p-4 text-sm relative">
                <div v-for="(item, index) in menus" :key="index"
                     class="menus-item h-14 flex p-1 items-center w-full rounded-full space-x-4 cursor-pointer outline-1 outline-slate-200 group"
                     :class="{
        'bg-white hover:scale-105 group-hover': hoveredIndex !== index,
        'bg-transparent pointer-events-none': hoveredIndex === index
      }"
                     @mouseenter="onListItemEnter(index)"
                     @mouseleave="onListItemLeave(index)"
                >
                    <div
                        class="size-12 flex justify-center items-center rounded-full group-hover:bg-black group-hover:text-white transition duration-200"
                    >
                        <component :is="item.icon" class="size-5" />
                    </div>
                    <div>{{ item.name }}</div>
                </div>
            </div>

            <Teleport to="body" v-if="hoveredIndex !== null">
                <div
                    ref="hoverEl"
                    class="menus-item fixed flex p-1 items-center rounded-full space-x-4 bg-white shadow-lg cursor-pointer z-50"
                    :style="{
      top: hoveredPosition.top + 'px',
      left: hoveredPosition.left + 'px',
      width: hoveredPosition.width + 'px',
      height: hoveredPosition.height + 'px',
      transformOrigin: 'center center',
    }"
                    @mouseleave="handleMouseLeave"
                    @mouseenter="clearHideTimeout"
                >
                    <div
                        class="size-12 flex justify-center items-center rounded-full bg-black text-white"
                    >
                        <component :is="menus[hoveredIndex].icon" class="size-5" />
                    </div>
                    <div>{{ menus[hoveredIndex].name }}</div>
                </div>
            </Teleport>
        </div>
        <div class="bottom w-full flex flex-col space-y-4  min-h-40 bg-white  rounded-4xl  shadow-sm">
            <div class="w-full p-4" @click="dd">
                <div class="cpu">

                </div>
                <div class="memory">

                </div>
                <div class="disk">

                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>

</style>