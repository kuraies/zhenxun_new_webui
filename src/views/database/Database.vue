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
import { ZXNotification } from "@/services/ui";
import { useGlobalStore } from "@/store/global.ts";
import { useDatabaseStore } from "@/store/database.ts";
import { storeToRefs } from "pinia";

const globalStore = useGlobalStore();
const databaseStore = useDatabaseStore();

const { showSqlLog, sqlLogList, sqlLogLoading } = storeToRefs(databaseStore);

const { openSqlLog } = databaseStore;

type TableColumn = {
    name: string;
    type: string;
    nullable: boolean;
    default?: string | null;
    primary_key?: boolean;
};

type TableRow = Record<string, any> & {
    data?: Record<string, any>;
};

// 选中的表
const selectedTable = ref<string>("");
const tableList = ref<string[]>([]);
const tableColumns = ref<TableColumn[]>([]);
const tableData = ref<TableRow[]>([]);
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

const toArray = <T,>(value: any, keys: string[] = []): T[] => {
    if (Array.isArray(value)) return value;

    for (const key of keys) {
        if (Array.isArray(value?.[key])) return value[key];
    }

    return [];
};

const normalizeColumn = (column: any): TableColumn => {
    const isNullable = column?.nullable ?? column?.is_nullable;
    const primaryKey =
        column?.primary_key ?? column?.is_primary_key ?? column?.pk;

    return {
        name:
            column?.name ??
            column?.column_name ??
            column?.field ??
            column?.column ??
            "",
        type:
            column?.type ??
            column?.data_type ??
            column?.column_type ??
            column?.db_type ??
            "",
        nullable:
            typeof isNullable === "boolean"
                ? isNullable
                : String(isNullable).toUpperCase() === "YES" ||
                  column?.notnull === 0,
        default:
            column?.default ??
            column?.default_value ??
            column?.dflt_value ??
            null,
        primary_key:
            typeof primaryKey === "boolean"
                ? primaryKey
                : Number(primaryKey || 0) > 0,
    };
};

const getRowData = (row: TableRow) =>
    row?.data && typeof row.data === "object" ? row.data : row;

