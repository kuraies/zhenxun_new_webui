/**
 * Store 模块类型定义
 */

/** 系统统计数据 */
export interface SystemCount {
    chat_num: number        // 历史总聊天数量
    chat_day: number        // 今日聊天数量
    call_num: number        // 历史总调用次数
    call_day: number        // 今日调用次数
    friend_count: number    // 好友数量
    group_count: number     // 群组数量
    plugin_count: number    // 插件数量
    database_size: number   // 数据库大小 (MB)
}

/** 系统资源状态 */
export interface SystemStatus {
    cpu: number     // CPU 使用率 (%)
    memory: number  // 内存使用率 (%)
    disk: number    // 磁盘使用率 (%)
}

/** WebSocket 命名空间消息 Map */
export interface NamespaceMessageMap extends Map<string, any> {}

/** 插件商店插件信息 */
export interface StorePlugin {
    id: number
    module: string
    name: string
    description: string
    author: string
    version: string
    plugin_type: string
    is_installed?: boolean
    has_update?: boolean
    installed_version?: string
    homepage?: string
    tags?: string[]
    [key: string]: unknown
}

/** NoneBot 商店标签 */
export interface NbStoreTag {
    label: string
    color: string
}

/** NoneBot 插件商店插件信息 */
export interface NbStorePlugin {
    name: string
    module_name: string
    project_link: string
    desc: string
    tags: NbStoreTag[]
    author: string
    version: string
    is_official: boolean
    time: string
    valid: boolean
    installed: boolean
    local_version: string | null
    has_update: boolean
}
