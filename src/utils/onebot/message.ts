/**
 * OneBot v11 消息段构造与展示
 */
import type { MessageContent, MessageSegment } from './types'

export const seg = {
    text: (text: string): MessageSegment => ({ type: 'text', data: { text } }),
    at: (qq: string | number): MessageSegment => ({ type: 'at', data: { qq: String(qq) } }),
    face: (id: string | number): MessageSegment => ({ type: 'face', data: { id: Number(id) } }),
    image: (file: string): MessageSegment => ({ type: 'image', data: { file } }),
    reply: (id: string | number): MessageSegment => ({ type: 'reply', data: { id: String(id) } }),
    record: (file: string): MessageSegment => ({ type: 'record', data: { file } }),
    video: (file: string): MessageSegment => ({ type: 'video', data: { file } }),
    json: (data: unknown): MessageSegment => ({ type: 'json', data: { data: JSON.stringify(data) } }),
    xml: (data: string): MessageSegment => ({ type: 'xml', data: { data } }),
    /** 猜拳魔法表情 */
    rps: (): MessageSegment => ({ type: 'rps', data: {} }),
    /** 掷骰子魔法表情 */
    dice: (): MessageSegment => ({ type: 'dice', data: {} }),
    /** 窗口抖动 */
    shake: (): MessageSegment => ({ type: 'shake', data: {} }),
    /** 戳一戳（go-cqhttp）：poke.type / poke.id 为戳一戳类型与参数 */
    poke: (type: string | number, id: string | number): MessageSegment => ({
        type: 'poke',
        data: { type: Number(type), id: Number(id) },
    }),
    /** 匿名发群消息 */
    anonymous: (): MessageSegment => ({ type: 'anonymous', data: {} }),
    /** 链接分享 */
    share: (url: string, title: string, content?: string, image?: string): MessageSegment => ({
        type: 'share',
        data: { url, title, ...(content ? { content } : {}), ...(image ? { image } : {}) },
    }),
    /** 推荐好友/群名片 */
    contact: (type: 'qq' | 'group', id: string | number): MessageSegment => ({
        type: 'contact',
        data: { type, id: String(id) },
    }),
    /** 位置分享 */
    location: (lat: number, lon: number, title?: string, content?: string): MessageSegment => ({
        type: 'location',
        data: { lat, lon, ...(title ? { title } : {}), ...(content ? { content } : {}) },
    }),
    /** 音乐分享：type 为 qq/163 时给 id，自定义音乐用 url/audio/title */
    music: (type: 'qq' | '163' | 'custom', id: string, url?: string, audio?: string, title?: string): MessageSegment => ({
        type: 'music',
        data:
            type === 'custom'
                ? { type, url, audio, title }
                : { type, id },
    }),
    /** 合并转发消息（收） */
    forward: (id: string): MessageSegment => ({ type: 'forward', data: { id } }),
    /** 合并转发节点（发）：传 id 表示引用已有消息，否则传自造节点内容 */
    node: (content: MessageContent, userId?: string | number, nickname?: string): MessageSegment => ({
        type: 'node',
        data: userId
            ? { type: 'node', user_id: String(userId), nickname: nickname ?? '', content }
            : { type: 'node', id: typeof content === 'string' ? content : '' },
    }),
    /** 文本转语音（go-cqhttp） */
    tts: (text: string): MessageSegment => ({ type: 'tts', data: { text } }),
}

/** 粗略判断字符串是否为 base64 负载（图片/语音的二进制体） */
export const looksLikeBase64 = (text: string): boolean =>
    text.length > 64 && /^[A-Za-z0-9+/=\s]+$/.test(text)

/**
 * CQ 码字符串转消息段数组
 * 例：hello[CQ:image,file=a.png][CQ:at,qq=123]
 */
export const cqToSegments = (text: string): MessageSegment[] => {
    const segments: MessageSegment[] = []
    const re = /\[CQ:([a-z]+)([^\]]*)\]/g
    let last = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
        if (match.index > last) {
            segments.push(seg.text(text.slice(last, match.index)))
        }
        const data: Record<string, string> = {}
        for (const pair of match[2].split(',')) {
            if (!pair) continue
            const idx = pair.indexOf('=')
            if (idx > 0) {
                data[pair.slice(0, idx)] = pair.slice(idx + 1)
            }
        }
        segments.push({ type: match[1], data })
        last = match.index + match[0].length
    }
    if (last < text.length) {
        segments.push(seg.text(text.slice(last)))
    }
    return segments
}

/** 消息段数组转 CQ 码字符串（框架吃字符串格式时使用） */
export const segmentsToCq = (message: MessageContent): string => {
    if (typeof message === 'string') return message
    return message
        .map(segment => {
            if (segment.type === 'text') return String(segment.data.text ?? '')
            const params = Object.entries(segment.data ?? {})
                .map(([k, v]) => `,${k}=${v}`)
                .join('')
            return `[CQ:${segment.type}${params}]`
        })
        .join('')
}

/**
 * 统一框架发来的消息形态：
 * CQ 码字符串 -> 消息段数组（其余原样保留）
 * 返回规整后的消息与纯文本摘要
 */
export const normalizeIncoming = (
    message: MessageContent | undefined,
): { message: MessageContent; text: string } => {
    if (message === undefined || message === null) {
        return { message: '', text: '' }
    }
    const segments =
        typeof message === 'string' ? cqToSegments(message) : message
    return { message: segments, text: segmentsToText(segments) }
}

/** 消息段数组转可读文本，用于界面展示与日志 */
export const segmentsToText = (message: MessageContent): string => {
    if (typeof message === 'string') return message
    return message
        .map(segment => {
            const data = segment.data ?? {}
            switch (segment.type) {
                case 'text':
                case 'tts':
                    return String(data.text ?? '')
                case 'markdown':
                    return typeof data.data === 'string'
                        ? data.data
                        : String(data.data ?? '')
                case 'at':
                    return data.qq === 'all' ? '@全体成员' : `@${data.qq}`
                case 'face':
                    return `[表情${data.id}]`
                case 'image':
                    return data.type === 'flash' ? '[闪照]' : '[图片]'
                case 'reply':
                    return `[回复${data.id}]`
                case 'record':
                    return '[语音]'
                case 'video':
                    return '[视频]'
                case 'json': {
                    const raw = String(data.data ?? '')
                    try {
                        const obj = JSON.parse(raw)
                        return `[JSON卡片:${obj?.prompt ?? obj?.title ?? ''}]`
                    } catch {
                        return `[JSON卡片]`
                    }
                }
                case 'xml':
                    return '[XML卡片]'
                case 'rps':
                    return '[猜拳]'
                case 'dice':
                    return data.magic ? `[骰子${data.magic}]` : '[骰子]'
                case 'shake':
                    return '[窗口抖动]'
                case 'poke':
                    return '[戳一戳]'
                case 'anonymous':
                    return ''
                case 'share':
                    return `[链接分享:${data.title ?? ''}]`
                case 'contact':
                    return data.type === 'group' ? `[推荐群:${data.id}]` : `[推荐好友:${data.id}]`
                case 'location':
                    return `[位置:${data.title ?? `${data.lat},${data.lon}`}]`
                case 'music':
                    return `[音乐:${data.title ?? data.id ?? ''}]`
                case 'forward':
                    return '[合并转发消息]'
                case 'node':
                    return '[转发节点]'
                default:
                    return `[${segment.type}]`
            }
        })
        .filter(Boolean)
        .join('')
}
