<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
    Folder,
    File,
    Image as ImageIcon,
    ChevronRight,
    ArrowLeft,
    Trash2,
    Edit2,
    Plus,
    Download,
    Home,
    FileText,
    Save,
    X
} from 'lucide-vue-next'
import { fileApi } from '@/utils/api-next'
import type { FileItem } from '@/types/api-next.types'
import { ZXNotification, ZXMessageBox } from '@/components'
import FileEditorModal from '@/components/FileEditorModal'

// 当前路径
const currentPath = ref<string>('')
const pathSegments = ref<string[]>([])

// 文件列表
const fileList = ref<FileItem[]>([])
const loading = ref(false)

// 搜索
const searchQuery = ref('')

// 文件编辑器
const showEditor = ref(false)
const editorInitialFile = ref<{ path: string; name: string; content?: string } | null>(null)

// 图片预览
const showImagePreview = ref(false)
const currentImageUrl = ref('')
const currentImageName = ref('')
const imageScale = ref(1)
const imageRotation = ref(0)
const imageLoading = ref(false)

// 新建文件/文件夹对话框
const showNewDialog = ref(false)
const newItemType = ref<'file' | 'folder'>('file')
const newItemName = ref('')

// 重命名对话框
const showRenameDialog = ref(false)
const renamingFile = ref<FileItem | null>(null)
const newName = ref('')

// 文件大小格式化（备用）
const formatFileSize = (bytes: number | undefined | null, isFile: boolean = true) => {
    if (!isFile) return '-'
    if (bytes === undefined || bytes === null) return '--'
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化时间（备用）
const formatTime = (timestamp: string | number | undefined) => {
    if (timestamp === undefined) return '--'
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)
    return date.toLocaleString('zh-CN')
}

// 图片预览控制
const zoomIn = () => {
    if (imageScale.value < 3) {
        imageScale.value += 0.25
    }
}

const zoomOut = () => {
    if (imageScale.value > 0.5) {
        imageScale.value -= 0.25
    }
}

const resetZoom = () => {
    imageScale.value = 1
}

const rotateLeft = () => {
    imageRotation.value = (imageRotation.value - 90) % 360
}

const rotateRight = () => {
    imageRotation.value = (imageRotation.value + 90) % 360
}

