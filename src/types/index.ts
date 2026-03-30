// 核心 API 类型
export type { APIResponse, PageData } from './api-next.types'

// 认证相关
export type { LoginRequest, LoginResponse } from './api-next.types'

// 系统相关
export type {
    SystemHealth,
    SystemInfo,
    NetworkStatus
} from './api-next.types'

// 系统状态相关（使用 store 模块定义，避免与 api-next 中的 SystemStatus 冲突）
export type { SystemStatus, SystemCount } from './store.types'

// 仪表盘相关
export type {
    DashboardOverview,
    StatItem,
    DashboardStats,
    QuickAction,
    DashboardResult
} from './api-next.types'

// 插件相关
export type {
    PluginInfo,
    PluginListRequest,
    PluginListResult,
    PluginToggleRequest,
    PluginConfigItem,
    PluginConfigResult
} from './api-next.types'

// 文件相关
export type {
    FileItem,
    FileListResult,
    FileContent
} from './api-next.types'

// 配置相关
export type {
    EnvFileContent,
    YamlConfigContent,
    ConfigSaveRequest,
    YamlConfigSaveRequest
} from './api-next.types'

// 数据库相关（使用独立模块，避免与 api-next.types 中的 SqlLog 冲突）
export type { TableInfo, ColumnInfo, TableRow } from './database.types'

// 日志相关（使用独立模块）
export type { LogLevel, LogEntry } from './log.types'

// 聊天相关（使用独立模块）
export type {
    MessageType,
    ChatMessage,
    SendMessageParam,
    MessageItem,
    ChatWebSocketMessage,
    Friend,
    Group
} from './chat.types'

// 其他
export * from './plugin.types'
export * from './main.types'
export * from './store.types'

// Analytics 相关
export type {
    Granularity,
    TrendPoint,
    TrendData,
    GroupStatistics,
    FriendStatistics,
    DetailedStatistics,
    GroupStatisticsTimeRange,
    FriendStatisticsTimeRange,
    DetailedStatisticsTimeRange,
    FavorabilityRank,
    GoldRank
} from './api-next.types'