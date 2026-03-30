<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useBotStore } from '@/store/bot'
import { ChevronDown, Check } from 'lucide-vue-next'
import { useGlobalStore } from '@/store/global'
import avatar from '@/assets/img/avatar.jpg'

const globalStore = useGlobalStore()
const botStore = useBotStore()

// 下拉菜单状态
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const avatar_click = () => {
    if (!globalStore.navHidden) {
        globalStore.navMini = !globalStore.navMini
    }
}

// 切换下拉菜单
const toggleDropdown = () => {
    dropdownOpen.value = !dropdownOpen.value
}

// 选择 Bot
const selectBot = (botId: string | null) => {
    botStore.setSelectedBot(botId)
    dropdownOpen.value = false
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
        dropdownOpen.value = false
    }
}

onMounted(() => {
    botStore.getBotList()
    document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
    <div ref="dropdownRef" class="h-15 bg-white rounded-full shadow-sm flex p-1 outline-1 outline-slate-200 items-center gap-2 sm:gap-3 pr-2 sm:pr-3 min-w-0 w-full sm:w-72 relative">
        <div class="avatar h-full rounded-full flex-shrink-0" @click="avatar_click">
            <img :src="botStore.selectedBot?.ava_url || avatar" alt="" class="h-full rounded-full">
        </div>
        <div class="right flex items-center gap-2 min-w-0 flex-1">
            <div class="username truncate text-sm sm:text-base" :title="botStore.selectedBot?.nickname ?? undefined">
                {{ botStore.selectedBot?.nickname || '未选择 Bot' }}
            </div>
        </div>
        <!-- 切换按钮放在右侧 -->
        <button
            class="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0"
            @click="toggleDropdown"
        >
            <ChevronDown class="size-3.5 sm:size-4 text-slate-600 transition-transform duration-200" :class="{ 'rotate-180': dropdownOpen }" />
        </button>
    </div>

    <!-- Bot 下拉菜单 - 使用 Teleport 渲染到 body 避免被遮挡 -->
    <Teleport to="body">
        <Transition name="dropdown">
            <div
                v-if="dropdownOpen"
                class="fixed bg-white rounded-2xl shadow-xl outline-1 outline-slate-200 overflow-hidden z-[9999]"
                :style="{
                    top: dropdownRef ? `${dropdownRef.getBoundingClientRect().bottom + 8}px` : '0px',
                    left: dropdownRef ? `${dropdownRef.getBoundingClientRect().left}px` : '0px',
                    width: dropdownRef ? `${dropdownRef.offsetWidth}px` : 'auto',
                    minWidth: '200px'
                }"
            >
                <!-- 默认选项：自动选择 -->
                <div
                    class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    :class="{ 'bg-blue-50': !botStore.selectedBotId }"
                    @click="selectBot(null)"
                >
                    <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <span class="text-xs text-slate-500">自动</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-slate-700 truncate">自动选择</div>
                        <div class="text-xs text-slate-400">使用最新 Bot</div>
                    </div>
                    <Check v-if="!botStore.selectedBotId" class="size-4 text-blue-500 flex-shrink-0" />
                </div>

                <!-- 分割线 -->
                <div v-if="botStore.botList.length > 0" class="h-px bg-slate-100 mx-4"></div>

                <!-- Bot 列表 -->
                <div
                    v-for="bot in botStore.botList"
                    :key="bot.self_id || 'unknown'"
                    class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    :class="{ 'bg-blue-50': botStore.selectedBotId === bot.self_id }"
                    @click="selectBot(bot.self_id || null)"
                >
                    <img
                        :src="bot.ava_url || avatar"
                        alt=""
                        class="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-slate-700 truncate">{{ bot.nickname || bot.self_id }}</div>
                        <div class="text-xs text-slate-400 truncate">{{ bot.self_id }}</div>
                    </div>
                    <Check v-if="botStore.selectedBotId === bot.self_id" class="size-4 text-blue-500 flex-shrink-0" />
                </div>

                <!-- 空状态 -->
                <div v-if="botStore.botList.length === 0" class="px-4 py-3 text-center text-sm text-slate-400">
                    暂无可用的 Bot
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
@layer base {
    img {
        max-width: none;
    }
}

/* 下拉菜单动画 */
.dropdown-enter-active,
.dropdown-leave-active {
    transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
