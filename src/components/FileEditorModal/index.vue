<template>
    <div
        ref="modalRoot"
        class="file-editor-modal fixed inset-0 glass-overlay flex items-center justify-center z-50"
        :class="animationClass"
        @click="handleClose"
    >
        <div
            class="modal-content bg-white rounded-2xl w-[900px] max-w-[95vw] h-[85vh] max-h-[90vh] shadow-xl flex flex-col"
            @click.stop
        >
            <!-- 标题栏 -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div class="flex items-center space-x-2">
                    <FileText class="w-5 h-5 text-blue-500" />
                    <h3 class="text-lg font-semibold text-gray-800">文件编辑</h3>
                    <span class="text-sm text-gray-500 ml-2 truncate max-w-[300px]">{{ currentFilePath }}</span>
                </div>
                <button
                    @click="handleClose"
                    class="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- 编辑器主体 -->
            <div class="flex-1 min-h-0 p-3">
                <ZXMonacoEditor
                    ref="editorRef"
                    v-model="editorContent"
                    :language="currentLanguage"
                    :path="currentFilePath"
                    :loading="loading"
                    @save="handleSave"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { FileText, X } from 'lucide-vue-next'
import { fileApi } from '@/utils/api-next'
import { ZXNotification } from '@/components'
import ZXMonacoEditor from '@/components/ZXMonacoEditor'

// Props
interface Props {
    initialFile?: {
        path: string
        name: string
        content?: string
    } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
    close: []
}>()

// 状态
const editorRef = ref<InstanceType<typeof ZXMonacoEditor> | null>(null)
const editorContent = ref('')
const loading = ref(false)
const currentLanguage = ref('auto')
const animationClass = ref('modal-jelly-enter-active')
const isClosing = ref(false)

// 当前文件路径（计算属性）
const currentFilePath = computed(() => props.initialFile?.path || '')

// 动画进入完成后清理类名
onMounted(() => {
    setTimeout(() => {
        animationClass.value = ''
    }, 500)
})

// 保存文件
const handleSave = async (content: string) => {
    if (!currentFilePath.value) return

    try {
        const res = await fileApi.saveFile(currentFilePath.value, content)
        if (res?.success) {
            ZXNotification({
                title: '保存成功～',
                message: '文件已经保存成功啦！',
                type: '🥳',
                position: 'top-right'
            })
        } else {
            ZXNotification({
                title: '保存失败',
                message: res?.message || '文件保存失败了 (´；ω；`)',
                type: '😭',
                position: 'top-right'
            })
        }
    } catch (error) {
        ZXNotification({
            title: '保存失败',
            message: '文件保存失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    }
}

// 关闭（带动画）
const handleClose = () => {
    if (isClosing.value) return
    isClosing.value = true
    animationClass.value = 'modal-jelly-leave-active'

    // 等待离开动画完成
    setTimeout(() => {
        emit('close')
    }, 250)
}

// 监听初始文件变化
watch(() => props.initialFile, async (file) => {
    if (file) {
        // 如果内容未提供，异步加载
        if (file.content === undefined) {
            loading.value = true
            try {
                // 使用 skipInterceptor 跳过拦截器的自动错误处理
                const res = await fileApi.readFile(file.path, { skipInterceptor: true })
                if (res?.success && res.data) {
                    const content = res.data.content || ''
                    // 更新 v-model，让 ZXMonacoEditor 的 watch 处理
                    editorContent.value = content
                } else {
                    // 读取失败，静默失败，设置空内容
                    editorContent.value = ''
                }
            } catch (error) {
                // 读取失败，静默失败，设置空内容
                editorContent.value = ''
            } finally {
                loading.value = false
            }
        } else {
            // 内容已提供，直接更新 v-model
            editorContent.value = file.content
        }

        nextTick(() => {
            // 自动检测语言
            const ext = file.name.split('.').pop()?.toLowerCase()
            const langMap: Record<string, string> = {
                'js': 'javascript',
                'ts': 'typescript',
                'py': 'python',
                'json': 'json',
                'yaml': 'yaml',
                'yml': 'yaml',
                'html': 'html',
                'css': 'css',
                'scss': 'scss',
                'md': 'markdown',
                'sql': 'sql',
                'sh': 'shell',
            }
            currentLanguage.value = langMap[ext || ''] || 'auto'
        })
    }
}, { immediate: true })
</script>

<style scoped>
/* 遮罩样式已在 custom.css 中统一定义 */
</style>
