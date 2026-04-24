/**
 * WebUI Next API 统一类型定义
 * 与新后端 (web_ui_next) 的响应格式保持一致
 */

/**
 * 统一 API 响应格式
 */
export interface APIResponse<T = any> {
    success: boolean
    message: string
    code: number
    data: T | null
}

/**
 * 分页数据
 */
export interface PageData<T> {
    items: T[]
    total: number
    page: number
    page_size: number
    has_next: boolean
    has_prev: boolean
}

// ==================== 认证相关 ====================

export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    access_token: string
    token_type: string
    expires_in: number
}

// ==================== 系统相关 ====================

export interface SystemStatus {
    cpu: number
    memory: number
    disk: number
    check_time: string
}

export interface SystemHealth {
    status: 'healthy' | 'warning' | 'error'
    cpu_status: 'normal' | 'high' | 'critical'
    memory_status: 'normal' | 'high' | 'critical'
    disk_status: 'normal' | 'high' | 'critical'
    recommendations: string[]
}

export interface BotStatus {
    self_id: string | null;
    nickname: string | null;
    ava_url: string | null;
    is_running: boolean;
    uptime: number;
    uptime_formatted: string;
    group_count: number;
    friend_count: number;
    message_count: number;
    start_time: string;
}

export interface BotInfo {
    // 基础信息
    self_id: string | null;
    nickname: string | null;
    ava_url: string | null;
    platform: string | null;

    // 统计
    friend_count: number;
    group_count: number;

    // 新字段（后端返回）
    received_messages: number;
    day_call: number;
    connect_date: string | null;
    total_call: number;
    messages_total: number;

    // 兼容旧 BotStatus
    is_running: boolean;
    uptime: number;
    uptime_formatted: string;
    start_time: string;

    // 兼容旧 message_count（和 received_messages 对应）
    message_count?: number;
}


export interface SystemInfo {
    version: string
    system: string
    arch: string
    cpu_brand: string
    cpu_cores: number
    cpu_freq_mhz: number
    memory_total: number
    nickname: string
}

export interface NetworkStatus {
    baidu: boolean
    google: boolean
}

// ==================== 仪表盘相关 ====================

export interface DashboardOverview {
    bot_status: 'online' | 'offline'
    uptime: number
    uptime_formatted: string
    group_count: number
    friend_count: number
    message_count_today: number
    plugin_count: number
    enabled_plugin_count: number
}

export interface StatItem {
    label: string
    value: number
    trend?: 'up' | 'down' | 'stable'
    change?: number
}

export interface DashboardStats {
    message_stats: StatItem
    user_stats: StatItem
    group_stats: StatItem
    error_stats: StatItem
}

export interface QuickAction {
    name: string
    description: string
    icon: string
    action_type: string
}

export interface DashboardResult {
    overview: DashboardOverview
    stats: DashboardStats
    quick_actions: QuickAction[]
    system_health: string
}

// ==================== 插件相关 ====================

export interface PluginInfo {
    id: number
    module: string
    name: string
    description: string
    author: string
    version: string
    plugin_type: string
    is_enabled: boolean
    allow_switch: boolean
    allow_setting: boolean
    is_builtin: boolean
}

export interface PluginListRequest {
    search?: string
    status?: boolean
    plugin_type?: string
    page?: number
    page_size?: number
}

export interface PluginListResult {
    items: PluginInfo[]
    total: number
    page: number
    page_size: number
    has_next: boolean
    has_prev: boolean
}

export interface PluginToggleRequest {
    module: string
    enable: boolean
}

export interface PluginConfigItem {
    module: string
    key: string
    value: string
    description?: string
}

export interface PluginConfigResult {
    module: string
    name: string
    configs: PluginConfigItem[]
}

// ==================== 文件相关 ====================

export interface FileItem {
    name: string
    is_file: boolean
    is_image: boolean
    size?: number
    size_formatted?: string
    mtime?: string
    mtime_formatted?: string
    path: string
    parent?: string
}

export interface FileListResult {
    files: FileItem[]
    current_path: string
    path_segments: string[]
    has_parent: boolean
}

export interface FileContent {
    path: string
    content: string
    encoding: string
}

// ==================== 配置相关 ====================

export interface EnvFileContent {
    name: string
    content: string
}

export interface YamlConfigContent {
    file_path: string
    content: string
}

export interface ConfigSaveRequest {
    name: string
    content: string
}

export interface YamlConfigSaveRequest {
    file_path: string
    content: string
}

// ==================== 数据库相关 ====================

export interface TableRowData {
    id: number | string
    data: Record<string, any>
}

export interface TableDataResult {
    items: TableRowData[]
    total: number
    page: number
    page_size: number
    has_next: boolean
    has_prev: boolean
}

export interface SqlExecuteRequest {
    sql: string
}

export interface SqlExecuteResult {
    success: boolean
    message: string
    data?: Record<string, any>[]
    rows_affected?: number
}

export interface SqlLog {
    id: number
    sql: string
    result?: string
    executed_at: string
    duration?: number
    is_success?: boolean
    created_at?: string
}

// ==================== 日志相关 ====================

export interface LogEntry {
    seq?: number
    timestamp: string
    level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG'
    message: string
    module?: string
}

// ==================== 聊天相关 ====================

export interface ChatMessage {
    object_id: string
    user_id: string
    group_id?: string
    message: ChatMessageItem[]
    name: string
    ava_url: string
    time?: string
}

export interface ChatMessageItem {
    type: 'text' | 'img' | 'at' | 'other'
    msg: string
    time: string
}

// ==================== 详细统计相关 ====================

export interface GroupStatistics {
    group_id: string
    group_name: string
    message_count: number
    plugin_call_count: number
}

export interface FriendStatistics {
    user_id: string
    user_name: string
    message_count: number
    plugin_call_count: number
}

export interface DetailedStatistics {
    groups: GroupStatistics[]
    friends: FriendStatistics[]
}

// ==================== Analytics 相关 ====================

/**
 * 时间粒度类型
 */
export type Granularity = 'hour' | 'day' | 'week' | 'month'

/**
 * 趋势数据点
 */
export interface TrendPoint {
    timestamp: string  // ISO 8601 格式
    message_count: number
    plugin_call_count: number
}

/**
 * 趋势数据响应
 */
export interface TrendData {
    data_points: TrendPoint[]
    total_message_count: number
    total_plugin_call_count: number
    granularity: Granularity
    start_time: string
    end_time: string
}

/**
 * 群组统计（带时间范围）
 */
export interface GroupStatisticsTimeRange {
    group_id: string
    group_name: string
    message_count: number
    plugin_call_count: number
}

/**
 * 好友统计（带时间范围）
 */
export interface FriendStatisticsTimeRange {
    user_id: string
    user_name: string
    message_count: number
    plugin_call_count: number
}

/**
 * 详细统计数据（带时间范围）
 */
export interface DetailedStatisticsTimeRange {
    groups: GroupStatisticsTimeRange[]
    friends: FriendStatisticsTimeRange[]
    start_time: string
    end_time: string
}

/**
 * 好感度排名
 */
export interface FavorabilityRank {
    user_id: string
    user_name: string
    favorability: number
    ava_url: string
}

/**
 * 金币排名
 */
export interface GoldRank {
    user_id: string
    user_name: string
    gold: number
    ava_url: string
}
