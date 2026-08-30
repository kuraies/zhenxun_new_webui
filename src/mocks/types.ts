/**
 * Mock 模式 - 类型定义
 */

export type MockMethod = 'get' | 'post' | 'put' | 'delete'

/** 请求上下文，交给各路由的 response 函数使用 */
export interface MockContext {
    /** 路径参数，如 /plugin/config/:module 中的 { module } */
    params: Record<string, string>
    /** 查询参数（URL search 与 axios params 合并后的结果） */
    query: Record<string, any>
    /** 请求体（POST/PUT 的 JSON，已自动解析） */
    body: any
    /** 原始请求路径 */
    url: string
}

/**
 * 一条 mock 路由
 * response 返回业务数据，会自动包进统一的 APIResponse 外壳；
 * 也可以直接返回 APIResponse 形状的对象来模拟失败等情况
 */
export interface MockRoute {
    method: MockMethod
    /** 路径，支持 :param 占位符 */
    url: string
    /** 模拟网络延迟（ms），默认 150 */
    delay?: number
    response: (ctx: MockContext) => any
}
