<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
    Database,
    Table,
    Play,
    Trash2,
    ChevronLeft,
    ChevronRight,
    FileText,
    Clock,
    CheckCircle,
    XCircle
} from 'lucide-vue-next'
import { databaseApi } from '@/utils/api-next'
import type { TableDataResult, SqlLog } from '@/types/api-next.types'
import { ZXNotification } from '@/components'

// 选中的表
const selectedTable = ref<string>('')
const tableList = ref<string[]>([])
const tableColumns = ref<Array<{
    name: string
    type: string
    nullable: boolean
    default?: string | null
    primary_key?: boolean
}>>([])
const tableData = ref<any[]>([])
const dataLoading = ref(false)

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const totalRows = ref(0)

// SQL 编辑器
const sqlEditor = ref('')
const sqlResult = ref<{ columns: string[]; rows: any[] } | null>(null)
const sqlExecuting = ref(false)

// 常用 SQL
const commonSqlList = ref<{ name: string; sql: string }[]>([])

// SQL 日志
const showSqlLog = ref(false)
const sqlLogList = ref<SqlLog[]>([])
const sqlLogLoading = ref(false)

// 表详情显示模式
const tableDetailView = ref<'data' | 'structure' | 'sql_result'>('data')

// 加载表列表
const loadTableList = async () => {
    try {
        const res = await databaseApi.getTableList()
        if (res?.success && res.data) {
            tableList.value = res.data || []
            if (tableList.value.length > 0 && !selectedTable.value) {
                selectedTable.value = tableList.value[0]
                loadTableColumns()
                loadTableData()
            }
        }
    } catch (error) {
        ZXNotification({
            title: '呜呼～',
            message: '表列表加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    }
}

// 加载表列信息
const loadTableColumns = async () => {
    if (!selectedTable.value) return
    try {
        const res = await databaseApi.getTableColumns(selectedTable.value)
        if (res?.success && res.data) {
            // 后端返回：{name, type, nullable, default, primary_key}[]
            tableColumns.value = res.data
        }
    } catch (error) {
        // 静默失败
    }
}

// 加载表数据
const loadTableData = async (page: number = 1) => {
    if (!selectedTable.value) return
    dataLoading.value = true
    try {
        const res = await databaseApi.getTableData(selectedTable.value, page, pageSize.value)
        if (res?.success && res.data) {
            tableData.value = res.data.items || []
            totalRows.value = res.data.total || 0
            currentPage.value = page
        }
    } catch (error) {
        ZXNotification({
            title: '呜呼～',
            message: '数据加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        dataLoading.value = false
    }
}

// 选择表
const selectTable = (tableName: string) => {
    selectedTable.value = tableName
    tableDetailView.value = 'data'
    loadTableColumns()
    loadTableData()
}

// 切换分页
const changePage = (delta: number) => {
    const newPage = currentPage.value + delta
    if (newPage >= 1 && newPage <= Math.ceil(totalRows.value / pageSize.value)) {
        loadTableData(newPage)
    }
}

// 执行 SQL
const executeSql = async () => {
    if (!sqlEditor.value.trim()) {
        ZXNotification({
            title: '提示',
            message: 'SQL 不能为空哦～',
            type: 'info',
            position: 'top-right'
        })
        return
    }

    sqlExecuting.value = true
    try {
        const res: any = await databaseApi.execSql(sqlEditor.value)
        console.log('SQL 执行响应:', JSON.stringify(res, null, 2))
        // execSql 返回 Result.ok(data) 或 Result.ok(info)，SELECT 返回查询结果，其他返回成功信息
        // 检查响应中的 success 字段
        if (res?.success === false) {
            // 后端返回成功但业务逻辑失败
            ZXNotification({
                title: '执行失败',
                message: res.message || 'SQL 执行失败了 (´；ω；`)',
                type: '😭',
                position: 'top-right'
            })
            return
        }

        if (res?.success) {
            // res.data 是 SqlExecuteResult，包含 {success, message, data, rows_affected}
            const sqlResultData = res.data?.data
            console.log('SQL 结果数据:', sqlResultData)
            // 如果是 SELECT 语句，返回查询结果
            if (sqlEditor.value.trim().toLowerCase().startsWith('select') && Array.isArray(sqlResultData)) {
                sqlResult.value = {
                    columns: sqlResultData.length > 0 ? Object.keys(sqlResultData[0]) : [],
                    rows: sqlResultData
                }
                // 自动切换到 SQL 结果视图
                tableDetailView.value = 'sql_result'
                console.log('SQL 结果视图已设置:', sqlResult.value)
                ZXNotification({
                    title: '执行成功～',
                    message: `SQL 执行成功，返回 ${sqlResultData.length} 条记录 ✨`,
                    type: '🎉',
                    position: 'top-right',
                    confetti: true
                })
            } else {
                // 非 SELECT 语句，只显示成功消息
                ZXNotification({
                    title: '执行成功～',
                    message: res.data?.message || 'SQL 执行成功！',
                    type: '🎉',
                    position: 'top-right',
                    confetti: true
                })
            }
            // 刷新表列表（可能是 DROP/CREATE 操作）
            loadTableList()
        }
    } catch (error: any) {
        console.error('SQL 执行异常:', error)
        ZXNotification({
            title: '执行失败',
            message: error.response?.data?.message || error.response?.data?.info || error.message || 'SQL 执行失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        sqlExecuting.value = false
    }
}

// 加载 SQL 日志
const loadSqlLog = async () => {
    sqlLogLoading.value = true
    try {
        const res: any = await databaseApi.getSqlLog()
        // 后端返回 Result.ok(BaseResultModel(total, data))
        // BaseResultModel 格式：{ total: number, data: SqlLogInfo[] }
        // SqlLogInfo 只有 sql 字段，需要补充其他字段
        if (res?.success && res.data) {
            sqlLogList.value = (res.data.data || []).map((item: any, index: number) => ({
                id: index,
                sql: item.sql,
                is_success: true, // 后端只有成功才记录
                ip: 'unknown',
                created_at: ''
            }))
        }
    } catch (error) {
        // 静默失败
    } finally {
        sqlLogLoading.value = false
    }
}

// 打开 SQL 日志
const openSqlLog = () => {
    showSqlLog.value = true
    loadSqlLog()
}

// 加载常用 SQL
const loadCommonSql = async () => {
    try {
        const res: any = await databaseApi.getCommonSql()
        // 后端返回 Result.ok(SQL_DICT)，SQL_DICT 是 Record<string, SqlModel>
        // SqlModel: { name: string, module: string, sql_list: CommonSql[] }
        if (res?.success && res.data) {
            // 转换为前端需要的格式：{ name: string, sql: string }[]
            const result: { name: string; sql: string }[] = []
            Object.values(res.data as Record<string, any>).forEach((plugin: any) => {
                if (plugin?.sql_list) {
                    plugin.sql_list.forEach((sql: any) => {
                        result.push({
                            name: `${plugin.name || plugin.module} - ${sql.name}`,
                            sql: sql.sql
                        })
                    })
                }
            })
            commonSqlList.value = result
        }
    } catch (error) {
        // 静默失败
    }
}

// 加载常用 SQL 到编辑器
const loadCommonSqlToEditor = (sql: string) => {
    sqlEditor.value = sql
}

// 分页信息
const pageInfo = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value + 1
    const end = Math.min(currentPage.value * pageSize.value, totalRows.value)
    return `显示 ${start}-${end} 条，共 ${totalRows.value} 条`
})

onMounted(() => {
    loadTableList()
    loadCommonSql()
})
</script>

<template>
    <div class="w-full h-full flex flex-col space-y-4 overflow-hidden" style="max-width: 100vw; width: 100%;">
        <!-- 头部标题 -->
        <div class="flex items-center justify-between bg-white rounded-2xl shadow-sm p-4 outline-1 outline-slate-200 flex-shrink-0">
            <div class="flex items-center space-x-3">
                <Database class="h-6 w-6 text-blue-500 flex-shrink-0" />
                <h2 class="text-lg font-semibold text-gray-800">数据库管理</h2>
            </div>
            <div class="flex items-center space-x-2">
                <button
                    @click="openSqlLog"
                    class="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-2xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2 btn-touch"
                >
                    <Clock class="w-4 h-4" />
                    <span class="hidden sm:inline">SQL 日志</span>
                </button>
            </div>
        </div>

        <!-- SQL 执行区域 - 顶部 -->
        <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 flex flex-col flex-shrink-0">
            <div class="p-3 border-b border-gray-100">
                <div class="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                    <FileText class="w-4 h-4" />
                    <span>SQL 执行</span>
                </div>
            </div>

            <div class="p-3 flex flex-col sm:flex-row gap-3">
                <!-- 常用 SQL 列表 - 移动端隐藏，桌面端显示 -->
                <div class="hidden sm:block sm:w-48 flex-shrink-0">
                    <div class="text-xs font-medium text-gray-500 mb-2">常用 SQL</div>
                    <div class="max-h-24 overflow-y-auto space-y-1">
                        <div
                            v-for="(item, index) in commonSqlList"
                            :key="index"
                            @click="loadCommonSqlToEditor(item.sql)"
                            class="p-2 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                            <span class="text-sm text-gray-700 truncate block">{{ item.name }}</span>
                        </div>
                        <div v-if="commonSqlList.length === 0" class="text-center text-gray-400 py-4 text-xs">
                            暂无常用 SQL
                        </div>
                    </div>
                </div>

                <!-- SQL 编辑器 -->
                <div class="flex-1 min-w-0">
                    <textarea
                        v-model="sqlEditor"
                        placeholder="输入 SQL 语句..."
                        class="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows="3"
                    ></textarea>
                    <div class="mt-2 flex items-center justify-between flex-wrap gap-2">
                        <button
                            @click="executeSql"
                            :disabled="sqlExecuting || !sqlEditor.trim()"
                            class="px-4 py-2 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2 btn-touch"
                        >
                            <Play class="w-4 h-4" />
                            <span>{{ sqlExecuting ? '执行中...' : '执行 SQL' }}</span>
                        </button>
                        <span v-if="sqlResult" class="text-xs text-green-600 flex items-center">
                            <CheckCircle class="w-3.5 h-3.5 mr-1" />
                            已执行 {{ sqlResult.rows.length }} 条结果
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 主内容区域 - 移动端可滚动，桌面端固定布局 -->
        <div class="flex-1 min-h-0 flex flex-col sm:flex-row gap-3 overflow-hidden">
            <!-- 左侧表列表 - 移动端紧凑显示 -->
            <div class="w-full sm:w-64 bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 flex flex-col overflow-hidden flex-shrink-0 sm:max-h-full">
                <div class="p-3 border-b border-gray-100 flex-shrink-0">
                    <div class="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                        <Table class="w-4 h-4" />
                        <span>数据表</span>
                    </div>
                </div>
                <!-- 移动端水平滚动列表，桌面端垂直列表 -->
                <div class="flex-1 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto p-2 sm:space-y-1">
                    <!-- 移动端水平布局 -->
                    <div class="flex sm:flex-col gap-1 sm:gap-0 min-w-max sm:min-w-0">
                        <div
                            v-for="table in tableList"
                            :key="table"
                            @click="selectTable(table)"
                            :class="selectedTable === table ? 'bg-blue-50' : 'hover:bg-gray-50'"
                            class="p-2 rounded-2xl cursor-pointer transition-colors flex-shrink-0 sm:flex-shrink"
                        >
                            <span class="text-sm text-gray-700 truncate">{{ table }}</span>
                        </div>
                    </div>
                    <div v-if="tableList.length === 0" class="text-center text-gray-400 py-8 hidden sm:block">
                        <Table class="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p class="text-sm">暂无数据表</p>
                    </div>
                </div>
            </div>

            <!-- 右侧表数据/结构 + SQL 结果 -->
            <div class="flex-1 min-w-0 bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 flex flex-col overflow-hidden">
                <!-- 表头部 -->
                <div class="p-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <!-- 左侧：表名 -->
                    <span class="font-semibold text-gray-700 truncate">{{ selectedTable || '请选择表' }}</span>
                    <!-- 右侧：视图切换按钮 -->
                    <div class="flex space-x-1 flex-shrink-0">
                        <button
                            @click="tableDetailView = 'data'"
                            :class="tableDetailView === 'data' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'"
                            class="px-2 sm:px-3 py-1 rounded-2xl text-xs font-medium transition-colors"
                        >
                            数据
                        </button>
                        <button
                            @click="tableDetailView = 'structure'"
                            :class="tableDetailView === 'structure' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'"
                            class="px-2 sm:px-3 py-1 rounded-2xl text-xs font-medium transition-colors"
                        >
                            结构
                        </button>
                        <button
                            @click="tableDetailView = 'sql_result'"
                            :class="tableDetailView === 'sql_result' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'"
                            class="px-2 sm:px-3 py-1 rounded-2xl text-xs font-medium transition-colors"
                        >
                            SQL 结果
                        </button>
                    </div>
                </div>

                <!-- 表内容 -->
                <div class="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div v-if="!selectedTable && !sqlResult" class="flex items-center justify-center h-full text-gray-400">
                        <div class="text-center">
                            <Database class="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>请选择一个数据表或执行 SQL</p>
                        </div>
                    </div>

                    <!-- SQL 结果视图 - 始终显示 -->
                    <div v-if="tableDetailView === 'sql_result'" class="flex-1 overflow-auto">
                        <div v-if="!sqlResult" class="flex items-center justify-center h-full">
                            <div class="text-center text-gray-400">
                                <FileText class="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>暂无 SQL 结果</p>
                                <p class="text-sm mt-2">请执行 SQL 查询后查看结果</p>
                            </div>
                        </div>
                        <div v-else-if="sqlResult.rows.length > 0" class="h-full">
                            <div class="overflow-auto" style="min-width: max-content;">
                                <table class="w-full border-collapse">
                                    <thead class="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th v-for="col in sqlResult.columns" :key="col"
                                                class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                                                <span :title="col">{{ col }}</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-100 bg-white">
                                        <tr v-for="(row, index) in sqlResult.rows" :key="index" class="hover:bg-gray-50">
                                            <td v-for="col in sqlResult.columns" :key="col"
                                                class="px-4 py-3 text-sm text-gray-700 max-w-xs overflow-hidden overflow-ellipsis break-words">
                                                <span :title="row[col]">{{ row[col] }}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div v-else class="flex items-center justify-center h-full">
                            <div class="text-center text-gray-400">
                                <CheckCircle class="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>执行成功，无返回数据</p>
                            </div>
                        </div>
                    </div>

                    <!-- 数据视图 -->
                    <div v-else-if="tableDetailView === 'data' && selectedTable" class="flex-1 flex flex-col overflow-hidden">
                        <div v-if="dataLoading" class="flex items-center justify-center h-full">
                            <div class="text-center text-gray-400">
                                <Table class="w-16 h-16 mx-auto mb-4 animate-pulse" />
                                <p>加载中...</p>
                            </div>
                        </div>
                        <div v-else-if="tableData.length === 0" class="flex items-center justify-center h-full">
                            <div class="text-center text-gray-400">
                                <Table class="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>此表为空</p>
                            </div>
                        </div>
                        <div v-else class="flex-1 flex flex-col overflow-hidden">
                            <div class="flex-1 overflow-auto">
                                <div class="overflow-auto" style="min-width: max-content;">
                                    <table class="w-full border-collapse">
                                        <thead class="bg-gray-50 sticky top-0 z-10">
                                            <tr>
                                                <th v-for="(col, index) in tableColumns" :key="index"
                                                    class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                                                    <div class="flex items-center">
                                                        <span :title="col.name">{{ col.name }}</span>
                                                        <span v-if="col.primary_key" class="text-yellow-600 ml-1 flex-shrink-0">🔑</span>
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-gray-100 bg-white">
                                            <tr v-for="(row, rowIndex) in tableData" :key="rowIndex" class="hover:bg-gray-50">
                                                <td v-for="(col, colIndex) in tableColumns" :key="colIndex"
                                                    class="px-4 py-3 text-sm text-gray-700 max-w-xs overflow-hidden overflow-ellipsis break-words">
                                                    <span :title="row.data[col.name]">{{ row.data[col.name] }}</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <!-- 分页 -->
                            <div class="p-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                                <span class="text-sm text-gray-500">{{ pageInfo }}</span>
                                <div class="flex space-x-2">
                                    <button
                                        @click="changePage(-1)"
                                        :disabled="currentPage === 1"
                                        class="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors disabled:opacity-30"
                                    >
                                        <ChevronLeft class="w-4 h-4" />
                                    </button>
                                    <button
                                        @click="changePage(1)"
                                        :disabled="currentPage >= Math.ceil(totalRows / pageSize)"
                                        class="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors disabled:opacity-30"
                                    >
                                        <ChevronRight class="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 结构视图 -->
                    <div v-else-if="tableDetailView === 'structure' && selectedTable" class="flex-1 overflow-auto">
                        <div class="h-full">
                            <div class="overflow-auto" style="min-width: max-content;">
                                <table class="w-full border-collapse">
                                    <thead class="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-200 whitespace-nowrap">列名</th>
                                            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-200 whitespace-nowrap">类型</th>
                                            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-200 whitespace-nowrap">可空</th>
                                            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-200 whitespace-nowrap">默认值</th>
                                            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-200 whitespace-nowrap">主键</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-100 bg-white">
                                        <tr v-for="col in tableColumns" :key="col.name" class="hover:bg-gray-50">
                                            <td class="px-4 py-3 text-sm font-medium text-gray-700">{{ col.name }}</td>
                                            <td class="px-4 py-3 text-sm text-gray-500 font-mono">{{ col.type }}</td>
                                            <td class="px-4 py-3 text-sm">
                                                <span :class="col.nullable ? 'text-green-600' : 'text-gray-400'">
                                                    {{ col.nullable ? '是' : '否' }}
                                                </span>
                                            </td>
                                            <td class="px-4 py-3 text-sm text-gray-500 font-mono">{{ col.default ?? 'NULL' }}</td>
                                            <td class="px-4 py-3 text-sm">
                                                <span v-if="col.primary_key" class="text-yellow-600">🔑 是</span>
                                                <span v-else class="text-gray-400">否</span>
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
                class="fixed inset-0 glass-overlay flex items-center justify-center z-50 p-4"
                @click="showSqlLog = false"
            >
                <div
                    class="modal-content bg-white rounded-2xl p-4 sm:p-6 w-full max-w-[600px] max-h-[85vh] sm:max-h-[70vh] shadow-xl flex flex-col"
                    @click.stop
                >
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-base sm:text-lg font-semibold text-gray-800 flex items-center space-x-2">
                        <Clock class="w-5 h-5" />
                        <span>SQL 执行日志</span>
                    </h3>
                    <button
                        @click="showSqlLog = false"
                        class="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500"
                    >
                        <Trash2 class="w-5 h-5" />
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto min-h-0">
                    <div v-if="sqlLogLoading" class="text-center text-gray-400 py-8">
                        <Clock class="w-8 h-8 mx-auto mb-2 animate-pulse" />
                        <p>加载中...</p>
                    </div>
                    <div v-else-if="sqlLogList.length === 0" class="text-center text-gray-400 py-8">
                        <Clock class="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>暂无日志记录</p>
                    </div>
                    <div v-else class="space-y-2">
                        <div
                            v-for="log in sqlLogList"
                            :key="log.id"
                            :class="log.is_success ? 'bg-green-50' : 'bg-red-50'"
                            class="p-3 rounded-2xl"
                        >
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center space-x-2">
                                    <span v-if="log.is_success" class="text-green-600">
                                        <CheckCircle class="w-4 h-4 inline" />
                                    </span>
                                    <span v-else class="text-red-600">
                                        <XCircle class="w-4 h-4 inline" />
                                    </span>
                                    <span class="text-sm font-medium text-gray-700">
                                        {{ log.created_at ? new Date(log.created_at).toLocaleString() : '' }}
                                    </span>
                                </div>
                            </div>
                            <pre class="text-xs font-mono text-gray-600 whitespace-pre-wrap break-all">{{ log.sql }}</pre>
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
