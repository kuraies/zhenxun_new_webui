<script setup lang="ts">
import {
    ArrowLeft,
    FileText,
    ImageIcon,
    Link2,
    MapPin,
    MessageSquare,
    Mic,
    Music,
    PanelRight,
    Send,
    Video,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useChatStore } from "@/store/chat.ts";
import { computed, onMounted, ref, watch } from "vue";
import { ZXNotification } from "@/services/ui";
import { sendMessage as sendWsMessage } from "@/utils/api-next/websocket-chat";
import { useBotStore } from "@/store/bot.ts";
import { useVoiceRecorder } from "@/composables/useVoiceRecorder";
import { useCustomCaret } from "@/composables/useCustomCaret";
import type { ChatMessage, ChatMessagePart } from "@/types";

const props = defineProps<{
    /** 右侧详情面板是否展开（用于按钮高亮） */
    detailOpen?: boolean;
}>();

const emit = defineEmits<{
    "toggle-detail": [];
}>();

const chatStore = useChatStore();
const botStore = useBotStore();

const { selectedContact, friends, groups, selectedId, messages } =
    storeToRefs(chatStore);
const { appendCurrentMessage, removeCurrentMessage, createMessageId } =
    chatStore;

// 消息容器 ref
const messagesContainer = ref<HTMLElement | null>(null);

// 文件输入 ref
const imageInput = ref<HTMLInputElement | null>(null);

// 获取当前选中联系人的详细信息
const currentContactInfo = computed(() => {
    if (!selectedContact.value || !selectedId.value) {
        return null;
    }
    if (selectedContact.value === "friend") {
        const friend = friends.value.find(
            (f) => f.user_id === selectedId.value,
        );
        if (friend) {
            return {
                name: friend.nickname || friend.remark || "未知好友",
                id: friend.user_id,
                avatar: friend.ava_url,
            };
        }
    } else if (selectedContact.value === "group") {
        const group = groups.value.find((g) => g.group_id === selectedId.value);
        if (group) {
            return {
                name: group.group_name,
                id: group.group_id,
                avatar: group.ava_url,
            };
        }
    }
    return null;
});

// 将文件转换为 base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// ==================== 富文本输入框（图片内联）+ 语音附件 ====================

// 富文本编辑器（contenteditable），图片以 <img> 内联在文字之间
const editorRef = ref<HTMLElement | null>(null);
/** 编辑器里内联图片的 dataUrl -> 纯 base64 缓存 */
const imageBase64Map = new Map<string, string>();

// 自绘光标：行内图片撑高行框时原生光标会变高，改画恒定字高的光标
useCustomCaret(editorRef);

/** 待发送语音（录音后挂在输入框上方） */
interface VoiceItem {
    id: number;
    dataUrl: string;
    base64: string;
    duration: number;
}

const voiceItems = ref<VoiceItem[]>([]);
let voiceSeq = 0;

const removeVoiceItem = (id: number) => {
    voiceItems.value = voiceItems.value.filter((item) => item.id !== id);
};

/** 在光标处插入内联图片 */
const insertInlineImage = (dataUrl: string) => {
    const editor = editorRef.value;
    if (!editor) return;
    editor.focus();
    let inserted = false;
    try {
        inserted = document.execCommand("insertImage", false, dataUrl);
    } catch {
        inserted = false;
    }
    if (!inserted) {
        const img = document.createElement("img");
        img.src = dataUrl;
        editor.appendChild(img);
    }
    imageBase64Map.set(dataUrl, dataUrl.split(",")[1] ?? "");
};

/** 选择/粘贴/拖拽来的图片统一从这里进编辑器（类型/大小校验） */
const enqueueImages = async (files: File[]) => {
    for (const file of files) {
        if (!file.type.startsWith("image/")) {
            ZXNotification({
                title: "提示",
                message: "只能选择图片文件哦～",
                type: "info",
                position: "top-right",
            });
            continue;
        }
        if (file.size > 10 * 1024 * 1024) {
            ZXNotification({
                title: "提示",
                message: "图片大小不能超过 10MB 哦～",
                type: "info",
                position: "top-right",
            });
            continue;
        }
        insertInlineImage(await fileToBase64(file));
    }
};

