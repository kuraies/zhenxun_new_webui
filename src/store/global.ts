import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useGlobalStore = defineStore("global", () => {
    const navMini = ref(false);
    const navHidden = ref(false); // 默认显示侧边栏
    // 当前是否为移动模式（由窗口宽度决定，<640px 为移动模式）
    const isMobileMode = ref(false);
    const wsConnected = ref(false);
    const isTableMode = ref(false);

    const isDesktopMode = computed(
        () => !(isMobileMode.value || isTableMode.value),
    );

    const activeMenuKey = ref<string>("dashboard");

    function setActiveMenuKey(this: any, activeMenuKey: string): void {
        this.activeMenuKey = activeMenuKey;
    }

    return {
        navMini,
        navHidden,
        isMobileMode,
        activeMenuKey,
        isDesktopMode,
        setActiveMenuKey,
        wsConnected,
        isTableMode,
    };
});