const downloadImage = () => {
    if (!currentImageUrl.value) return
    const link = document.createElement('a')
    link.href = currentImageUrl.value
    link.download = currentImageName.value
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// 加载文件列表
const loadFileList = async (path: string = '') => {
    loading.value = true
    try {
        const res = await fileApi.getFileList(path || undefined)
        if (res?.success && res?.data) {
            // 使用后端返回的文件列表
            fileList.value = res.data.files || []
            // 使用后端返回的面包屑导航
            if (res.data.path_segments) {
                pathSegments.value = res.data.path_segments
            }
            currentPath.value = res.data.current_path || path
        }
    } catch (error) {
        ZXNotification({
            title: '呜呼～',
            message: '文件列表加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        loading.value = false
    }
}

// 进入文件夹
const enterFolder = (folder: FileItem) => {
    if (!folder.is_file) {
        const newPath = folder.path || (currentPath.value ? `${currentPath.value}/${folder.name}` : folder.name)
        loadFileList(newPath)
    }
}

// 返回上级
const goBack = () => {
    if (pathSegments.value.length > 0) {
        // 使用后端返回的面包屑导航，返回上一级
        const parentSegments = pathSegments.value.slice(0, -1)
        loadFileList(parentSegments.join('/'))
    } else if (currentPath.value) {
        // 返回根目录
        loadFileList('')
    }
}

// 返回首页
const goHome = () => {
    loadFileList('')
}

// 删除文件/文件夹
const handleDelete = async (file: FileItem) => {
    ZXMessageBox({
        title: file.is_file ? '删除文件' : '删除文件夹',
        message: `确定要删除 "${file.name}" 吗？此操作不可恢复！`,
        cancelButtonText: '取消',
        confirmButtonText: '删除',
        type: 'error',
        onConfirm: async () => {
            try {
                const fullPath = file.path || (currentPath.value ? `${currentPath.value}/${file.name}` : file.name)
                const res = file.is_file
                    ? await fileApi.deleteFile(fullPath)
                    : await fileApi.deleteFolder(fullPath)

                if (res?.success) {
                    ZXNotification({
                        title: '删除成功～',
                        message: `"${file.name}" 已经删除成功啦！`,
                        type: '👋',
                        position: 'top-right'
                    })
                    loadFileList(currentPath.value)
                }
            } catch (error) {
                ZXNotification({
                    title: '删除失败',
                    message: '删除操作失败了 (´；ω；`)',
                    type: '😭',
                    position: 'top-right'
                })
            }
        }
    })
}

// 打开文件编辑器
const openEditor = async (file: FileItem) => {
    if (!file.is_file) return

    // 如果是图片，显示预览
    if (file.is_image) {
        imageLoading.value = true
        try {
            const filePath = file.path || (currentPath.value ? `${currentPath.value}/${file.name}` : file.name)
            // 以图片方式读取，获取 base64 数据
            const res = await fileApi.readFile(filePath, { skipInterceptor: true, as_image: true })
            if (res?.success && res?.data) {
                currentImageUrl.value = res.data.content || ''
                currentImageName.value = file.name
                imageScale.value = 1
                imageRotation.value = 0
                showImagePreview.value = true
            }
        } catch (error) {
            ZXNotification({
                title: '加载失败',
                message: '图片加载失败了 (´；ω；`)',
                type: '😭',
                position: 'top-right'
            })
        } finally {
            imageLoading.value = false
        }
        return
    }

    // 文本文件，先尝试读取内容，成功后再打开编辑器
    const fullPath = file.path || (currentPath.value ? `${currentPath.value}/${file.name}` : file.name)
    try {
        // 使用 skipInterceptor 跳过拦截器的自动错误处理，由本组件自行处理错误
        const res = await fileApi.readFile(fullPath, { skipInterceptor: true })
        if (res?.success && res?.data) {
            // 读取成功，打开编辑器
            editorInitialFile.value = {
                path: fullPath,
                name: file.name,
                content: res.data.content
            }
            showEditor.value = true
        }
    } catch (error) {
        // 读取失败，不打开编辑器，仅显示错误通知
        const errorMessage = (error as any)?.response?.data?.message || '文件读取失败了 (´；ω；`)'
        ZXNotification({
            title: '读取失败',
            message: errorMessage,
            type: '😭',
            position: 'top-right'
        })
    }
}

// 新建文件/文件夹
const handleNew = async () => {
    if (!newItemName.value.trim()) {
        ZXNotification({
            title: '提示',
            message: '名称不能为空哦～',
            type: 'info',
            position: 'top-right'
        })
        return
    }

    try {
        const res = newItemType.value === 'file'
            ? await fileApi.createFile(currentPath.value || undefined, newItemName.value)
            : await fileApi.createFolder(currentPath.value || undefined, newItemName.value)

        if (res?.success) {
            ZXNotification({
                title: '新建成功～',
                message: `${newItemType.value === 'file' ? '文件' : '文件夹'} "${newItemName.value}" 创建成功啦！`,
                type: '🎉',
                position: 'top-right',
                confetti: true
            })
            showNewDialog.value = false
            newItemName.value = ''
            loadFileList(currentPath.value)
        }
    } catch (error) {
        ZXNotification({
            title: '创建失败',
            message: '创建失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    }
}

// 路径面包屑 - 直接使用后端返回的 path_segments
const pathSegmentsDisplay = computed(() => {
    return pathSegments.value
})

// 搜索过滤后的文件列表
const filteredFileList = computed(() => {
    if (!searchQuery.value.trim()) return fileList.value
    const query = searchQuery.value.toLowerCase().trim()
    return fileList.value.filter(file =>
        file.name.toLowerCase().includes(query)
    )
})

// 排序后的文件列表（文件夹在前，文件在后，按名称字母排序）
const sortedFileList = computed(() => {
    return [...filteredFileList.value].sort((a, b) => {
        // 文件夹优先
        if (!a.is_file && b.is_file) return -1
        if (a.is_file && !b.is_file) return 1
        // 同类别按名称字母排序
        return a.name.localeCompare(b.name, 'zh-CN')
    })
})

// 获取文件图标样式
const getFileIconStyle = (file: FileItem) => {
    if (!file.is_file) {
        return { bg: 'bg-blue-100', text: 'text-blue-600' }
    }
    if (!file.is_image) {
        return { bg: 'bg-gray-100', text: 'text-gray-600' }
    }
    // 根据图片类型返回不同颜色
    const ext = file.name.split('.').pop()?.toLowerCase()
    const colorMap: Record<string, { bg: string; text: string }> = {
        'jpg': { bg: 'bg-orange-100', text: 'text-orange-600' },
        'jpeg': { bg: 'bg-orange-100', text: 'text-orange-600' },
        'png': { bg: 'bg-pink-100', text: 'text-pink-600' },
        'gif': { bg: 'bg-purple-100', text: 'text-purple-600' },
        'svg': { bg: 'bg-indigo-100', text: 'text-indigo-600' },
        'webp': { bg: 'bg-teal-100', text: 'text-teal-600' },
        'bmp': { bg: 'bg-rose-100', text: 'text-rose-600' },
        'ico': { bg: 'bg-amber-100', text: 'text-amber-600' },
    }
    return colorMap[ext || ''] || { bg: 'bg-pink-100', text: 'text-pink-600' }
}

// 打开重命名对话框
const openRenameDialog = (file: FileItem) => {
    renamingFile.value = file
    newName.value = file.name
    showRenameDialog.value = true
}

// 执行重命名
const handleRename = async () => {
    if (!newName.value.trim() || !renamingFile.value) {
        ZXNotification({
            title: '提示',
            message: '名称不能为空哦～',
            type: 'info',
            position: 'top-right'
        })
        return
    }

    if (newName.value === renamingFile.value.name) {
        showRenameDialog.value = false
        return
    }

    try {
        const fullPath = renamingFile.value.path || (currentPath.value ? `${currentPath.value}/${renamingFile.value.name}` : renamingFile.value.name)
        const res = await fileApi.rename(fullPath, newName.value)

        if (res?.success) {
            ZXNotification({
                title: '重命名成功～',
                message: `"${renamingFile.value.name}" 已成功重命名为 "${newName.value}" 啦！`,
                type: '🎉',
                position: 'top-right'
            })
            showRenameDialog.value = false
            renamingFile.value = null
            newName.value = ''
            loadFileList(currentPath.value)
        }
    } catch (error) {
        ZXNotification({
            title: '重命名失败',
            message: '重命名操作失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    }
}

// 键盘快捷键
const handleKeyDown = (e: KeyboardEvent) => {
    if (!showImagePreview.value) return

    switch (e.key) {
        case 'Escape':
            showImagePreview.value = false
            break
        case '+':
        case '=':
            zoomIn()
            break
        case '-':
            zoomOut()
            break
        case '0':
            resetZoom()
            break
        case 'ArrowLeft':
            if (e.shiftKey) rotateLeft()
            break
        case 'ArrowRight':
            if (e.shiftKey) rotateRight()
            break
    }
}

onMounted(() => {
    loadFileList()
    window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
    <div class="w-full h-full flex flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题 -->
        <div class="flex items-center justify-between bg-white rounded-2xl shadow-sm p-4 outline-1 outline-slate-200">
            <div class="flex items-center space-x-3">
                <Folder class="h-6 w-6 text-blue-500 flex-shrink-0" />
                <h2 class="text-lg font-semibold text-gray-800">文件管理</h2>
            </div>
            <div class="flex items-center space-x-2">
                <button
                    @click="showNewDialog = true"
                    class="px-4 py-2 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors flex items-center space-x-2 btn-touch"
                >
                    <Plus class="w-4 h-4" />
                    <span class="hidden sm:inline">新建</span>
                </button>
            </div>
        </div>

        <!-- 路径导航 -->
        <div class="bg-white rounded-2xl shadow-sm p-3 sm:p-4 outline-1 outline-slate-200">
            <div class="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <button
                    @click="goBack"
                    :disabled="!currentPath"
                    class="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500 disabled:opacity-30 btn-touch flex-shrink-0"
                >
                    <ArrowLeft class="w-4 h-4" />
                </button>
                <button
                    @click="goHome"
                    class="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500 btn-touch flex-shrink-0"
                >
                    <Home class="w-4 h-4" />
                </button>
                <!-- 面包屑导航 - 可滚动 -->
                <div class="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                    <template v-for="(segment, index) in pathSegmentsDisplay" :key="index">
                        <ChevronRight class="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <button
                            @click="loadFileList(pathSegmentsDisplay.slice(0, index + 1).join('/'))"
                            class="px-2 py-1 hover:bg-gray-100 rounded-2xl transition-colors text-blue-600 truncate flex-shrink-0 max-w-[120px]"
                        >
                            {{ segment }}
                        </button>
                    </template>
                </div>
                <!-- 搜索栏 -->
                <div class="relative flex-shrink-0">
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="搜索..."
                        class="w-32 sm:w-48 px-3 py-1.5 pl-9 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <Search class="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
            </div>
        </div>

        <!-- 文件列表 -->
        <div class="flex-1 bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 overflow-hidden">
            <div v-if="loading" class="flex items-center justify-center h-full">
                <div class="text-center text-gray-400">
                    <Folder class="w-12 h-12 mx-auto mb-4 animate-pulse" />
                    <p>加载中...</p>
                </div>
            </div>

            <div v-else-if="fileList.length === 0" class="flex items-center justify-center h-full">
                <div class="text-center text-gray-400">
                    <Folder class="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>此文件夹为空</p>
                </div>
            </div>

            <div v-else class="h-full overflow-y-auto overflow-x-hidden">
                <!-- 桌面端表格视图 -->
                <table class="w-full hidden sm:table">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                                名称
                            </th>
                            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                                大小
                            </th>
                            <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                                修改时间
                            </th>
                            <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr
                            v-for="file in sortedFileList"
                            :key="file.name"
                            class="hover:bg-gray-50 transition-colors"
                        >
                            <td class="px-4 py-3">
                                <div
                                    @click="file.is_file ? openEditor(file) : enterFolder(file)"
                                    class="flex items-center space-x-3 cursor-pointer"
                                >
                                    <div
                                        :class="[
                                            getFileIconStyle(file).bg,
                                            getFileIconStyle(file).text
                                        ]"
                                        class="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0"
                                    >
                                        <Folder v-if="!file.is_file" class="w-5 h-5" />
                                        <ImageIcon v-else-if="file.is_image" class="w-5 h-5" />
                                        <FileText v-else class="w-5 h-5" />
                                    </div>
                                    <span class="text-sm text-gray-700 truncate">{{ file.name }}</span>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-500">
                                {{ file.size_formatted || formatFileSize(file.size, file.is_file) }}
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                                {{ file.mtime_formatted || formatTime(file.mtime) }}
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex items-center justify-end space-x-2">
                                    <button
                                        v-if="file.is_file"
                                        @click.stop="openRenameDialog(file)"
                                        class="p-1.5 hover:bg-blue-50 rounded-2xl transition-colors text-blue-600 btn-touch"
                                        title="重命名"
                                    >
                                        <Edit2 class="w-4 h-4" />
                                    </button>
                                    <button
                                        @click.stop="handleDelete(file)"
                                        class="p-1.5 hover:bg-red-50 rounded-2xl transition-colors text-red-600 btn-touch"
                                        title="删除"
                                    >
                                        <Trash2 class="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- 移动端列表视图 -->
                <div class="sm:hidden divide-y divide-gray-100">
                    <div
                        v-for="file in sortedFileList"
                        :key="file.name"
                        class="p-3 hover:bg-gray-50 transition-colors"
                    >
                        <div
                            @click="file.is_file ? openEditor(file) : enterFolder(file)"
                            class="flex items-start space-x-3"
                        >
                            <div
                                :class="[
                                    getFileIconStyle(file).bg,
                                    getFileIconStyle(file).text
                                ]"
                                class="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                            >
                                <Folder v-if="!file.is_file" class="w-6 h-6" />
                                <ImageIcon v-else-if="file.is_image" class="w-6 h-6" />
                                <FileText v-else class="w-6 h-6" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-medium text-gray-700 truncate">{{ file.name }}</div>
                                <div class="text-xs text-gray-500 mt-1">
                                    {{ file.size_formatted || formatFileSize(file.size, file.is_file) }}
                                    <span v-if="file.mtime_formatted" class="mx-1">·</span>
                                    {{ file.mtime_formatted || formatTime(file.mtime) }}
                                </div>
                            </div>
                            <div class="flex items-center space-x-1 flex-shrink-0">
                                <button
                                    v-if="file.is_file"
                                    @click.stop="openRenameDialog(file)"
                                    class="p-2 hover:bg-blue-50 rounded-2xl transition-colors text-blue-600 btn-touch"
                                    title="重命名"
                                >
                                    <Edit2 class="w-4 h-4" />
                                </button>
                                <button
                                    @click.stop="handleDelete(file)"
                                    class="p-2 hover:bg-red-50 rounded-2xl transition-colors text-red-600 btn-touch"
                                    title="删除"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- 无搜索结果提示 -->
                <div v-if="searchQuery && sortedFileList.length === 0" class="flex items-center justify-center h-full">
                    <div class="text-center text-gray-400">
                        <Search class="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>未找到匹配的文件</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 新建文件/文件夹对话框 -->
        <Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">
            <div
                v-if="showNewDialog"
                class="fixed inset-0 glass-overlay flex items-center justify-center z-50 p-4"
                @click="showNewDialog = false"
            >
                <div
                    class="modal-content bg-white rounded-2xl p-4 sm:p-6 w-full max-w-sm shadow-xl"
                    @click.stop
                >
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">新建{{ newItemType === 'file' ? '文件' : '文件夹' }}</h3>

                    <!-- 类型选择 -->
                    <div class="flex space-x-4 mb-4">
                        <button
                            @click="newItemType = 'file'"
                            :class="newItemType === 'file' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'"
                            class="flex-1 px-4 py-2 rounded-2xl text-sm font-medium transition-colors"
                        >
                            文件
                        </button>
                        <button
                            @click="newItemType = 'folder'"
                            :class="newItemType === 'folder' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'"
                            class="flex-1 px-4 py-2 rounded-2xl text-sm font-medium transition-colors"
                        >
                            文件夹
                        </button>
                    </div>

                    <!-- 名称输入 -->
                    <input
                        v-model="newItemName"
                        type="text"
                        placeholder="请输入名称"
                        class="w-full px-4 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                        @keyup.enter="handleNew"
                    />

                    <!-- 按钮 -->
                    <div class="flex space-x-3">
                        <button
                            @click="showNewDialog = false"
                            class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-2xl text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            @click="handleNew"
                            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                            确定
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- 重命名文件对话框 -->
        <Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">
            <div
                v-if="showRenameDialog"
                class="fixed inset-0 glass-overlay flex items-center justify-center z-50 p-4"
                @click="showRenameDialog = false"
            >
                <div
                    class="modal-content bg-white rounded-2xl p-4 sm:p-6 w-full max-w-sm shadow-xl"
                    @click.stop
                >
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">重命名文件</h3>

                    <!-- 名称输入 -->
                    <input
                        v-model="newName"
                        type="text"
                        placeholder="请输入新名称"
                        class="w-full px-4 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                        @keyup.enter="handleRename"
                    />

                    <!-- 按钮 -->
                    <div class="flex space-x-3">
                        <button
                            @click="showRenameDialog = false"
                            class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-2xl text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            @click="handleRename"
                            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                            确定
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- 文件编辑器 -->
        <FileEditorModal
            v-if="showEditor"
            :initial-file="editorInitialFile"
            @close="showEditor = false"
        />

        <!-- 图片预览对话框 -->
        <div
            v-if="showImagePreview"
            class="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
            @click="showImagePreview = false"
        >
            <div
                class="relative w-full h-full p-4 flex flex-col items-center justify-between"
                @click.stop
            >
                <!-- 顶部控制栏 -->
                <div class="flex justify-between items-center w-full mb-4 flex-shrink-0 z-20 bg-black/40 backdrop-blur-sm rounded-2xl p-3">
                    <!-- 图片标题 -->
                    <div class="text-center text-white flex-1">
                        <h3 class="text-base font-semibold truncate max-w-md mx-auto">{{ currentImageName }}</h3>
                        <p class="text-sm text-gray-400 mt-1">缩放：{{ Math.round(imageScale * 100) }}% | 旋转：{{ imageRotation }}°</p>
                    </div>
                    <!-- 关闭按钮 -->
                    <button
                        @click="showImagePreview = false"
                        class="ml-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white flex-shrink-0"
                    >
                        <X class="w-6 h-6" />
                    </button>
                </div>

                <!-- 图片容器 - 使用绝对定位确保不挤压控制栏 -->
                <div class="relative flex-1 w-full flex items-center justify-center min-h-0 z-0 overflow-hidden">
                    <!-- 加载状态 -->
                    <div v-if="imageLoading" class="absolute inset-0 flex items-center justify-center z-10">
                        <div class="text-center text-white">
                            <ImageIcon class="w-16 h-16 mx-auto mb-4 animate-pulse opacity-50" />
                            <p>图片加载中...</p>
                        </div>
                    </div>

                    <!-- 图片 -->
                    <img
                        v-show="!imageLoading"
                        :src="currentImageUrl"
                        :alt="currentImageName"
                        @load="imageLoading = false"
                        :style="{
                            transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                            transition: 'transform 0.3s ease',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            zIndex: 0
                        }"
                        class="block"
                    />
                </div>

                <!-- 底部控制按钮 -->
                <div class="flex items-center gap-3 flex-wrap justify-center mt-4 flex-shrink-0 z-20 bg-black/40 backdrop-blur-sm rounded-2xl p-3">
                    <!-- 缩放控制 -->
                    <div class="flex items-center gap-2 bg-white/10 rounded-2xl p-2">
                        <button
                            @click="zoomOut"
                            class="p-2 hover:bg-white/20 rounded-2xl transition-colors text-white"
                            title="缩小"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                            </svg>
                        </button>
                        <button
                            @click="resetZoom"
                            class="px-3 py-1 text-sm text-white hover:bg-white/20 rounded-2xl transition-colors min-w-[60px]"
                        >
                            {{ Math.round(imageScale * 100) }}%
                        </button>
                        <button
                            @click="zoomIn"
                            class="p-2 hover:bg-white/20 rounded-2xl transition-colors text-white"
                            title="放大"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>

                    <!-- 旋转控制 -->
                    <div class="flex items-center gap-2 bg-white/10 rounded-2xl p-2">
                        <button
                            @click="rotateLeft"
                            class="p-2 hover:bg-white/20 rounded-2xl transition-colors text-white"
                            title="向左旋转"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </button>
                        <button
                            @click="rotateRight"
                            class="p-2 hover:bg-white/20 rounded-2xl transition-colors text-white"
                            title="向右旋转"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a8 8 0 00-8 8v2m12-6l6 6m-6-6l-6-6" />
                            </svg>
                        </button>
                    </div>

                    <!-- 下载按钮 -->
                    <button
                        @click="downloadImage"
                        class="px-4 py-2 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                        <Download class="w-4 h-4" />
                        下载
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
    width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}
</style>
