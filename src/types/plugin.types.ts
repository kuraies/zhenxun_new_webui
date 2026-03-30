/**
 * 插件信息类型
 * 与 api-next.types.ts 中的 PluginInfo 保持一致
 */
export type { PluginInfo } from './api-next.types'

/**
 * 插件配置项类型（用于 /plugin/config/{module} 接口）
 */
export type { PluginConfigItem } from './api-next.types'

/**
 * 插件详情中的配置项类型（用于 /plugin/detail/{module} 接口）
 * 包含更详细的配置信息
 */
export interface PluginDetailConfig {
    module: string
    key: string
    value: any
    help: string | null
    default_value: any
    type: string | null
    type_inner: string[] | null
}

/**
 * 插件过滤配置
 */
export interface PluginFilter {
    searchKeyword: string
    statusFilter: 'all' | 'active' | 'inactive'
    typeFilter: string
}

/**
 * 插件数量统计
 */
export interface PluginCount {
    normal: number
    admin: number
    superuser: number
    other: number
}

/**
 * 插件详情（用于 /plugin/detail/{module} 接口）
 */
export interface PluginDetail {
    id: number
    module: string
    plugin_name: string
    default_status: boolean
    limit_superuser: boolean
    cost_gold: number
    menu_type: string
    version: string
    level: number
    status: boolean
    author: string
    config_list: PluginDetailConfig[]
    block_type: string | null
}

/**
 * 批量更新插件项
 */
export interface BatchUpdatePluginItem {
    module: string
    default_status?: boolean | null
    menu_type?: string | null
    block_type?: string | null
}

/**
 * 安装/卸载依赖载荷
 */
export interface InstallDependenciesPayload {
    handle_type: 'install' | 'uninstall'
    dependencies: string[]
}
