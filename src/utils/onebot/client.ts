/**
 * OneBot v11 模拟客户端
 *
 * 浏览器扮演 OneBot 实现，通过反向 WebSocket 连接 nonebot：
 * - 连接后推送 lifecycle / heartbeat 元事件
 * - 应答框架下发的动作请求（send_msg 的内容通过回调交给界面展示）
 * - 对外提供 sendEvent 把伪造的事件推给框架
 *
 * 浏览器 WebSocket 不能设置自定义 header，access_token 通过
 * URL 查询参数传递（nonebot 的 aiocqhttp 支持该方式）。
 */
import type { ActionRequest, ActionResponse, MessageSegment, OneBotEvent } from './types'
import { buildHeartbeatEvent, buildLifecycleEvent } from './events'
import { handleAction } from './actions'

export interface SimulatorConfig {
    /** 反向 WS 地址，如 ws://127.0.0.1:8080/onebot/v11/ws */
    url: string
    /** 模拟的 bot QQ 号 */
    selfId: string
    access_token?: string
    /** 心跳间隔（秒），默认 30 */
    heartbeatInterval?: number
    /** 断线后是否自动重连，默认 true */
    autoReconnect?: boolean
    /** 重连间隔（秒），默认 3 */
    reconnectInterval?: number
}

export interface SimulatorCallbacks {
    onStateChange?: (connected: boolean) => void
    /** 框架下发的每个动作请求（含已自动应答的），用于消息流展示 */
    onAction?: (request: ActionRequest) => void
    /** 框架调用了 send_msg，即真寻回复了消息 */
    onBotMessage?: (info: {
        messageType: 'private' | 'group' | undefined
        userId?: number
        groupId?: number
        message: MessageSegment[] | string
        text: string
    }) => void
    onLog?: (message: string) => void
    /** 连接发生错误（用于弹出提示，是否显示由页面控制） */
    onError?: (message: string) => void
    /** 后端桥接推送的真实 bot 信息（昵称/头像），刷新界面展示用 */
    onBotInfo?: (bots: { user_id: string; nickname: string; ava_url: string }[]) => void
}

export class OneBotV11Simulator {
    private ws: WebSocket | null = null
    private heartbeatTimer: number | null = null
    private reconnectTimer: number | null = null
    private explicitlyClosed = false

    constructor(
        private config: SimulatorConfig,
        private callbacks: SimulatorCallbacks = {},
    ) {}

    get connected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN
    }

    private wsUrl(): string {
        let url = this.config.url.trim()
        // 浏览器 WS 不能设自定义 header，self_id / access_token 走查询参数，
        // 由 WebUI 后端的桥接端点转成 X-Self-ID / Authorization 头后连 OneBot
        const params = [`self_id=${this.config.selfId}`]
        if (this.config.access_token) {
            params.push(
                `access_token=${encodeURIComponent(this.config.access_token)}`,
            )
        }
        return url + (url.includes('?') ? '&' : '?') + params.join('&')
    }

    connect(): void {
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            return
        }
        this.explicitlyClosed = false
        this.clearReconnect()

        const url = this.wsUrl()
        this.callbacks.onLog?.(`正在连接 ${url.replace(/access_token=[^&]*/, 'access_token=***')}`)
        const ws = new WebSocket(url)
        this.ws = ws

        ws.onopen = () => {
            this.callbacks.onLog?.('连接成功，发送 lifecycle 事件')
            this.sendEvent(buildLifecycleEvent(this.config.selfId))
            this.startHeartbeat()
            this.callbacks.onStateChange?.(true)
        }

        ws.onmessage = event => {
            this.handleMessage(String(event.data))
        }

        ws.onerror = () => {
            this.callbacks.onError?.(`连接 ${this.config.url} 发生错误`)
        }

        ws.onclose = () => {
            this.stopHeartbeat()
            this.callbacks.onStateChange?.(false)
            const reconnect =
                this.config.autoReconnect !== false && !this.explicitlyClosed
            if (reconnect) {
                const delay = (this.config.reconnectInterval ?? 3) * 1000
                this.callbacks.onLog?.(
                    `连接关闭，${Math.round(delay / 1000)} 秒后自动重连`,
                )
                this.reconnectTimer = window.setTimeout(
                    () => this.connect(),
                    delay,
                )
            }
        }
    }

    disconnect(): void {
        this.explicitlyClosed = true
        this.clearReconnect()
        this.stopHeartbeat()
        if (this.ws) {
            this.ws.onclose = null
            this.ws.close()
            this.ws = null
        }
        this.callbacks.onStateChange?.(false)
    }

    /** 向框架推送事件（消息事件、元事件等） */
    sendEvent(event: OneBotEvent): boolean {
        if (!this.connected) return false
        this.ws!.send(JSON.stringify(event))
        return true
    }

    private handleMessage(raw: string): void {
        let packet: Record<string, any>
        try {
            packet = JSON.parse(raw)
        } catch {
            this.callbacks.onLog?.('收到无法解析的消息，已忽略')
            return
        }

        // WebUI 后端桥接通道的控制消息
        if (packet.type === 'bridge_error') {
            this.callbacks.onError?.(String(packet.message ?? '桥接出错'))
            return
        }
        if (packet.type === 'bridge_bot_info') {
            this.callbacks.onBotInfo?.(
                (packet.bots ?? []).map((b: Record<string, any>) => ({
                    user_id: String(b.user_id ?? ''),
                    nickname: String(b.nickname ?? ''),
                    ava_url: String(b.ava_url ?? ''),
                })),
            )
            return
        }

        const request = packet as ActionRequest
        // 心跳相关的动作请求没有 action 字段（是事件），忽略非动作包
        if (!request.action) return

        this.callbacks.onAction?.(request)
        const response = this.handleAction(request)

        // 先按协议把响应送回 OneBot，再做展示回调——
        // 回调里若阻塞/异常，不能让响应滞留造成 nonebot 侧 send_msg 超时
        if (this.connected) {
            this.ws!.send(JSON.stringify(response))
        }
    }

    private startHeartbeat(): void {
        this.stopHeartbeat()
        const interval = (this.config.heartbeatInterval ?? 30) * 1000
        this.heartbeatTimer = window.setInterval(() => {
            this.sendEvent(buildHeartbeatEvent(this.config.selfId, interval / 1000))
        }, interval)
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer !== null) {
            clearInterval(this.heartbeatTimer)
            this.heartbeatTimer = null
        }
    }

    private clearReconnect(): void {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
    }

    /** 动作应答：委托给完整的 action 应答表 */
    private handleAction(request: ActionRequest): ActionResponse {
        return handleAction(request, {
            selfId: this.config.selfId,
            onBotMessage: info => this.callbacks.onBotMessage?.(info),
        })
    }
}

