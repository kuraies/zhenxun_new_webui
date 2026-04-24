<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Database,
    FileText,
    Play,
    Table,
    Trash2,
    XCircle,
} from "lucide-vue-next";
import { databaseApi } from "@/utils/api-next";
import { ZXNotification } from "@/components";
import { useGlobalStore } from "@/store/global.ts";
import { useDatabaseStore } from "@/store/database.ts";
import { storeToRefs } from "pinia";

const globalStore = useGlobalStore();
const databaseStore = useDatabaseStore();

const { showSqlLog, sqlLogList, sqlLogLoading } = storeToRefs(databaseStore);

const { openSqlLog } = databaseStore;

// 选中的表
const selectedTable = ref<string>("");
const tableList = ref<string[]>([]);
const tableColumns = ref<
    Array<{
        name: string;
        type: string;
        nullable: boolean;
        default?: string | null;
        primary_key?: boolean;
    }>
>([]);
const tableData = ref<any[]>([]);
const dataLoading = ref(false);

// 分页
const currentPage = ref(1);
const pageSize = ref(20);
const totalRows = ref(0);

// SQL 编辑器
const sqlEditor = ref("");
const sqlResult = ref<{ columns: string[]; rows: any[] } | null>(null);
const sqlExecuting = ref(false);

// 常用 SQL
const commonSqlList = ref<{ name: string; sql: string }[]>([]);

// 表详情显示模式
const tableDetailView = ref<"data" | "structure" | "sql_result">("data");

