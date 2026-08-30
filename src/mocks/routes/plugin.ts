/**
 * Mock 路由 - 插件管理 / 插件商店
 */
import type { MockRoute } from '../types'
import { mockPlugins } from '../fixtures'

// 可变状态：开关在 mock 内真实生效，方便调试前端交互
export const pluginState = new Map(mockPlugins.map(p => [p.module, { ...p }]))

export const pluginRoutes: MockRoute[] = [
    {
        method: 'post',
        url: '/plugin/list',
        response: ({ body }) => {
            const { search = '', status, plugin_type, page = 1, page_size = 10 } = body || {}
            let items = Array.from(pluginState.values())
            if (search) {
                items = items.filter(
                    p => p.name.includes(search) || p.module.includes(search) || p.description.includes(search),
                )
            }
            if (typeof status === 'boolean') {
                items = items.filter(p => p.is_enabled === status)
            }
            if (plugin_type) {
                items = items.filter(p => p.plugin_type === plugin_type)
            }
            const total = items.length
            const start = (page - 1) * page_size
            return {
                items: items.slice(start, start + page_size),
                total,
                page,
                page_size,
                has_next: start + page_size < total,
                has_prev: page > 1,
            }
        },
    },
    {
        method: 'post',
        url: '/plugin/toggle',
        response: ({ body }) => {
            const plugin = pluginState.get(body?.module)
            if (!plugin) {
                return { success: false, message: `插件不存在: ${body?.module}`, code: 404, data: null }
            }
            plugin.is_enabled = !!body?.enable
            return true
        },
    },
    {
        method: 'get',
        url: '/plugin/config/:module',
        response: ({ params }) => ({
            module: params.module,
            name: pluginState.get(params.module)?.name || params.module,
            configs: [
                { module: params.module, key: 'model', value: 'gpt-4o-mini', description: '使用的模型' },
                { module: params.module, key: 'timeout', value: '30', description: '请求超时(秒)' },
                { module: params.module, key: 'prompt', value: '你是可爱的真寻小助手', description: '人设提示词' },
                { module: params.module, key: 'enable_group', value: 'true', description: '是否在群聊启用' },
            ],
        }),
    },
    {
        method: 'get',
        url: '/plugin/detail/:module',
        response: ({ params }) =>
            pluginState.get(params.module) || {
                success: false,
                message: `插件不存在: ${params.module}`,
                code: 404,
                data: null,
            },
    },
    {
        method: 'post',
        url: '/config/plugin/batch',
        response: ({ body }) => {
            console.debug('[Mock] 保存插件配置:', body?.module, body?.configs)
            return true
        },
    },
]

const mockStorePlugins = [
    { id: 1, module: 'alchemy', name: '炼金术', description: '合成与分解物品的炼金系统', author: 'HibiKier', version: '1.0.0', plugin_type: 'normal', is_installed: false, homepage: 'https://github.com/zhenxun-org/zhenxun-bot', tags: ['游戏'] },
    { id: 2, module: 'baike', name: '百科查询', description: '查询维基百科词条', author: 'yuanbisai857', version: '0.2.1', plugin_type: 'normal', is_installed: true, installed_version: '0.1.9', has_update: true, homepage: 'https://github.com/zhenxun-org/zhenxun-bot', tags: ['查询'] },
    { id: 3, module: 'github_sub', name: 'GitHub订阅', description: '订阅仓库 Issue 与 Release', author: 'HibiKier', version: '0.8.2', plugin_type: 'normal', is_installed: false, homepage: 'https://github.com/zhenxun-org/zhenxun-bot', tags: ['订阅'] },
    { id: 4, module: 'wordcloud', name: '词云', description: '群聊消息词云统计', author: 'HibiKier', version: '1.2.0', plugin_type: 'normal', is_installed: true, installed_version: '1.2.0', homepage: 'https://github.com/zhenxun-org/zhenxun-bot', tags: ['统计'] },
    { id: 5, module: 'mahiro_bank', name: '真寻银行', description: '金币存取款与利息系统', author: 'mahiro', version: '0.5.3', plugin_type: 'normal', is_installed: false, homepage: 'https://github.com/zhenxun-org/zhenxun-bot', tags: ['游戏', '经济'] },
]

export const storeRoutes: MockRoute[] = [
    {
        method: 'get',
        url: '/store/get-plugin-store',
        response: () => ({
            install_module: mockStorePlugins.filter(p => p.is_installed).map(p => p.module),
            plugin_list: mockStorePlugins,
        }),
    },
    {
        method: 'post',
        url: '/store/install',
        delay: 800,
        response: ({ body }) => {
            const plugin = mockStorePlugins.find(p => p.id === body?.id)
            if (plugin) {
                plugin.is_installed = true
                plugin.installed_version = plugin.version
            }
            return true
        },
    },
    {
        method: 'post',
        url: '/store/update',
        delay: 800,
        response: ({ body }) => {
            const plugin = mockStorePlugins.find(p => p.id === body?.id)
            if (plugin) {
                plugin.has_update = false
                plugin.installed_version = plugin.version
            }
            return true
        },
    },
    {
        method: 'post',
        url: '/store/remove',
        delay: 500,
        response: ({ body }) => {
            const plugin = mockStorePlugins.find(p => p.id === body?.id)
            if (plugin) {
                plugin.is_installed = false
                plugin.installed_version = undefined
            }
            return true
        },
    },
]
