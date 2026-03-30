import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGlobalStore = defineStore('global', () => {
    const navMini = ref(false)
    const navHidden = ref(false) // 默认显示侧边栏
    // 当前是否为移动模式（由窗口宽度决定，<640px 为移动模式）
    const isMobileMode = ref(false)

    return { navMini, navHidden, isMobileMode }
})