// 加载表列表
const loadTableList = async () => {
    try {
        const res = await databaseApi.getTableList();
        if (res?.success && res.data) {
            tableList.value = res.data || [];
            if (tableList.value.length > 0 && !selectedTable.value) {
                selectedTable.value = tableList.value[0];
                loadTableColumns();
                loadTableData();
            }
        }
    } catch (error) {
        ZXNotification({
            title: "呜呼～",
            message: "表列表加载失败了 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
    }
};

// 加载表列信息
const loadTableColumns = async () => {
    if (!selectedTable.value) return;
    try {
        const res = await databaseApi.getTableColumns(selectedTable.value);
        if (res?.success && res.data) {
            // 后端返回：{name, type, nullable, default, primary_key}[]
            tableColumns.value = res.data;
        }
    } catch (error) {
        // 静默失败
    }
};

// 加载表数据
const loadTableData = async (page: number = 1) => {
    if (!selectedTable.value) return;
    dataLoading.value = true;
    try {
        const res = await databaseApi.getTableData(
            selectedTable.value,
            page,
            pageSize.value,
        );
        if (res?.success && res.data) {
            tableData.value = res.data.items || [];
            totalRows.value = res.data.total || 0;
            currentPage.value = page;
        }
    } catch (error) {
        ZXNotification({
            title: "呜呼～",
            message: "数据加载失败了 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
    } finally {
        dataLoading.value = false;
    }
};

// 选择表
const selectTable = (tableName: string) => {
    selectedTable.value = tableName;
    tableDetailView.value = "data";
    loadTableColumns();
    loadTableData();
};

// 切换分页
const changePage = (delta: number) => {
    const newPage = currentPage.value + delta;
    if (
        newPage >= 1 &&
        newPage <= Math.ceil(totalRows.value / pageSize.value)
    ) {
        loadTableData(newPage);
    }
};

// 执行 SQL
const executeSql = async () => {
    if (!sqlEditor.value.trim()) {
        ZXNotification({
            title: "提示",
            message: "SQL 不能为空哦～",
            type: "info",
            position: "top-right",
        });
        return;
    }

    sqlExecuting.value = true;
    try {
        const res: any = await databaseApi.execSql(sqlEditor.value);
        console.log("SQL 执行响应:", JSON.stringify(res, null, 2));
        // execSql 返回 Result.ok(data) 或 Result.ok(info)，SELECT 返回查询结果，其他返回成功信息
        // 检查响应中的 success 字段
        if (res?.success === false) {
            // 后端返回成功但业务逻辑失败
            ZXNotification({
                title: "执行失败",
                message: res.message || "SQL 执行失败了 (´；ω；`)",
                type: "😭",
                position: "top-right",
            });
            return;
        }

        if (res?.success) {
            // res.data 是 SqlExecuteResult，包含 {success, message, data, rows_affected}
            const sqlResultData = res.data?.data;
            console.log("SQL 结果数据:", sqlResultData);
            // 如果是 SELECT 语句，返回查询结果
            if (
                sqlEditor.value.trim().toLowerCase().startsWith("select") &&
                Array.isArray(sqlResultData)
            ) {
                sqlResult.value = {
                    columns:
                        sqlResultData.length > 0
                            ? Object.keys(sqlResultData[0])
                            : [],
                    rows: sqlResultData,
                };
                // 自动切换到 SQL 结果视图
                tableDetailView.value = "sql_result";
                console.log("SQL 结果视图已设置:", sqlResult.value);
                ZXNotification({
                    title: "执行成功～",
                    message: `SQL 执行成功，返回 ${sqlResultData.length} 条记录 ✨`,
                    type: "🎉",
                    position: "top-right",
                    confetti: true,
                });
            } else {
                // 非 SELECT 语句，只显示成功消息
                ZXNotification({
                    title: "执行成功～",
                    message: res.data?.message || "SQL 执行成功！",
                    type: "🎉",
                    position: "top-right",
                    confetti: true,
                });
            }
            // 刷新表列表（可能是 DROP/CREATE 操作）
            loadTableList();
        }
    } catch (error: any) {
        console.error("SQL 执行异常:", error);
        ZXNotification({
            title: "执行失败",
            message:
                error.response?.data?.message ||
                error.response?.data?.info ||
                error.message ||
                "SQL 执行失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    } finally {
        sqlExecuting.value = false;
    }
};

// 加载常用 SQL
const loadCommonSql = async () => {
    try {
        const res: any = await databaseApi.getCommonSql();
        // 后端返回 Result.ok(SQL_DICT)，SQL_DICT 是 Record<string, SqlModel>
        // SqlModel: { name: string, module: string, sql_list: CommonSql[] }
        if (res?.success && res.data) {
            // 转换为前端需要的格式：{ name: string, sql: string }[]
            const result: { name: string; sql: string }[] = [];
            Object.values(res.data as Record<string, any>).forEach(
                (plugin: any) => {
                    if (plugin?.sql_list) {
                        plugin.sql_list.forEach((sql: any) => {
                            result.push({
                                name: `${plugin.name || plugin.module} - ${sql.name}`,
                                sql: sql.sql,
                            });
                        });
                    }
                },
            );
            commonSqlList.value = result;
        }
    } catch (error) {
        // 静默失败
    }
};

// 加载常用 SQL 到编辑器
const loadCommonSqlToEditor = (sql: string) => {
    sqlEditor.value = sql;
};

// 分页信息
const pageInfo = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value + 1;
    const end = Math.min(currentPage.value * pageSize.value, totalRows.value);
    return `显示 ${start}-${end} 条，共 ${totalRows.value} 条`;
});

onMounted(() => {
    loadTableList();
    loadCommonSql();
});
</script>

<template>
    <div
        class="flex h-full w-full flex-col space-y-4"
        style="max-width: 100vw; width: 100%"
    >
        <!-- 头部标题 -->
        <div
            class="flex flex-shrink-0 items-center justify-between rounded-4xl border-1 border-slate-200 bg-white p-4 shadow-sm"
            v-if="!globalStore.isDesktopMode"
        >
            <div class="flex items-center space-x-3">
                <Database class="h-6 w-6 flex-shrink-0 text-blue-500" />
                <h2 class="text-lg font-semibold text-gray-800">数据库管理</h2>
            </div>
            <div class="flex items-center space-x-2">
                <button
                    @click="openSqlLog"
                    class="btn-touch flex cursor-pointer items-center space-x-2 rounded-2xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:px-4"
                >
                    <Clock class="h-4 w-4" />
                    <span class="hidden sm:inline">SQL 日志</span>
                </button>
            </div>
        </div>

        <!-- SQL 执行区域 - 顶部 -->
        <div
            class="flex flex-shrink-0 flex-col rounded-4xl border-1 border-slate-200 bg-white p-4 pb-1 shadow-sm"
        >
            <div class="border-b border-gray-100 p-3">
                <div
                    class="flex items-center space-x-2 text-sm font-semibold text-gray-700"
                >
                    <FileText class="h-4 w-4" />
                    <span>SQL 执行</span>
                </div>
            </div>

            <div class="flex flex-col gap-3 p-3 sm:flex-row">
                <!-- 常用 SQL 列表 - 移动端隐藏，桌面端显示 -->
                <!--                <div class="hidden sm:block sm:w-48 flex-shrink-0">-->
                <!--                    <div class="text-xs font-medium text-gray-500 mb-2">常用 SQL</div>-->
                <!--                    <div class="max-h-24 overflow-y-auto space-y-1">-->
                <!--                        <div-->
                <!--                            v-for="(item, index) in commonSqlList"-->
                <!--                            :key="index"-->
                <!--                            @click="loadCommonSqlToEditor(item.sql)"-->
                <!--                            class="p-2 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors"-->
                <!--                        >-->
                <!--                            <span class="text-sm text-gray-700 truncate block">{{ item.name }}</span>-->
                <!--                        </div>-->
                <!--                        <div v-if="commonSqlList.length === 0" class="text-center text-gray-400 py-4 text-xs">-->
                <!--                            暂无常用 SQL-->
                <!--                        </div>-->
                <!--                    </div>-->
                <!--                </div>-->

                <!-- SQL 编辑器 -->
                <div class="min-w-0 flex-1">
                    <textarea
                        v-model="sqlEditor"
                        placeholder="输入 SQL 语句..."
                        class="w-full resize-none rounded-2xl border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none"
                        rows="3"
                    ></textarea>
                    <div
                        class="mt-2 flex flex-wrap items-center justify-between gap-2"
                    >
                        <button
                            @click="executeSql"
                            :disabled="sqlExecuting || !sqlEditor.trim()"
                            class="btn-touch flex cursor-pointer items-center space-x-2 rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                        >
                            <Play class="h-4 w-4" />
                            <span>{{
                                sqlExecuting ? "执行中..." : "执行 SQL"
                            }}</span>
                        </button>
                        <span
                            v-if="sqlResult"
                            class="flex items-center text-xs text-green-600"
                        >
                            <CheckCircle class="mr-1 h-3.5 w-3.5" />
                            已执行 {{ sqlResult.rows.length }} 条结果
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 主内容区域 - 移动端可滚动，桌面端固定布局 -->
        <div class="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row">
            <!-- 左侧表列表 - 移动端紧凑显示 -->
            <div
                class="flex w-full flex-shrink-0 flex-col rounded-4xl border-1 border-slate-200 bg-white pb-4 shadow-sm sm:max-h-full sm:w-64"
            >
                <div
                    class="flex-shrink-0 border-b border-gray-100 p-3 px-4 pt-4"
                >
                    <div
                        class="flex items-center space-x-2 text-sm font-semibold text-gray-700"
                    >
                        <Table class="h-4 w-4" />
                        <span>数据表</span>
                    </div>
                </div>
                <!-- 移动端水平滚动列表，桌面端垂直列表 -->
                <div
                    class="flex-1 overflow-x-auto p-2 pb-1 sm:space-y-1 sm:overflow-x-visible sm:overflow-y-auto"
                >
                    <!-- 移动端水平布局 -->
                    <div
                        class="flex min-w-max gap-1 sm:min-w-0 sm:flex-col sm:gap-0"
                    >
                        <div
                            v-for="table in tableList"
                            :key="table"
                            @click="selectTable(table)"
                            :class="
                                selectedTable === table
                                    ? 'bg-blue-50'
                                    : 'hover:bg-gray-50'
                            "
                            class="flex-shrink-0 cursor-pointer rounded-2xl p-2 transition-colors sm:flex-shrink"
                        >
                            <span class="truncate text-sm text-gray-700">{{
                                table
                            }}</span>
                        </div>
                    </div>
                    <div
                        v-if="tableList.length === 0"
                        class="hidden py-8 text-center text-gray-400 sm:block"
                    >
                        <Table class="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p class="text-sm">暂无数据表</p>
                    </div>
                </div>
            </div>

            <!-- 右侧表数据/结构 + SQL 结果 -->
            <div
                class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-4xl border-1 border-slate-200 bg-white shadow-sm"
            >
                <!-- 表头部 -->
                <div
                    class="flex flex-shrink-0 items-center justify-between border-b border-gray-100 p-5 pt-4 pb-2"
                >
                    <!-- 左侧：表名 -->
                    <span class="truncate font-semibold text-gray-700">{{
                        selectedTable || "请选择表"
                    }}</span>
                    <!-- 右侧：视图切换按钮 -->
                    <div class="flex flex-shrink-0 space-x-1">
                        <button
                            @click="tableDetailView = 'data'"
                            :class="
                                tableDetailView === 'data'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                            "
                            class="cursor-pointer rounded-2xl px-4 py-1 text-xs font-medium transition-colors"
                        >
                            数据
                        </button>
                        <button
                            @click="tableDetailView = 'structure'"
                            :class="
                                tableDetailView === 'structure'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                            "
                            class="cursor-pointer rounded-2xl px-4 py-1 text-xs font-medium transition-colors"
                        >
                            结构
                        </button>
                        <button
                            @click="tableDetailView = 'sql_result'"
                            :class="
                                tableDetailView === 'sql_result'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                            "
                            class="cursor-pointer rounded-2xl px-4 py-1 text-xs font-medium transition-colors"
                        >
                            SQL 结果
                        </button>
                    </div>
                </div>

                <!-- 表内容 -->
                <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div
                        v-if="!selectedTable && !sqlResult"
                        class="flex h-full items-center justify-center text-gray-400"
                    >
                        <div class="text-center">
                            <Database
                                class="mx-auto mb-4 h-16 w-16 opacity-50"
                            />
                            <p>请选择一个数据表或执行 SQL</p>
                        </div>
                    </div>

                    <!-- SQL 结果视图 - 始终显示 -->
                    <div
                        v-if="tableDetailView === 'sql_result'"
                        class="flex-1 overflow-auto"
                    >
                        <div
                            v-if="!sqlResult"
                            class="flex h-full items-center justify-center"
                        >
                            <div class="text-center text-gray-400">
                                <FileText
                                    class="mx-auto mb-4 h-16 w-16 opacity-50"
                                />
                                <p>暂无 SQL 结果</p>
                                <p class="mt-2 text-sm">
                                    请执行 SQL 查询后查看结果
                                </p>
                            </div>
                        </div>
                        <div
                            v-else-if="sqlResult.rows.length > 0"
                            class="h-full"
                        >
                            <div
                                class="overflow-auto"
                                style="min-width: max-content"
                            >
                                <table class="w-full border-collapse">
                                    <thead class="sticky top-0 z-10 bg-gray-50">
                                        <tr>
                                            <th
                                                v-for="col in sqlResult.columns"
                                                :key="col"
                                                class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase"
                                            >
                                                <span :title="col">{{
                                                    col
                                                }}</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        class="divide-y divide-gray-100 bg-white"
                                    >
                                        <tr
                                            v-for="(
                                                row, index
                                            ) in sqlResult.rows"
                                            :key="index"
                                            class="hover:bg-gray-50"
                                        >
                                            <td
                                                v-for="col in sqlResult.columns"
                                                :key="col"
                                                class="max-w-xs overflow-hidden px-4 py-3 text-sm break-words overflow-ellipsis text-gray-700"
                                            >
                                                <span :title="row[col]">{{
                                                    row[col]
                                                }}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div
                            v-else
                            class="flex h-full items-center justify-center"
                        >
                            <div class="text-center text-gray-400">
                                <CheckCircle
                                    class="mx-auto mb-4 h-16 w-16 opacity-50"
                                />
                                <p>执行成功，无返回数据</p>
                            </div>
                        </div>
                    </div>

                    <!-- 数据视图 -->
                    <div
                        v-else-if="tableDetailView === 'data' && selectedTable"
                        class="flex flex-1 flex-col overflow-hidden"
                    >
                        <div
                            v-if="dataLoading"
                            class="flex h-full items-center justify-center"
                        >
                            <div class="text-center text-gray-400">
                                <Table
                                    class="mx-auto mb-4 h-16 w-16 animate-pulse"
                                />
                                <p>加载中...</p>
                            </div>
                        </div>
                        <div
                            v-else-if="tableData.length === 0"
                            class="flex h-full items-center justify-center"
                        >
                            <div class="text-center text-gray-400">
                                <Table
                                    class="mx-auto mb-4 h-16 w-16 opacity-50"
                                />
                                <p>此表为空</p>
                            </div>
                        </div>
                        <div
                            v-else
                            class="flex flex-1 flex-col overflow-hidden"
                        >
                            <div class="flex-1 overflow-auto overflow-x-scroll">
                                <div
                                    class="overflow-auto overflow-x-scroll"
                                    style="min-width: max-content"
                                >
                                    <table class="w-full border-collapse">
                                        <thead
                                            class="sticky top-0 z-10 bg-gray-50"
                                        >
                                            <tr>
                                                <th
                                                    v-for="(
                                                        col, index
                                                    ) in tableColumns"
                                                    :key="index"
                                                    class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase"
                                                >
                                                    <div
                                                        class="flex items-center"
                                                    >
                                                        <span
                                                            :title="col.name"
                                                            >{{
                                                                col.name
                                                            }}</span
                                                        >
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody
                                            class="divide-y divide-gray-100 bg-white"
                                        >
                                            <tr
                                                v-for="(
                                                    row, rowIndex
                                                ) in tableData"
                                                :key="rowIndex"
                                                class="hover:bg-gray-50"
                                            >
                                                <td
                                                    v-for="(
                                                        col, colIndex
                                                    ) in tableColumns"
                                                    :key="colIndex"
                                                    class="max-w-xs overflow-hidden px-4 py-3 text-sm break-words overflow-ellipsis text-gray-700"
                                                >
                                                    <span
                                                        :title="
                                                            row.data[col.name]
                                                        "
                                                        >{{
                                                            row.data[col.name]
                                                        }}</span
                                                    >
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <!-- 分页 -->
                            <div
                                class="flex flex-shrink-0 items-center justify-between border-t border-gray-100 p-3"
                            >
                                <span class="text-sm text-gray-500">{{
                                    pageInfo
                                }}</span>
                                <div class="flex space-x-2">
                                    <button
                                        @click="changePage(-1)"
                                        :disabled="currentPage === 1"
                                        class="rounded-2xl p-1.5 transition-colors hover:bg-gray-100 disabled:opacity-30"
                                    >
                                        <ChevronLeft class="h-4 w-4" />
                                    </button>
                                    <button
                                        @click="changePage(1)"
                                        :disabled="
                                            currentPage >=
                                            Math.ceil(totalRows / pageSize)
                                        "
                                        class="rounded-2xl p-1.5 transition-colors hover:bg-gray-100 disabled:opacity-30"
                                    >
                                        <ChevronRight class="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 结构视图 -->
                    <div
                        v-else-if="
                            tableDetailView === 'structure' && selectedTable
                        "
                        class="flex-1 overflow-auto"
                    >
                        <div class="h-full">
                            <div
                                class="overflow-auto"
                                style="min-width: max-content"
                            >
                                <table class="w-full border-collapse">
                                    <thead class="sticky top-0 z-10 bg-gray-50">
                                        <tr>
                                            <th
                                                class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase"
                                            >
                                                列名
                                            </th>
                                            <th
                                                class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase"
                                            >
                                                类型
                                            </th>
                                            <th
                                                class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase"
                                            >
                                                可空
                                            </th>
                                            <th
                                                class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase"
                                            >
                                                默认值
                                            </th>
                                            <th
                                                class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase"
                                            >
                                                主键
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        class="divide-y divide-gray-100 bg-white"
                                    >
                                        <tr
                                            v-for="col in tableColumns"
                                            :key="col.name"
                                            class="hover:bg-gray-50"
                                        >
                                            <td
                                                class="px-4 py-3 text-sm font-medium text-gray-700"
                                            >
                                                {{ col.name }}
                                            </td>
                                            <td
                                                class="px-4 py-3 font-mono text-sm text-gray-500"
                                            >
                                                {{ col.type }}
                                            </td>
                                            <td class="px-4 py-3 text-sm">
                                                <span
                                                    :class="
                                                        col.nullable
                                                            ? 'text-green-600'
                                                            : 'text-gray-400'
                                                    "
                                                >
                                                    {{
                                                        col.nullable
                                                            ? "是"
                                                            : "否"
                                                    }}
                                                </span>
                                            </td>
                                            <td
                                                class="px-4 py-3 font-mono text-sm text-gray-500"
                                            >
                                                {{ col.default ?? "NULL" }}
                                            </td>
                                            <td class="px-4 py-3 text-sm">
                                                <span
                                                    v-if="col.primary_key"
                                                    class="text-yellow-600"
                                                    >🔑 是</span
                                                >
                                                <span
                                                    v-else
                                                    class="text-gray-400"
                                                    >否</span
                                                >
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- SQL 日志对话框 -->
        <Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">
            <div
                v-if="showSqlLog"
                class="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
                @click="showSqlLog = false"
            >
                <div
                    class="modal-content flex max-h-[85vh] w-full max-w-[600px] flex-col rounded-2xl bg-white p-4 shadow-xl sm:max-h-[70vh] sm:p-6"
                    @click.stop
                >
                    <div class="mb-4 flex items-center justify-between">
                        <h3
                            class="flex items-center space-x-2 text-base font-semibold text-gray-800 sm:text-lg"
                        >
                            <Clock class="h-5 w-5" />
                            <span>SQL 执行日志</span>
                        </h3>
                        <button
                            @click="showSqlLog = false"
                            class="rounded-2xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
                        >
                            <Trash2 class="h-5 w-5" />
                        </button>
                    </div>

                    <div class="min-h-0 flex-1 overflow-y-auto">
                        <div
                            v-if="sqlLogLoading"
                            class="py-8 text-center text-gray-400"
                        >
                            <Clock class="mx-auto mb-2 h-8 w-8 animate-pulse" />
                            <p>加载中...</p>
                        </div>
                        <div
                            v-else-if="sqlLogList.length === 0"
                            class="py-8 text-center text-gray-400"
                        >
                            <Clock class="mx-auto mb-2 h-8 w-8 opacity-50" />
                            <p>暂无日志记录</p>
                        </div>
                        <div v-else class="space-y-2">
                            <div
                                v-for="log in sqlLogList"
                                :key="log.id"
                                :class="
                                    log.is_success ? 'bg-green-50' : 'bg-red-50'
                                "
                                class="rounded-2xl p-3"
                            >
                                <div
                                    class="mb-2 flex items-center justify-between"
                                >
                                    <div class="flex items-center space-x-2">
                                        <span
                                            v-if="log.is_success"
                                            class="text-green-600"
                                        >
                                            <CheckCircle
                                                class="inline h-4 w-4"
                                            />
                                        </span>
                                        <span v-else class="text-red-600">
                                            <XCircle class="inline h-4 w-4" />
                                        </span>
                                        <span
                                            class="text-sm font-medium text-gray-700"
                                        >
                                            {{
                                                log.created_at
                                                    ? new Date(
                                                          log.created_at,
                                                      ).toLocaleString()
                                                    : ""
                                            }}
                                        </span>
                                    </div>
                                </div>
                                <pre
                                    class="font-mono text-xs break-all whitespace-pre-wrap text-gray-600"
                                    >{{ log.sql }}</pre
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
    width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}
</style>
