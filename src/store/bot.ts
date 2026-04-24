import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { mainApi } from "@/utils/api-next";
import type { BotInfo } from "@/types/api-next.types";

// 本地 BotStatus 类型（在 API 类型基础上扩展）
// export interface BotStatus extends ApiBotStatus {
//     is_online?: boolean
//     bot_id?: string
//     id?: string
//     name?: string
// }

export const useBotStore = defineStore("bot", () => {
    // 机器人列表
    const botList = ref<BotInfo[]>([]);

    // 当前选中的 Bot ID
    const selectedBotId = ref<string | null>(null);

    // 机器人是否在线
    const isOnline = ref(true);

    // 机器人运行时长 (秒)
    const botUptime = ref(0);

    // 运行时长格式化字符串
    const botUptimeFormatted = ref("");

    // 计算属性，获取最后一个机器人对象
    const lastBot = computed(() => {
        if (botList.value.length === 0) return undefined;
        return botList.value[botList.value.length - 1];
    });

    // 计算属性，获取当前选中的 Bot（优先使用 selectedBotId，否则使用 lastBot）
    const selectedBot = computed(() => {
        if (!selectedBotId.value) return lastBot.value;
        return (
            botList.value.find((b) => b.self_id === selectedBotId.value) ||
            lastBot.value
        );
    });

    /**
     * 获取机器人列表
     */
    async function getBotList() {
        try {
            // const res = await mainApi.getBotStatus()
            const res = await mainApi.getBotList();
            // console.log(result);

            if (res?.success && res?.data) {
                // 直接存入数组
                botList.value = res.data;
            } else {
                console.warn("获取机器人列表失败或返回数据无效：", res);
            }
        } catch (err) {
            console.error("获取机器人列表时发生错误：", err);
        }
    }

    /**
     * 设置在线状态
     */
    function setOnlineStatus(status: boolean) {
        isOnline.value = status;
    }

    /**
     * 更新运行时长
     */
    function updateUptime(seconds: number) {
        botUptime.value = seconds;
    }

    /**
     * 更新运行时长格式化字符串
     */
    function updateUptimeFormatted(formatted: string) {
        botUptimeFormatted.value = formatted;
    }

    /**
     * 设置选中的 Bot
     */
    function setSelectedBot(botId: string | null) {
        selectedBotId.value = botId;
    }

    /**
     * 获取当前选中的 Bot ID（返回 self_id）
     */
    function getSelectedBotId(): string | null {
        return selectedBot.value?.self_id || null;
    }

    return {
        botList,
        selectedBotId,
        isOnline,
        botUptime,
        botUptimeFormatted,
        lastBot,
        selectedBot,
        getBotList,
        setOnlineStatus,
        updateUptime,
        updateUptimeFormatted,
        setSelectedBot,
        getSelectedBotId,
    };
});
