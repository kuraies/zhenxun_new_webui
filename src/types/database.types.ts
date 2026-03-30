/**
 * 数据库表信息
 */
export interface TableInfo {
    name: string
}

/**
 * 表列信息（后端返回的原始格式）
 */
export interface ColumnInfo {
    column_name: string
    data_type: string
    max_length?: number
    is_nullable: string
    // 别名用于前端显示
    name?: string
    type?: string
    nullable?: boolean
    default?: string | null
    primary_key?: boolean
}

/**
 * SQL 日志记录
 */
export interface SqlLog {
    id: number
    sql: string
    result?: string
    is_success?: boolean
    ip?: string
    created_at?: string
}

/**
 * 表格行数据（用于显示）
 */
export interface TableRow {
    [key: string]: any
}
