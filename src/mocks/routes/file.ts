/**
 * Mock 路由 - 文件管理（内存虚拟文件系统，增删改真实生效）
 */
import type { MockRoute } from '../types'

interface VFile {
    name: string
    is_file: boolean
    content: string
    mtime: string
}

// path -> 文件/文件夹表（children 由命名前缀推导）
const vfs = new Map<string, VFile>([
    ['', { name: '', is_file: false, content: '', mtime: '2026-08-01T00:00:00Z' }],
    ['logs', { name: 'logs', is_file: false, content: '', mtime: '2026-08-10T00:00:00Z' }],
    ['logs/bot.log', { name: 'bot.log', is_file: true, content: '[2026-08-16 09:00:00] [INFO] 小真寻启动完成~\n[2026-08-16 09:00:01] [INFO] 连接协议端成功: aiocqhttp\n[2026-08-16 09:05:12] [WARNING] 插件 gold_redbank 已禁用\n', mtime: '2026-08-16T01:05:12Z' }],
    ['logs/error.log', { name: 'error.log', is_file: true, content: '[2026-08-15 22:11:03] [ERROR] 数据库连接超时\n', mtime: '2026-08-15T14:11:03Z' }],
    ['configs', { name: 'configs', is_file: false, content: '', mtime: '2026-08-05T00:00:00Z' }],
    ['configs/plugins.yaml', { name: 'plugins.yaml', is_file: true, content: '# 插件配置\ncustom_welcome:\n  enable: true\n  text: "欢迎入群~"\n', mtime: '2026-08-05T08:00:00Z' }],
    ['configs/.env.dev', { name: '.env.dev', is_file: true, content: 'DB_URL=sqlite:///data/zhenxun.db\nLOG_LEVEL=INFO\n', mtime: '2026-08-05T08:00:00Z' }],
    ['data', { name: 'data', is_file: false, content: '', mtime: '2026-08-01T00:00:00Z' }],
    ['README.md', { name: 'README.md', is_file: true, content: '# 真寻 Bot WebUI\n\n这是 mock 模式下的虚拟文件。\n', mtime: '2026-08-01T00:00:00Z' }],
])

const normalize = (p: string) => (p || '').replace(/^\/+|\/+$/g, '')

function listDir(path: string) {
    const base = normalize(path)
    const prefix = base ? base + '/' : ''
    const seen = new Set<string>()
    const files: any[] = []
    for (const [p, node] of vfs) {
        if (!p.startsWith(prefix) || p === base) continue
        const rest = p.slice(prefix.length)
        if (rest.includes('/')) {
            // 子目录：只取第一段
            const dir = rest.split('/')[0]
            if (seen.has(dir)) continue
            seen.add(dir)
            files.push({
                name: dir,
                is_file: false,
                is_image: false,
                path: prefix + dir,
                parent: base,
                mtime: node.mtime,
                mtime_formatted: new Date(node.mtime).toLocaleString('zh-CN'),
            })
        } else {
            seen.add(rest)
            files.push({
                name: node.name,
                is_file: true,
                is_image: /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(node.name),
                size: node.content.length,
                size_formatted: `${(node.content.length / 1024).toFixed(1)} KB`,
                path: p,
                parent: base,
                mtime: node.mtime,
                mtime_formatted: new Date(node.mtime).toLocaleString('zh-CN'),
            })
        }
    }
    files.sort((a, b) => (a.is_file === b.is_file ? a.name.localeCompare(b.name) : a.is_file ? 1 : -1))
    const segments = base ? base.split('/') : []
    return {
        files,
        current_path: '/' + base,
        path_segments: segments.map((name, i) => ({
            name,
            path: '/' + segments.slice(0, i + 1).join('/'),
        })),
        has_parent: segments.length > 0,
    }
}

function parentOf(path: string) {
    const parts = normalize(path).split('/')
    parts.pop()
    return parts.join('/')
}

export const fileRoutes: MockRoute[] = [
    {
        method: 'get',
        url: '/file/list',
        response: ({ query }) => listDir(query.path || ''),
    },
    {
        method: 'get',
        url: '/file/read',
        response: ({ query }) => {
            const path = normalize(query.file_path || '')
            const node = vfs.get(path)
            if (!node?.is_file) {
                return { success: false, message: `文件不存在: ${path}`, code: 404, data: null }
            }
            return { path: '/' + path, content: node.content, encoding: 'utf-8' }
        },
    },
    {
        method: 'post',
        url: '/file/save',
        response: ({ body }) => {
            const path = normalize(body?.file_path || '')
            const node = vfs.get(path)
            if (node) {
                node.content = body?.content ?? ''
                node.mtime = new Date().toISOString()
            } else {
                vfs.set(path, { name: path.split('/').pop() || '', is_file: true, content: body?.content ?? '', mtime: new Date().toISOString() })
            }
            return true
        },
    },
    {
        method: 'post',
        url: '/file/delete',
        response: ({ body }) => {
            const path = normalize(body?.file_path || '')
            vfs.delete(path)
            return true
        },
    },
    {
        method: 'post',
        url: '/file/delete-folder',
        response: ({ body }) => {
            const path = normalize(body?.folder_path || '')
            const prefix = path + '/'
            for (const key of Array.from(vfs.keys())) {
                if (key === path || key.startsWith(prefix)) vfs.delete(key)
            }
            return true
        },
    },
    {
        method: 'post',
        url: '/file/rename',
        response: ({ body }) => {
            const source = normalize(body?.source_path || '')
            const node = vfs.get(source)
            if (!node) return { success: false, message: `路径不存在: ${source}`, code: 404, data: null }
            const target = `${parentOf(source)}/${body?.new_name || node.name}`.replace(/^\//, '')
            vfs.delete(source)
            node.name = body?.new_name || node.name
            node.mtime = new Date().toISOString()
            vfs.set(target, node)
            return true
        },
    },
    {
        method: 'post',
        url: '/file/create-file',
        response: ({ body }) => {
            const parent = normalize(body?.parent_path || '')
            const path = `${parent}/${body?.name}`.replace(/^\//, '')
            vfs.set(path, { name: body?.name, is_file: true, content: '', mtime: new Date().toISOString() })
            return true
        },
    },
    {
        method: 'post',
        url: '/file/create-folder',
        response: ({ body }) => {
            const parent = normalize(body?.parent_path || '')
            const path = `${parent}/${body?.name}`.replace(/^\//, '')
            vfs.set(path, { name: body?.name, is_file: false, content: '', mtime: new Date().toISOString() })
            return true
        },
    },
]
