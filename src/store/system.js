import { defineStore } from 'pinia';
import { ref, reactive, computed, watch } from 'vue';
import { botApi } from "@/utils/api/bot.js";
import { useWebSocketStore } from "@/store/websocket.js";

/**
 * 系统状态与统计数据管理 Store。
 *
 * 主要功能包括：
 * - 维护系统运行状态（CPU / 内存 / 磁盘 使用率）
 * - 维护业务统计数据（历史/今日 聊天数、调用数）
 * - 定时轮询后端接口以更新统计数据
 * - 通过 WebSocket 实时接收系统状态更新
 * - 支持 localStorage 缓存数据的恢复与保存
 *
 * @typedef {import('pinia').StoreDefinition<'system', {
 *   count: {
 *     chat_num: number;
 *     chat_day: number;
 *     call_num: number;
 *     call_day: number;
 *   };
 *   systemStatus: {
 *     cpu: number;
 *     memory: number;
 *     disk: number;
 *   };
 * }, {
 *   startPolling: () => void;
 *   stopPolling: () => void;
 * }, {}>} UseSystemStore
 */

export const useSystemStore = defineStore('system', () => {
    /**
     * 统计相关数据，包含历史总数与今日数据
     * @type {{
     *   chat_num: number;  // 历史总聊天数量
     *   chat_day: number;  // 今日聊天数量
     *   call_num: number;  // 历史总调用次数
     *   call_day: number;  // 今日调用次数
     * }}
     */
    const count = reactive({
        chat_num: 0,
        chat_day: 0,
        call_num: 0,
        call_day: 0
    });

    /**
     * 系统运行状态，表示当前资源使用率（通常为 0~100 的百分比数值）
     * @type {{
     *   cpu: number;     // CPU 使用率（%）
     *   memory: number;  // 内存使用率（%）
     *   disk: number;    // 磁盘使用率（%）
     * }}
     */
    const systemStatus = reactive({
        cpu: 0,
        memory: 0,
        disk: 0
    });

    /**
     * 轮询定时器句柄，用于定时拉取统计数据
     * @type {ReturnType<typeof setInterval> | null}
     */
    let pollingInterval = null;

    /**
     * 引入 WebSocket 状态管理 Store，用于监听系统状态消息
     * @type {import('@/store/websocket.js').useWebSocketStore}
     */
    const socketStore = useWebSocketStore();

    /**
     * 获取 WebSocket 中 system_status 类型的消息流（计算属性）
     * @type {import('vue').ComputedRef<any>}
     */
    const messages = computed(() => socketStore.getMessages('system_status'));

    /**
     * 监听来自 WebSocket 的系统状态更新，并同步到本地 systemStatus 对象
     * 支持立即触发（immediate: true），确保初始化时也能响应已有数据
     */
    watch(
        messages,
        (newVal) => {
            if (newVal) {
                systemStatus.cpu = newVal?.cpu ?? 0;
                systemStatus.memory = newVal?.memory ?? 0;
                systemStatus.disk = newVal?.disk ?? 0;
            }
        },
        { immediate: true }
    );

    /**
     * 定时轮询接口以获取最新的聊天与调用统计数据
     * 每 5 秒执行一次，更新 count 状态，并可选地缓存到 localStorage
     */
    function pollingCount() {
        pollingInterval = setInterval(async () => {
            try {
                const res = await botApi.get_chat_and_call_count();
                if (res?.data) {
                    Object.assign(count, res.data);
                    // 可选：将统计数据缓存到本地，防止刷新丢失
                    localStorage.setItem('chat_call_count', JSON.stringify(res.data));
                }
            } catch (err) {
                console.error('❌ 轮询获取统计失败:', err);
            }
        }, 5000);
    }

    /**
     * 从 localStorage 恢复之前缓存的统计数据（如页面刷新后重新初始化）
     */
    function restoreCount() {
        const cached = localStorage.getItem('chat_call_count');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                Object.assign(count, parsed);
            } catch (e) {
                console.error('❌ 解析 chat_call_count 缓存失败:', e);
            }
        }
    }

    /**
     * 从 localStorage 恢复之前缓存系统状态数据
     */
    function restoreSystemStatus() {
        const cached = localStorage.getItem('system_status');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                Object.assign(systemStatus, parsed);
            } catch (e) {
                console.error('❌ 解析 system_status 缓存失败:', e);
            }
        }
    }

    /**
     * 启动所有数据恢复和定时任务
     * 包括：恢复本地缓存数据、启动轮询定时器
     */
    function startPolling() {
        restoreCount();
        restoreSystemStatus();
        pollingCount();
    }

    /**
     * 停止轮询任务，并将当前统计数据与系统状态保存至 localStorage
     * 通常在页面卸载 / 用户退出前调用，用于持久化当前状态
     */
    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        // 将当前状态持久化到本地存储
        localStorage.setItem('chat_call_count', JSON.stringify(count));
        localStorage.setItem('system_status', JSON.stringify(systemStatus));
    }

    return {
        // 状态数据
        count,
        systemStatus,

        // 控制方法
        startPolling,
        stopPolling,
    };
});