// 处理图片选择（文件选择器，支持多选）
const handleImageSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    await enqueueImages(files);
    input.value = "";
};

// 粘贴：图片插入编辑器，纯文本按原样插入
const handlePaste = async (event: ClipboardEvent) => {
    const clipboard = event.clipboardData;
    const files = Array.from(clipboard?.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
    );
    if (files.length) {
        event.preventDefault();
        await enqueueImages(files);
        return;
    }
    const text = clipboard?.getData("text/plain");
    if (text) {
        // 只按纯文本插入，避免外部富文本样式混进来
        event.preventDefault();
        document.execCommand("insertText", false, text);
    }
};

let dragDepth = 0;
const dragOver = ref(false);

const handleDragEnter = () => {
    dragDepth += 1;
    dragOver.value = true;
};

const handleDragLeave = () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dragOver.value = false;
};

// 拖拽图片到输入区插入编辑器
const handleDrop = async (event: DragEvent) => {
    dragDepth = 0;
    dragOver.value = false;
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
    );
    if (!files.length) return;
    await enqueueImages(files);
};

/** 编辑器内容切面：按顺序抽出文字与内联图片 */
interface EditorPiece {
    type: "text" | "image";
    text?: string;
    dataUrl?: string;
}

const extractEditor = (): EditorPiece[] => {
    const pieces: EditorPiece[] = [];
    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            pieces.push({ type: "text", text: node.textContent ?? "" });
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        if (el.tagName === "IMG") {
            pieces.push({ type: "image", dataUrl: el.getAttribute("src") ?? "" });
            return;
        }
        if (el.tagName === "BR") {
            pieces.push({ type: "text", text: "\n" });
            return;
        }
        // contenteditable 的换行是 <div>/<p> 块，抽成换行符
        if (el.tagName === "DIV" || el.tagName === "P") {
            pieces.push({ type: "text", text: "\n" });
        }
        Array.from(el.childNodes).forEach(walk);
    };
    Array.from(editorRef.value?.childNodes ?? []).forEach(walk);
    return pieces;
};

const clearEditor = () => {
    if (editorRef.value) editorRef.value.innerHTML = "";
    imageBase64Map.clear();
};

// ==================== 语音输入 ====================

const {
    recording: voiceRecording,
    duration: voiceDuration,
    start: startRecording,
    stop: stopRecording,
} = useVoiceRecorder();

const toggleRecord = async () => {
    if (voiceRecording.value) {
        const result = await stopRecording();
        if (result?.base64) {
            voiceItems.value.push({
                id: ++voiceSeq,
                dataUrl: result.dataUrl,
                base64: result.base64,
                duration: result.duration,
            });
        } else if (!result) {
            ZXNotification({
                title: "录音失败",
                message: "这段语音没能录下来，再试一次吧 (´；ω；`)",
                type: "😭",
                position: "top-right",
            });
        }
        return;
    }
    const ok = await startRecording();
    if (!ok) {
        ZXNotification({
            title: "无法录音",
            message: "没有拿到麦克风权限哦 (｡•ˇ‸ˇ•｡)",
            type: "😭",
            position: "top-right",
        });
    }
};

// 发送侧内容段（content 为线上协议格式：文本原文 / base64:// 图片 / base64://voice/ 语音）
interface OutgoingPart {
    type: "text" | "image" | "record";
    content: string;
}