const getCellValue = (row: TableRow, columnName: string) => {
    const value = getRowData(row)?.[columnName];
    if (value === null) return "NULL";
    if (value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return value;
};

const inferColumnsFromRows = (rows: TableRow[]) => {
    const names = new Set<string>();

    rows.forEach((row) => {
        Object.keys(getRowData(row) || {}).forEach((key) => names.add(key));
    });

    return Array.from(names).map((name) => ({
        name,
        type: "",
        nullable: true,
        default: null,
        primary_key: false,
    }));
};

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
            const columns = toArray<any>(res.data, ["columns", "items"]);
            tableColumns.value = columns
                .map(normalizeColumn)
                .filter((column) => column.name);
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
            const payload = res.data as any;
            const rows = toArray<TableRow>(payload, [
                "items",
                "rows",
                "data",
                "records",
            ]);
            tableData.value = rows;
            totalRows.value =
                payload.total ?? payload.count ?? payload.total_count ?? rows.length;
            currentPage.value = page;

            if (tableColumns.value.length === 0 && rows.length > 0) {
                tableColumns.value = inferColumnsFromRows(rows);
            }
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
    <div class="database-page flex h-full w-full flex-col gap-3 overflow-hidden sm:gap-4">
        <div
            class="flex flex-shrink-0 items-center justify-between rounded-3xl border-1 border-slate-200 bg-white p-4 shadow-sm"
            v-if="!globalStore.isDesktopMode"
        >
            <div class="flex min-w-0 items-center space-x-3">
                <Database class="h-6 w-6 flex-shrink-0 text-blue-500" />
                <div class="min-w-0">
                    <h2 class="truncate text-lg font-semibold text-gray-800">
                        数据库管理
                    </h2>
                    <p class="text-xs text-gray-400">
                        {{ tableList.length }} 张表
                    </p>
                </div>
            </div>
            <button
                @click="openSqlLog"
                class="btn-touch flex cursor-pointer items-center space-x-2 rounded-2xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:px-4"
            >
                <Clock class="h-4 w-4" />
                <span class="hidden sm:inline">SQL 日志</span>
            </button>
        </div>

        <div
            class="flex flex-shrink-0 flex-col overflow-hidden rounded-3xl border-1 border-slate-200 bg-white shadow-sm"
        >
            <div
                class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3"
            >
                <div class="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                    <FileText class="h-4 w-4" />
                    <span>SQL 执行</span>
                </div>
                <span
                    v-if="sqlResult"
                    class="flex items-center text-xs text-green-600"
                >
                    <CheckCircle class="mr-1 h-3.5 w-3.5" />
                    已执行 {{ sqlResult.rows.length }} 条结果
                </span>
            </div>

            <div class="grid gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <textarea
                    v-model="sqlEditor"
                    placeholder="输入 SQL 语句..."
                    class="min-h-20 w-full resize-y rounded-2xl border border-gray-200 bg-slate-50/60 px-3 py-2 font-mono text-sm leading-6 text-gray-700 outline-none transition-colors focus:border-blue-200 focus:bg-white"
                    rows="3"
                ></textarea>
                <div
                    class="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch lg:justify-end"
                >
                    <button
                        @click="executeSql"
                        :disabled="sqlExecuting || !sqlEditor.trim()"
                        class="btn-touch flex cursor-pointer items-center justify-center space-x-2 rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                    >
                        <Play class="h-4 w-4" />
                        <span>{{ sqlExecuting ? "执行中..." : "执行 SQL" }}</span>
                    </button>
                    <button
                        @click="openSqlLog"
                        class="btn-touch hidden cursor-pointer items-center justify-center space-x-2 rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:flex"
                    >
                        <Clock class="h-4 w-4" />
                        <span>日志</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="grid min-h-0 flex-1 gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside
                class="flex min-h-0 flex-col overflow-hidden rounded-3xl border-1 border-slate-200 bg-white shadow-sm"
            >
                <div
                    class="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3"
                >
                    <div class="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                        <Table class="h-4 w-4" />
                        <span>数据表</span>
                    </div>
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {{ tableList.length }}
                    </span>
                </div>

                <div class="min-h-0 flex-1 overflow-x-auto p-2 lg:overflow-x-hidden lg:overflow-y-auto">
                    <div class="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
                        <button
                            v-for="table in tableList"
                            :key="table"
                            @click="selectTable(table)"
                            :class="
                                selectedTable === table
                                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                                    : 'text-gray-700 hover:bg-gray-50'
                            "
                            class="btn-touch flex max-w-56 flex-shrink-0 cursor-pointer items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition-colors lg:max-w-none lg:flex-shrink"
                        >
                            <span class="truncate">{{ table }}</span>
                        </button>
                    </div>
                    <div
                        v-if="tableList.length === 0"
                        class="py-8 text-center text-gray-400"
                    >
                        <Table class="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p class="text-sm">暂无数据表</p>
                    </div>
                </div>
            </aside>

            <section
                class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border-1 border-slate-200 bg-white shadow-sm"
            >
                <div
                    class="flex flex-shrink-0 flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div class="min-w-0">
                        <div class="flex min-w-0 items-center gap-2">
                            <span class="truncate font-semibold text-gray-700">
                                {{ selectedTable || "请选择表" }}
                            </span>
                            <span
                                v-if="selectedTable"
                                class="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 sm:inline-flex"
                            >
                                {{ totalRows }} 行 / {{ tableColumns.length }} 字段
                            </span>
                        </div>
                        <p class="mt-0.5 text-xs text-gray-400 sm:hidden" v-if="selectedTable">
                            {{ totalRows }} 行 / {{ tableColumns.length }} 字段
                        </p>
                    </div>

                    <div class="grid grid-cols-3 gap-1 rounded-2xl bg-gray-100 p-1 sm:flex sm:flex-shrink-0">
                        <button
                            @click="tableDetailView = 'data'"
                            :class="
                                tableDetailView === 'data'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            "
                            class="cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
                        >
                            数据
                        </button>
                        <button
                            @click="tableDetailView = 'structure'"
                            :class="
                                tableDetailView === 'structure'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            "
                            class="cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
                        >
                            结构
                        </button>
                        <button
                            @click="tableDetailView = 'sql_result'"
                            :class="
                                tableDetailView === 'sql_result'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            "
                            class="cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
                        >
                            SQL 结果
                        </button>
                    </div>
                </div>

                <div class="min-h-0 flex-1 overflow-hidden">
                    <div
                        v-if="!selectedTable && !sqlResult"
                        class="flex h-full items-center justify-center text-gray-400"
                    >
                        <div class="text-center">
                            <Database class="mx-auto mb-4 h-16 w-16 opacity-50" />
                            <p>请选择一个数据表或执行 SQL</p>
                        </div>
                    </div>

                    <div
                        v-if="tableDetailView === 'sql_result'"
                        class="h-full overflow-auto"
                    >
                        <div
                            v-if="!sqlResult"
                            class="flex h-full items-center justify-center"
                        >
                            <div class="text-center text-gray-400">
                                <FileText class="mx-auto mb-4 h-16 w-16 opacity-50" />
                                <p>暂无 SQL 结果</p>
                                <p class="mt-2 text-sm">请执行 SQL 查询后查看结果</p>
                            </div>
                        </div>
                        <div v-else-if="sqlResult.rows.length > 0" class="min-w-full">
                            <table class="min-w-full border-collapse">
                                <thead class="sticky top-0 z-10 bg-gray-50">
                                    <tr>
                                        <th
                                            v-for="col in sqlResult.columns"
                                            :key="col"
                                            class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase"
                                        >
                                            <span :title="col">{{ col }}</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100 bg-white">
                                    <tr
                                        v-for="(row, index) in sqlResult.rows"
                                        :key="index"
                                        class="hover:bg-gray-50"
                                    >
                                        <td
                                            v-for="col in sqlResult.columns"
                                            :key="col"
                                            class="max-w-sm overflow-hidden px-4 py-3 text-sm break-words overflow-ellipsis text-gray-700"
                                        >
                                            <span :title="row[col]">{{ row[col] }}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="flex h-full items-center justify-center">
                            <div class="text-center text-gray-400">
                                <CheckCircle class="mx-auto mb-4 h-16 w-16 opacity-50" />
                                <p>执行成功，无返回数据</p>
                            </div>
                        </div>
                    </div>

                    <div
                        v-else-if="tableDetailView === 'data' && selectedTable"
                        class="flex h-full flex-col overflow-hidden"
                    >
                        <div
                            v-if="dataLoading"
                            class="flex h-full items-center justify-center"
                        >
                            <div class="text-center text-gray-400">
                                <Table class="mx-auto mb-4 h-16 w-16 animate-pulse" />
                                <p>加载中...</p>
                            </div>
                        </div>
                        <div
                            v-else-if="tableData.length === 0"
                            class="flex h-full items-center justify-center"
                        >
                            <div class="text-center text-gray-400">
                                <Table class="mx-auto mb-4 h-16 w-16 opacity-50" />
                                <p>此表为空</p>
                            </div>
                        </div>
                        <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden">
                            <div class="min-h-0 flex-1 overflow-auto">
                                <table class="min-w-full border-collapse">
                                    <thead class="sticky top-0 z-10 bg-gray-50">
                                        <tr>
                                            <th
                                                v-for="(col, index) in tableColumns"
                                                :key="index"
                                                class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase"
                                            >
                                                <span :title="col.name">{{ col.name }}</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-100 bg-white">
                                        <tr
                                            v-for="(row, rowIndex) in tableData"
                                            :key="rowIndex"
                                            class="hover:bg-gray-50"
                                        >
                                            <td
                                                v-for="(col, colIndex) in tableColumns"
                                                :key="colIndex"
                                                class="max-w-sm overflow-hidden px-4 py-3 text-sm break-words overflow-ellipsis text-gray-700"
                                            >
                                                <span :title="getCellValue(row, col.name)">
                                                    {{ getCellValue(row, col.name) }}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div
                                class="flex flex-shrink-0 flex-col gap-2 border-t border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <span class="text-sm text-gray-500">{{ pageInfo }}</span>
                                <div class="flex space-x-2">
                                    <button
                                        @click="changePage(-1)"
                                        :disabled="currentPage === 1"
                                        class="btn-touch rounded-2xl p-1.5 transition-colors hover:bg-gray-100 disabled:opacity-30"
                                    >
                                        <ChevronLeft class="h-4 w-4" />
                                    </button>
                                    <button
                                        @click="changePage(1)"
                                        :disabled="currentPage >= Math.ceil(totalRows / pageSize)"
                                        class="btn-touch rounded-2xl p-1.5 transition-colors hover:bg-gray-100 disabled:opacity-30"
                                    >
                                        <ChevronRight class="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        v-else-if="tableDetailView === 'structure' && selectedTable"
                        class="h-full overflow-auto"
                    >
                        <table class="min-w-full border-collapse">
                            <thead class="sticky top-0 z-10 bg-gray-50">
                                <tr>
                                    <th class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase">列名</th>
                                    <th class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase">类型</th>
                                    <th class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase">可空</th>
                                    <th class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase">默认值</th>
                                    <th class="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase">主键</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                <tr
                                    v-for="col in tableColumns"
                                    :key="col.name"
                                    class="hover:bg-gray-50"
                                >
                                    <td class="px-4 py-3 text-sm font-medium text-gray-700">{{ col.name }}</td>
                                    <td class="px-4 py-3 font-mono text-sm text-gray-500">{{ col.type || "-" }}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span :class="col.nullable ? 'text-green-600' : 'text-gray-400'">
                                            {{ col.nullable ? "是" : "否" }}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 font-mono text-sm text-gray-500">{{ col.default ?? "NULL" }}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span v-if="col.primary_key" class="text-yellow-600">🔑 是</span>
                                        <span v-else class="text-gray-400">否</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>

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
                        <h3 class="flex items-center space-x-2 text-base font-semibold text-gray-800 sm:text-lg">
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
                        <div v-if="sqlLogLoading" class="py-8 text-center text-gray-400">
                            <Clock class="mx-auto mb-2 h-8 w-8 animate-pulse" />
                            <p>加载中...</p>
                        </div>
                        <div v-else-if="sqlLogList.length === 0" class="py-8 text-center text-gray-400">
                            <Clock class="mx-auto mb-2 h-8 w-8 opacity-50" />
                            <p>暂无日志记录</p>
                        </div>
                        <div v-else class="space-y-2">
                            <div
                                v-for="log in sqlLogList"
                                :key="log.id"
                                :class="log.is_success ? 'bg-green-50' : 'bg-red-50'"
                                class="rounded-2xl p-3"
                            >
                                <div class="mb-2 flex items-center justify-between">
                                    <div class="flex items-center space-x-2">
                                        <span v-if="log.is_success" class="text-green-600">
                                            <CheckCircle class="inline h-4 w-4" />
                                        </span>
                                        <span v-else class="text-red-600">
                                            <XCircle class="inline h-4 w-4" />
                                        </span>
                                        <span class="text-sm font-medium text-gray-700">
                                            {{ log.created_at ? new Date(log.created_at).toLocaleString() : "" }}
                                        </span>
                                    </div>
                                </div>
                                <pre class="font-mono text-xs break-all whitespace-pre-wrap text-gray-600">{{ log.sql }}</pre>
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
    background: var(--zx-color-border-soft);
    border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background: var(--zx-slate-300);
    border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: var(--zx-color-text-subtle);
}
</style>
