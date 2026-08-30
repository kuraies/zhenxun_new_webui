/**
 * Mock 模式 - 核心路由器与 axios 适配器
 *
 * 原理：在 axios 请求拦截器里把 adapter 替换为 mockAdapter，
 * 请求不会真的发出网络包，而是查本地路由表并返回构造的响应，
 * 响应拦截器（返回 response.data 的逻辑）照常工作。
 */

import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { MockContext, MockRoute } from './types'
import { MOCK_MODE } from 'virtual:mock-mode'
import { mockRoutes } from './index'

const API_BASE = '/zhenxun/api/v1'
const DEFAULT_DELAY = 150

/** 把带 :param 的模式串和真实路径做匹配，命中返回参数表，否则 null */
function matchUrl(pattern: string, pathname: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(Boolean)
    const pathParts = pathname.split('/').filter(Boolean)
    if (patternParts.length !== pathParts.length) return null
    const params: Record<string, string> = {}
    for (let i = 0; i < patternParts.length; i++) {
        const p = patternParts[i]
        if (p.startsWith(':')) {
            params[p.slice(1)] = decodeURIComponent(pathParts[i])
        } else if (p !== pathParts[i]) {
            return null
        }
    }
    return params
}

/** 从完整 url 里剥掉 baseURL 前缀与查询串，得到用于匹配的路径 */
function normalizePath(url: string): string {
    let path = url
    const idx = path.indexOf(API_BASE)
    if (idx !== -1) {
        path = path.slice(idx + API_BASE.length)
    }
    return path.split('?')[0] || '/'
}

export function findMockRoute(
    method: string,
    url: string,
    query: Record<string, any>,
    body: any,
): { route: MockRoute; ctx: MockContext } | null {
    const [rawPath, search] = url.split('?')
    const path = normalizePath(rawPath)

    // URL 上直接拼的查询参数（如 /auth/verify?token=xxx）
    const urlQuery: Record<string, any> = {}
    if (search) {
        new URLSearchParams(search).forEach((v, k) => (urlQuery[k] = v))
    }

    for (const route of mockRoutes) {
        if (route.method !== method.toLowerCase()) continue
        const params = matchUrl(route.url, path)
        if (params) {
            return {
                route,
                ctx: { params, query: { ...urlQuery, ...query }, body, url: path },
            }
        }
    }
    return null
}

function isAPIResponseShape(value: any): boolean {
    return (
        value !== null &&
        typeof value === 'object' &&
        'success' in value &&
        'code' in value &&
        'data' in value
    )
}

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const method = config.method || 'get'

    // axios 的 params 与请求体（适配器收到的 data 已被序列化，还原成对象）
    const query: Record<string, any> = { ...(config.params || {}) }
    let body: any = config.data
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body)
        } catch {
            /* 非 JSON 请求体原样保留 */
        }
    }

    const matched = findMockRoute(method, config.url || '', query, body)
    const delay = matched?.route.delay ?? DEFAULT_DELAY
    await new Promise(resolve => setTimeout(resolve, delay))

    if (!matched) {
        // 未实现 mock 的接口直接抛错，便于在控制台/通知里发现漏网之鱼
        const message = `[Mock] 未实现的路由: ${method.toUpperCase()} ${config.url}`
        console.warn(message)
        const error = new Error(message) as Error & {
            config: InternalAxiosRequestConfig
            response?: AxiosResponse
            isAxiosError: boolean
        }
        error.config = config
        error.isAxiosError = true
        error.response = {
            data: { success: false, message, code: 400, data: null },
            status: 400,
            statusText: 'Bad Request',
            headers: {},
            config,
        }
        throw error
    }

    const result = matched.route.response(matched.ctx)
    // 已经是 APIResponse 形状的直接使用，否则包一层统一外壳
    const payload = isAPIResponseShape(result)
        ? result
        : { success: true, message: 'ok', code: 200, data: result }

    if (MOCK_MODE) {
        console.debug(
            `[Mock] ${method.toUpperCase()} ${matched.ctx.url} ->`,
            payload,
        )
    }

    const response: AxiosResponse = {
        data: payload,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
        request: { mock: true },
    }
    return response
}
