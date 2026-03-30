/**
 * WebUI Next API - 数据库接口
 */

import { api } from './client'
import type {
    TableDataResult,
    SqlExecuteRequest,
    SqlExecuteResult,
    APIResponse,
} from '@/types/api-next.types'

interface ColumnInfo {
    name: string
    type: string
    nullable: boolean
    default?: string | null
    primary_key?: boolean
}

export const databaseApi = {
    /**
     * 获取表列表
     */
    getTableList(): Promise<APIResponse<string[]>> {
        return api.get<string[]>('/database/tables')
    },

    /**
     * 获取表字段
     */
    getTableColumns(tableName: string): Promise<APIResponse<ColumnInfo[]>> {
        return api.get<ColumnInfo[]>(`/database/tables/${encodeURIComponent(tableName)}/columns`)
    },

    /**
     * 获取表数据
     */
    getTableData(
        tableName: string,
        page: number = 1,
        pageSize: number = 50
    ): Promise<APIResponse<TableDataResult>> {
        return api.get<TableDataResult>(`/database/tables/${encodeURIComponent(tableName)}/data`, {
            page,
            page_size: pageSize,
        })
    },

    /**
     * 执行 SQL 查询
     */
    executeSql(request: SqlExecuteRequest): Promise<APIResponse<SqlExecuteResult>> {
        return api.post<SqlExecuteResult>('/database/execute', request)
    },

    // ==================== 兼容旧代码的方法 ====================

    /**
     * 执行 SQL（兼容旧代码，使用 executeSql）
     */
    execSql(sql: string): Promise<APIResponse<any>> {
        return this.executeSql({ sql })
    },

    /**
     * 获取 SQL 日志（兼容旧代码，待实现）
     */
    getSqlLog(): Promise<APIResponse<any>> {
        // TODO: 后端实现 SQL 日志功能
        return Promise.resolve({ success: true, message: 'OK', code: 200, data: { data: [] } })
    },

    /**
     * 获取常用 SQL（兼容旧代码，待实现）
     */
    getCommonSql(): Promise<APIResponse<any>> {
        // TODO: 后端实现常用 SQL 功能
        return Promise.resolve({ success: true, message: 'OK', code: 200, data: {} })
    },
}