/** 编辑器内容 + 语音附件 → 有序发送段 */
const buildOutgoingParts = (): OutgoingPart[] => {
    const parts: OutgoingPart[] = [];
    for (const piece of extractEditor()) {
        if (piece.type === "text") {
            const text = piece.text ?? "";
            if (!text) continue;
            const last = parts[parts.length - 1];
            if (last && last.type === "text") {
                last.content += text;
            } else {
                parts.push({ type: "text", content: text });
            }
        } else if (piece.dataUrl) {
            parts.push({
                type: "image",
                content: `base64://${
                    imageBase64Map.get(piece.dataUrl) ??
                    piece.dataUrl.split(",")[1] ??
                    ""
                }`,
            });
        }
    }
    for (const voice of voiceItems.value) {
        parts.push({
            type: "record",
            content: `base64://voice/${voice.base64}`,
        });
    }
    return parts;
};

// 发送消息（编辑器文字 + 内联图片 + 语音合为一条消息）
const handleSendMessage = async () => {
    const parts = buildOutgoingParts();
    const hasContent = parts.some(
        (part) => part.type !== "text" || part.content.trim(),
    );
    if (!hasContent) {
        ZXNotification({
            title: "提示",
            message: "消息不能为空哦～",
            type: "info",
            position: "top-right",
        });
        return;
    }

    if (!selectedContact.value || !selectedId.value) {
        ZXNotification({
            title: "呜呼～",
            message: "请先选择一个聊天对象哦 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
        return;
    }

    const bot = getCurrentBot();
    if (!bot || !bot.self_id) {
        ZXNotification({
            title: "呜呼～",
            message: "没有找到可用的 Bot (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
        return;
    }

    // 单段沿用旧格式（纯文本/base64 图片/base64 语音），混合走 zxmsg:// JSON
    const single = parts.length === 1 ? parts[0] : null;
    const wireMessage = single
        ? single.type === "text"
            ? single.content.trim()
            : single.content
        : `zxmsg://${JSON.stringify(parts)}`;

    // 本地回显：媒体段换成 data URL 直接可显示
    const echoParts: ChatMessagePart[] = parts.map((part) => {
        if (part.type === "text") {
            return { type: "text", content: part.content };
        }
        let payload = part.content;
        if (payload.startsWith("base64://voice/")) {
            payload = payload.slice("base64://voice/".length);
        } else if (payload.startsWith("base64://")) {
            payload = payload.slice("base64://".length);
        }
        const mime = part.type === "record" ? "audio/webm" : "image/png";
        return {
            type: part.type,
            content: payload ? `data:${mime};base64,${payload}` : part.content,
        };
    });
    const textSummary = parts
        .filter((part) => part.type === "text")
        .map((part) => part.content)
        .join("")
        .trim();

    const botAvatar =
        bot.ava_url || `http://q1.qlogo.cn/g?b=qq&nk=${bot.self_id}&s=160`;
    const newMessage: ChatMessage = {
        id: createMessageId(),
        user_id: bot.self_id,
        user_name: "小真寻",
        avatar: botAvatar,
        message:
            textSummary ||
            echoParts.find((part) => part.type !== "text")?.content ||
            "",
        message_type: parts[0].type,
        timestamp: new Date().toISOString(),
        is_self: true,
        group_id:
            selectedContact.value === "group" ? selectedId.value : undefined,
        parts: parts.length > 1 ? echoParts : undefined,
    };
    await appendCurrentMessage(newMessage);

    try {
        // 使用 WebSocket 模块发送消息（调用 /manage/send_message 接口）
        await sendWsMessage(
            { self_id: bot.self_id, name: <string>bot.nickname },
            selectedContact.value === "group" ? selectedId.value : null,
            selectedContact.value === "friend" ? selectedId.value : null,
            wireMessage,
        );
    } catch (error: any) {
        console.error("发送消息失败:", error);
        // 发送失败，移除刚添加的消息
        await removeCurrentMessage(newMessage.id);
        ZXNotification({
            title: "发送失败",
            message: "消息发送失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
        return;
    }

    clearEditor();
    voiceItems.value = [];
    scrollToBottom();
};

// 获取当前可用的 bot（使用全局选中的 Bot）
const getCurrentBot = () => {
    return botStore.selectedBot || null;
};


// 触发图片上传
const triggerImageUpload = () => {
    imageInput.value?.click();
};

// 滚动到底部
const scrollToBottom = () => {
    if (messagesContainer.value) {
        setTimeout(() => {
            messagesContainer.value?.scrollTo({
                top: messagesContainer.value.scrollHeight,
                behavior: "smooth",
            });
        }, 100);
    }
};

// JSON 字符串尽量格式化展示，失败原样返回
const formatStructured = (raw: string) => {
    try {
        return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
        return raw;
    }
};

// 监听消息变化，自动滚动
watch(
    () => messages.value.length,
    () => {
        scrollToBottom();
    },
);

onMounted(async () => {
    scrollToBottom();
});
</script>

<template>
    <div
        :class="[
            'flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm',
            selectedContact ? 'flex' : 'hidden sm:flex',
        ]"
    >
        <!-- 当前聊天信息 -->
        <div
            v-if="currentContactInfo"
            class="flex items-center gap-3 border-b border-gray-200 px-4 pl-6 py-3 pt-4"
        >
            <!-- 移动端返回按钮 -->
            <button
                @click="
                    selectedContact = null;
                    selectedId = '';
                "
                class="flex-shrink-0 rounded-2xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100 sm:hidden"
            >
                <ArrowLeft class="h-5 w-5" />
            </button>
            <div
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-zx-primary-soft text-xs font-bold text-zx-primary"
            >
                <img
                    v-if="currentContactInfo.avatar"
                    :src="currentContactInfo.avatar"
                    referrerpolicy="no-referrer"
                    class="h-full w-full object-cover"
                    @error="
                        (e) =>
                            ((e.target as HTMLImageElement).style.display =
                                'none')
                    "
                />
                <span v-if="!currentContactInfo.avatar">{{
                    currentContactInfo.name.charAt(0)
                }}</span>
            </div>
            <div class="flex min-w-0 flex-1 items-baseline gap-2">
                <p class="truncate font-bold text-gray-700">
                    {{ currentContactInfo.name }}
                </p>
                <p class="truncate text-xs text-gray-500">
                    {{ currentContactInfo.id }}
                </p>
            </div>
            <!-- 右侧详情面板开关 -->
            <button
                :class="
                    props.detailOpen
                        ? 'bg-zx-primary-soft text-zx-primary'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                "
                class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                :title="props.detailOpen ? '收起详情' : '查看详情'"
                @click="emit('toggle-detail')"
            >
                <PanelRight class="h-4 w-4" />
            </button>
        </div>

        <!-- 消息列表 -->
        <div
            ref="messagesContainer"
            class="flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4"
        >
            <div
                v-if="messages.length === 0"
                class="flex h-full items-center justify-center text-gray-400"
            >
                <div class="px-4 text-center">
                    <MessageSquare
                        class="mx-auto mb-4 h-12 w-12 opacity-50 sm:h-16 sm:w-16"
                    />
                    <p class="text-sm sm:text-base">暂无消息</p>
                    <p class="mt-2 text-xs sm:text-sm">
                        选择一个联系人开始聊天吧～
                    </p>
                </div>
            </div>

            <div
                v-for="message in messages"
                :key="message.id"
                :class="message.is_self ? 'justify-end' : 'justify-start'"
                class="flex items-start space-x-2 sm:space-x-3"
            >
                <!-- 头像 -->
                <div
                    v-if="!message.is_self"
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-zx-primary-soft text-xs font-bold text-zx-primary sm:h-10 sm:w-10 sm:text-sm"
                >
                    <img
                        v-if="message.avatar"
                        :src="message.avatar"
                        referrerpolicy="no-referrer"
                        class="h-full w-full object-cover"
                        @error="message.avatar = ''"
                    />
                    <span v-else>{{
                        (message.user_name || message.user_id).charAt(0)
                    }}</span>
                </div>

                <!-- 消息内容：图片不带气泡直接展示，其余用气泡 -->
                <div class="min-w-0">
                    <p
                        class="mb-1 text-xs text-gray-600"
                        v-if="!message.is_self && message.group_id"
                    >
                        {{ message.user_name || "未知用户" }}
                    </p>

                    <!-- 混合内容消息：文字与图片/语音按原始顺序混排 -->
                    <div
                        v-if="message.parts && message.parts.length > 1"
                        :class="
                            message.is_self
                                ? 'bg-zx-primary text-white rounded-br-xs'
                                : 'bg-gray-200 text-gray-800 rounded-bl-xs'
                        "
                        class="max-w-[70%] overflow-hidden rounded-2xl sm:max-w-md"
                    >
                        <div class="flex flex-col gap-1 px-3 py-2">
                            <template
                                v-for="(part, partIndex) in message.parts"
                                :key="partIndex"
                            >
                                <img
                                    v-if="part.type === 'image'"
                                    :src="part.content"
                                    class="max-h-48 max-w-full cursor-pointer rounded-lg object-contain"
                                    referrerpolicy="no-referrer"
                                />
                                <audio
                                    v-else-if="part.type === 'record'"
                                    controls
                                    :src="part.content"
                                    class="h-8 max-w-56"
                                ></audio>
                                <p
                                    v-else
                                    class="whitespace-pre-wrap break-words text-xs sm:text-sm"
                                >{{ part.content }}</p>
                            </template>
                        </div>
                    </div>

                    <!-- 图片消息 -->
                    <div
                        v-else-if="message.message_type === 'image'"
                        class="max-w-[70%] overflow-hidden rounded-xl sm:max-w-xs"
                    >
                        <el-image
                            :src="message.message"
                            class="max-w-full cursor-pointer align-top"
                            :preview-src-list="[message.message]"
                            referrerpolicy="no-referrer"
                            hide-on-click-modal
                        >
                            <template #placeholder>
                                <div
                                    class="flex h-32 w-48 items-center justify-center rounded-xl bg-gray-100"
                                >
                                    <div class="text-xs text-gray-400">
                                        加载中...
                                    </div>
                                </div>
                            </template>
                            <template #error>
                                <div
                                    class="flex h-32 w-48 items-center justify-center rounded-xl bg-gray-100"
                                >
                                    <div class="text-center text-gray-400">
                                        <div class="mb-1 text-2xl">⚠️</div>
                                        <span class="text-xs"
                                            >图片加载失败</span
                                        >
                                    </div>
                                </div>
                            </template>
                        </el-image>
                    </div>

                    <!-- 语音消息 -->
                    <div
                        v-else-if="message.message_type === 'record'"
                        :class="message.is_self ? 'bg-zx-primary text-white' : 'bg-gray-200 text-gray-800'"
                        class="max-w-[70%] overflow-hidden rounded-2xl sm:max-w-md"
                    >
                        <div class="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm">
                            <Mic class="h-4 w-4 shrink-0" />
                            <audio
                                v-if="message.message"
                                controls
                                :src="message.message"
                                class="h-8 max-w-56"
                            ></audio>
                            <span v-else>语音消息</span>
                        </div>
                    </div>

                    <!-- 视频消息 -->
                    <div
                        v-else-if="message.message_type === 'video'"
                        class="max-w-[70%] overflow-hidden rounded-xl sm:max-w-md"
                    >
                        <video
                            v-if="message.message"
                            controls
                            :src="message.message"
                            class="max-h-72 max-w-full rounded-xl"
                        ></video>
                        <div
                            v-else
                            :class="message.is_self ? 'bg-zx-primary text-white' : 'bg-gray-200 text-gray-800'"
                            class="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm"
                        >
                            <Video class="h-4 w-4 shrink-0" />
                            视频消息
                        </div>
                    </div>

                    <!-- JSON / XML 卡片数据 -->
                    <div
                        v-else-if="
                            message.message_type === 'json' ||
                            message.message_type === 'xml'
                        "
                        class="max-w-[70%] overflow-hidden rounded-2xl sm:max-w-md"
                    >
                        <div class="flex items-center gap-2 px-3 pt-2 text-xs text-gray-500">
                            <FileText class="h-3.5 w-3.5 shrink-0" />
                            {{ message.message_type === "json" ? "JSON 卡片" : "XML 卡片" }}
                        </div>
                        <pre
                            class="max-h-48 overflow-auto px-3 pb-2 pt-1 text-left font-mono text-[10px] leading-4 whitespace-pre-wrap text-gray-600"
                        >{{
                            formatStructured(message.message)
                        }}</pre>
                    </div>

                    <!-- 链接 / 音乐 / 位置 / 合并转发 卡片 -->
                    <div
                        v-else-if="
                            message.message_type === 'share' ||
                            message.message_type === 'music' ||
                            message.message_type === 'location' ||
                            message.message_type === 'forward'
                        "
                        class="max-w-[70%] overflow-hidden rounded-2xl bg-gray-200 text-gray-800 sm:max-w-md"
                    >
                        <div class="flex items-start gap-2 px-3 py-2">
                            <Link2
                                v-if="message.message_type === 'share'"
                                class="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                            />
                            <Music
                                v-else-if="message.message_type === 'music'"
                                class="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                            />
                            <MapPin
                                v-else-if="message.message_type === 'location'"
                                class="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                            />
                            <MessageSquare
                                v-else
                                class="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                            />
                            <div class="min-w-0">
                                <p class="break-words text-xs sm:text-sm">
                                    {{
                                        message.message ||
                                        message.message_type.replace(/^\w/, (c) =>
                                            c.toUpperCase(),
                                        )
                                    }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 表情消息 -->
                    <div
                        v-else-if="message.message_type === 'face'"
                        :class="message.is_self ? 'bg-zx-primary text-white' : 'bg-gray-200 text-gray-800'"
                        class="max-w-[70%] overflow-hidden rounded-2xl sm:max-w-md"
                    >
                        <p class="px-3 py-2 text-xs sm:text-sm">
                            [表情 {{ message.message }}]
                        </p>
                    </div>

                    <!-- 文本等其它消息 -->
                    <div
                        v-else
                        :class="[
                            message.is_self
                                ? 'bg-zx-primary text-white rounded-br-xs'
                                : 'bg-gray-200 text-gray-800 rounded-bl-xs',
                        ]"
                        class="max-w-[70%] overflow-hidden rounded-2xl sm:max-w-md"
                    >
                        <p class="px-3 py-2 text-xs break-words sm:text-sm">
                            {{ message.message }}
                        </p>
                    </div>

                    <p
                        :class="
                            message.is_self ? 'text-right' : 'text-left'
                        "
                        class="mt-1 text-[10px] text-gray-500"
                    >
                        {{ new Date(message.timestamp).toLocaleTimeString() }}
                    </p>
                </div>

                <!-- 自己的头像 -->
                <div
                    v-if="message.is_self"
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-zx-primary-soft text-xs font-bold text-zx-primary sm:h-10 sm:w-10 sm:text-sm"
                >
                    <img
                        v-if="message.avatar"
                        :src="message.avatar"
                        referrerpolicy="no-referrer"
                        class="h-full w-full object-cover"
                        @error="message.avatar = ''"
                    />
                    <span v-else>{{ "自" }}</span>
                </div>
            </div>
        </div>

        <!-- 输入框区域 -->
        <div
            class="relative border-t border-gray-100 bg-white p-3"
            v-if="selectedContact"
            @dragenter.prevent="handleDragEnter"
            @dragover.prevent
            @dragleave="handleDragLeave"
            @drop.prevent="handleDrop"
        >
            <!-- 语音附件（录音后挂在输入框上方） -->
            <div
                v-if="voiceItems.length || voiceRecording"
                class="mb-2 flex items-center gap-2 overflow-x-auto"
            >
                <div
                    v-for="item in voiceItems"
                    :key="item.id"
                    class="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-2.5 py-1.5"
                >
                    <Mic class="h-4 w-4 shrink-0 text-zx-primary" />
                    <audio controls :src="item.dataUrl" class="h-8 max-w-44"></audio>
                    <span class="shrink-0 text-xs text-slate-400">
                        {{ item.duration }}s
                    </span>
                    <button
                        class="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="移除"
                        type="button"
                        @click="removeVoiceItem(item.id)"
                    >
                        <X class="h-3 w-3" />
                    </button>
                </div>
                <!-- 录音中提示 -->
                <div
                    v-if="voiceRecording"
                    class="flex shrink-0 items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5"
                >
                    <span
                        class="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"
                    ></span>
                    <span class="text-xs font-semibold text-red-500">
                        录音中 {{ voiceDuration }}s
                    </span>
                </div>
            </div>

            <!-- 工具栏（输入框上方） -->
            <div class="mb-1.5 flex items-center gap-0.5 px-0.5">
                <button
                    type="button"
                    @click="triggerImageUpload"
                    class="btn-touch flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    title="插入图片"
                >
                    <ImageIcon class="h-4 w-4" />
                </button>
                <!-- 隐藏的图片输入（可多选） -->
                <input
                    ref="imageInput"
                    type="file"
                    accept="image/*"
                    multiple
                    class="hidden"
                    @change="handleImageSelect"
                />

                <!-- 语音按钮 -->
                <button
                    type="button"
                    :class="
                        voiceRecording
                            ? 'bg-red-100 text-red-500'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    "
                    class="btn-touch flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                    :title="
                        voiceRecording
                            ? `停止录音（${voiceDuration}s）`
                            : '录制语音'
                    "
                    @click="toggleRecord"
                >
                    <Mic
                        :class="voiceRecording ? 'animate-pulse' : ''"
                        class="h-4 w-4"
                    />
                </button>
            </div>

            <!-- 拖拽提示遮罩 -->
            <div
                v-if="dragOver"
                class="pointer-events-none absolute inset-x-0 bottom-0 z-10 m-3 rounded-2xl border-2 border-dashed border-zx-primary bg-white/80 py-6 text-center text-xs font-semibold text-zx-primary"
            >
                松开把图片插入输入框
            </div>

            <!-- 富文本输入框：文字与内联图片混排，发送按钮在框内右下角 -->
            <div class="relative">
                <div
                    ref="editorRef"
                    contenteditable="true"
                    data-placeholder="输入消息，按 Enter 发送"
                    class="rich-editor max-h-32 min-h-11 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-14 text-sm leading-5 text-slate-700 focus:outline-none"
                    @keydown.enter.exact.prevent="handleSendMessage"
                    @paste="handlePaste"
                ></div>
                <button
                    type="button"
                    @click="handleSendMessage"
                    class="btn-touch absolute bottom-1.5 right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zx-primary text-white shadow-sm transition-colors hover:bg-zx-primary-hover"
                    title="发送"
                >
                    <Send class="h-4 w-4" />
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 富文本输入框：内联图片与占位提示（运行时插入的节点拿不到 scoped 属性，需 :deep）
   图片与文字行内混排，同行文字与图片底部对齐（text-bottom），行框随图片撑高 */
.rich-editor :deep(img) {
    display: inline-block;
    max-height: 6rem;
    max-width: 12rem;
    margin: 0 2px;
    border-radius: 0.5rem;
    vertical-align: text-bottom;
}

/* 原生光标由 useCustomCaret 自绘替代 */
.rich-editor {
    caret-color: transparent;
}

.rich-editor:empty::before {
    content: attr(data-placeholder);
    color: var(--zx-color-text-muted, #94a3b8);
    pointer-events: none;
}

/* 图片按原始比例完整显示，只限制最大尺寸；
   el-image 内层默认铺满容器 + cover 会把图裁掉 */
:deep(.el-image__inner) {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 20rem;
}
</style>
