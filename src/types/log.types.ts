/**
 * 日志级别类型
 */
export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG'

/**
 * 日志条目类型
 */
export interface LogEntry {
    seq?: number
    timestamp: string
    level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG'
    message: string
    module?: string
}

/**
 * 日志过滤配置
 */
export interface LogFilter {
    levels: LogLevel[]
    searchKeyword: string
}
