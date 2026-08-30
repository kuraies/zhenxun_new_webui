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

/** 消息段数组转可读文本，用于界面展示 */
export const segmentsToText = (message: MessageContent): string => {
    if (typeof message === 'string') return message
    return message
        .map(segment => {
            switch (segment.type) {
                case 'text':
                    return String(segment.data.text ?? '')
                case 'at':
                    return `@${segment.data.qq}`
                case 'face':
                    return `[表情${segment.data.id}]`
                case 'image':
                    return '[图片]'
                case 'reply':
                    return `[回复${segment.data.id}]`
                case 'record':
                    return '[语音]'
                case 'video':
                    return '[视频]'
                case 'json':
                    return `[JSON:${segment.data.data}]`
                default:
                    return `[${segment.type}]`
            }
        })
        .join('')
}
