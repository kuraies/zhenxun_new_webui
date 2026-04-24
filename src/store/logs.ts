import { defineStore } from "pinia";
import { ref } from "vue";
import {
    connectLogsWebSocket,
    disconnectLogsWebSocket,
    onLogMessage,
} from "@/utils/api-next/websocket-logs";
import type { LogEntry } from "@/types/log.types";

export const useLogsStore = defineStore("logs", () => {
    const logs = ref<LogEntry[]>([]);
    const maxLogs = 1000; // 最大存储日志条数
    const wsInitialized = ref(false);

    // 是否启用自动滚动
    const autoScroll = ref(true);

    /**
     * 添加日志
     */
    const addLog = (log: LogEntry) => {
        logs.value.push(log);

        // 限制日志数量，防止内存溢出
        if (logs.value.length > maxLogs) {
            logs.value.shift();
        }
    };

    /**
     * 清空日志
     */
    const clearLogs = () => {
        logs.value = [];
    };

    /**
     * 初始化 WebSocket 连接
     */
    const initWebSocket = () => {
        if (wsInitialized.value) return;

        // 使用新的 api-next 方式初始化
        connectLogsWebSocket();
        onLogMessage((log) => {
            addLog(log);
        });
        wsInitialized.value = true;
    };

    /**
     * 断开 WebSocket 连接
     */
    const disconnectWebSocket = () => {
        disconnectLogsWebSocket();
        wsInitialized.value = false;
    };

    /**
     * 根据级别过滤日志
     */
    const getLogsByLevel = (levels: import("@/types/log.types").LogLevel[]) => {
        if (!levels || levels.length === 0) {
            return logs.value;
        }
        return logs.value.filter((log) => levels.includes(log.level));
    };

    /**
     * 搜索日志
     */
    const searchLogs = (keyword: string) => {
        if (!keyword) {
            return logs.value;
        }
        return logs.value.filter(
            (log) =>
                log.message.toLowerCase().includes(keyword.toLowerCase()) ||
                (log.module &&
                    log.module.toLowerCase().includes(keyword.toLowerCase())),
        );
    };

    return {
        logs,
        maxLogs,
        wsInitialized,
        autoScroll,
        addLog,
        clearLogs,
        initWebSocket,
        getLogsByLevel,
        searchLogs,
    };
});
