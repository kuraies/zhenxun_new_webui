import { defineStore } from "pinia";
import { ref } from "vue";
import { databaseApi } from "@/utils/api-next";
import { SqlLog } from "@/types/api-next.types.ts";

export const useDatabaseStore = defineStore("database", () => {
    // SQL 日志
    const showSqlLog = ref(false);
    const sqlLogList = ref<SqlLog[]>([]);
    const sqlLogLoading = ref(false);

    // 加载 SQL 日志
    const loadSqlLog = async () => {
        sqlLogLoading.value = true;
        try {
            const res: any = await databaseApi.getSqlLog();
            // 后端返回 Result.ok(BaseResultModel(total, data))
            // BaseResultModel 格式：{ total: number, data: SqlLogInfo[] }
            // SqlLogInfo 只有 sql 字段，需要补充其他字段
            if (res?.success && res.data) {
                sqlLogList.value = (res.data.data || []).map(
                    (item: any, index: number) => ({
                        id: index,
                        sql: item.sql,
                        is_success: true, // 后端只有成功才记录
                        ip: "unknown",
                        created_at: "",
                    }),
                );
            }
        } catch (error) {
            // 静默失败
        } finally {
            sqlLogLoading.value = false;
        }
    };

    // 打开 SQL 日志
    const openSqlLog = () => {
        showSqlLog.value = true;
        loadSqlLog();
    };

    return { showSqlLog, sqlLogList, sqlLogLoading, loadSqlLog, openSqlLog };
});
