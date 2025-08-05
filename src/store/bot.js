import { botApi } from "@/utils/api/bot.js";

/**
 * Pinia Store 用于管理机器人相关状态，包括机器人列表、统计数据和系统状态等。
 *
 * @module useBotStore
 * @typedef {import('pinia').StoreDefinition<'bot', {
 *   botList: import('vue').Ref<Array<any>>;
 * }, {
 *   botList: import('vue').Ref<Array<any>>;
 *   lastBot: import('vue').ComputedRef<{ ava_url: string; nickname: string } | undefined>;
 *   getBotList: () => Promise<void>;
 * }, {}>} UseBotStore
 */

export const useBotStore = defineStore("bot", () => {
    /**
     * 响应式引用，用于存储机器人列表数据。
     * 数据结构为数组，每个元素为机器人对象（具体字段由后端返回决定）。
     * @type {import('vue').Ref<Array<any>>}
     */
    const botList = ref([]);

    /**
     * 计算属性，用于获取机器人列表中的最后一个机器人对象。
     * 如果列表为空，则返回 undefined。
     *
     * @type {import('vue').ComputedRef<{ ava_url: string; nickname: string } | undefined>}
     * @readonly
     */
    const lastBot = computed(() => botList.value.at(-1));


    /**
     * 从后端 API 获取机器人列表，并更新本地 botList 状态。
     * 成功时将返回的数据赋值给 botList.value；失败时打印错误日志。
     *
     * @async
     * @function getBotList
     */
    function getBotList() {
        botApi
            .get_bot_list()
            .then((res) => {
                if (res?.suc) {
                    console.log("获取机器人列表成功：", res);
                    botList.value = res.data;
                } else {
                    console.warn("获取机器人列表失败或返回数据无效：", res);
                }
            })
            .catch((err) => {
                console.error("获取机器人列表时发生错误：", err);
            });
    }

    return {
        // 机器人列表相关
        botList,
        lastBot,
        getBotList,
    };
});