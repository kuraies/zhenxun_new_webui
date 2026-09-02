import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { mainApi } from "@/utils/api-next";
import { ZXNotification } from "@/services/ui";
import defaultAva from "@/assets/img/avatar.jpg";
import type { BotInfo } from "@/types/api-next.types";

/**
 * 比对刷新前后的机器人列表，谁上线/下线了就弹通知
 * （此前列表为空说明是首次加载，只建立基线不弹，避免整表都算"上线"）
 */
function notifyBotChanges(prev: BotInfo[], next: BotInfo[]) {
    if (prev.length === 0) return;
    const displayName = (b: BotInfo) => b.nickname?.trim() || "未知 Bot";
    const nextIds = new Set(next.map((b) => b.self_id));
    const prevIds = new Set(prev.map((b) => b.self_id));
    for (const b of prev) {
        if (!nextIds.has(b.self_id)) {
            ZXNotification({
                title: displayName(b),
                subtitle: b.self_id ?? "",
                avatar: b.ava_url || defaultAva,
                message: "下线了",
                type: "warning",
            });
        }
    }
    for (const b of next) {
        if (!prevIds.has(b.self_id)) {
            ZXNotification({
                title: displayName(b),
                subtitle: b.self_id ?? "",
                avatar: b.ava_url || defaultAva,
                message: "上线了",
                type: "success",
            });
        }
    }
}

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

    // 当前选中的 Bot ID（持久化到 localStorage，刷新后恢复）
    const SELECTED_BOT_KEY = "selectedBotId";
    const selectedBotId = ref<string | null>(
        localStorage.getItem(SELECTED_BOT_KEY),
    );

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

    // 计算属性，获取当前选中的 Bot（优先使用 selectedBotId；
    // 本地恢复的 id 不在列表里时回退到第一个 bot）
    const selectedBot = computed(() => {
        if (!selectedBotId.value) return botList.value[0];
        return (
            botList.value.find((b) => b.self_id === selectedBotId.value) ||
            botList.value[0]
        );
    });

    /**
     * 获取机器人列表
     */
    async function getBotList() {
        try {
            const res = await mainApi.getBotList();
            if (res?.success && res?.data) {
                // 刷新前正在展示的 bot（selectedBotId 为空时展示第一个）
                const prevDisplayed = selectedBot.value?.self_id ?? null;
                const prevList = botList.value;
                botList.value = res.data;
                // bot 上下线通知：与刷新前列表比对，有进出就弹
                notifyBotChanges(prevList, res.data);

                // 选中的 id 不在新列表里（从未选择 / 本地恢复的 id 已下线，
                // 如上次模拟端连接后退出）时归一：优先回到刷新前展示的 bot，
                // 否则选第一个。否则模拟端一连上就会"自动切换"到它
                const stillExists = res.data.some(
                    (b) => b.self_id === selectedBotId.value,
                );
                if (!stillExists) {
                    if (
                        prevDisplayed &&
                        res.data.some((b) => b.self_id === prevDisplayed)
                    ) {
                        setSelectedBot(prevDisplayed);
                    } else if (res.data[0]) {
                        setSelectedBot(res.data[0].self_id);
                    }
                }
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
        if (botId) {
            localStorage.setItem(SELECTED_BOT_KEY, botId);
        } else {
            localStorage.removeItem(SELECTED_BOT_KEY);
        }
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
