<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
    ArrowLeft,
    ChevronRight,
    Download,
    Edit2,
    FileText,
    Folder,
    Home,
    Image as ImageIcon,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-vue-next";
import { fileApi } from "@/utils/api-next";
import type { FileItem } from "@/types/api-next.types";
import { ZXMessageBox, ZXNotification } from "@/components";
import FileEditorModal from "@/components/FileEditorModal";
import { useFilesStore } from "@/store/files";
import { storeToRefs } from "pinia";
import { useGlobalStore } from "@/store/global.ts";

const fileStore = useFilesStore();
const globalStore = useGlobalStore();

const { showNewDialog } = storeToRefs(fileStore);

// 当前路径
const currentPath = ref<string>("");
const pathSegments = ref<string[]>([]);

// 文件列表
const fileList = ref<FileItem[]>([]);
const loading = ref(false);

// 搜索
const searchQuery = ref("");

// 文件编辑器
const showEditor = ref(false);
const editorInitialFile = ref<{
    path: string;
    name: string;
    content?: string;
} | null>(null);

// 图片预览
const showImagePreview = ref(false);
const currentImageUrl = ref("");
const currentImageName = ref("");
const imageScale = ref(1);
const imageRotation = ref(0);
const imageLoading = ref(false);

// 新建文件/文件夹对话框

const newItemType = ref<"file" | "folder">("file");
const newItemName = ref("");

// 重命名对话框
const showRenameDialog = ref(false);
const renamingFile = ref<FileItem | null>(null);
const newName = ref("");

// 文件大小格式化（备用）
const formatFileSize = (
    bytes: number | undefined | null,
    isFile: boolean = true,
) => {
    if (!isFile) return "-";
    if (bytes === undefined || bytes === null) return "--";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// 格式化时间（备用）
const formatTime = (timestamp: string | number | undefined) => {
    if (timestamp === undefined) return "--";
    const date =
        typeof timestamp === "number"
            ? new Date(timestamp * 1000)
            : new Date(timestamp);
    return date.toLocaleString("zh-CN");
};

// 图片预览控制
const zoomIn = () => {
    if (imageScale.value < 3) {
        imageScale.value += 0.25;
    }
};

const zoomOut = () => {
    if (imageScale.value > 0.5) {
        imageScale.value -= 0.25;
    }
};

const resetZoom = () => {
    imageScale.value = 1;
};

const rotateLeft = () => {
    imageRotation.value = (imageRotation.value - 90) % 360;
};

const rotateRight = () => {
    imageRotation.value = (imageRotation.value + 90) % 360;
};

const downloadImage = () => {
    if (!currentImageUrl.value) return;
    const link = document.createElement("a");
    link.href = currentImageUrl.value;
    link.download = currentImageName.value;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// 加载文件列表
const loadFileList = async (path: string = "") => {
    loading.value = true;
    try {
        const res = await fileApi.getFileList(path || undefined);
        if (res?.success && res?.data) {
            // 使用后端返回的文件列表
            fileList.value = res.data.files || [];
            // 使用后端返回的面包屑导航
            if (res.data.path_segments) {
                pathSegments.value = res.data.path_segments;
            }
            currentPath.value = res.data.current_path || path;
        }
    } catch (error) {
        ZXNotification({
            title: "呜呼～",
            message: "文件列表加载失败了 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
    } finally {
        loading.value = false;
    }
};

// 进入文件夹
const enterFolder = (folder: FileItem) => {
    if (!folder.is_file) {
        const newPath =
            folder.path ||
            (currentPath.value
                ? `${currentPath.value}/${folder.name}`
                : folder.name);
        loadFileList(newPath);
    }
};

// 返回上级
const goBack = () => {
    if (pathSegments.value.length > 0) {
        // 使用后端返回的面包屑导航，返回上一级
        const parentSegments = pathSegments.value.slice(0, -1);
        loadFileList(parentSegments.join("/"));
    } else if (currentPath.value) {
        // 返回根目录
        loadFileList("");
    }
};

// 返回首页
const goHome = () => {
    loadFileList("");
};

// 删除文件/文件夹
const handleDelete = async (file: FileItem) => {
    ZXMessageBox({
        title: file.is_file ? "删除文件" : "删除文件夹",
        message: `确定要删除 "${file.name}" 吗？此操作不可恢复！`,
        cancelButtonText: "取消",
        confirmButtonText: "删除",
        type: "error",
        onConfirm: async () => {
            try {
                const fullPath =
                    file.path ||
                    (currentPath.value
                        ? `${currentPath.value}/${file.name}`
                        : file.name);
                const res = file.is_file
                    ? await fileApi.deleteFile(fullPath)
                    : await fileApi.deleteFolder(fullPath);

                if (res?.success) {
                    ZXNotification({
                        title: "删除成功～",
                        message: `"${file.name}" 已经删除成功啦！`,
                        type: "👋",
                        position: "top-right",
                    });
                    loadFileList(currentPath.value);
                }
            } catch (error) {
                ZXNotification({
                    title: "删除失败",
                    message: "删除操作失败了 (´；ω；`)",
                    type: "😭",
                    position: "top-right",
                });
            }
        },
    });
};

// 打开文件编辑器
const openEditor = async (file: FileItem) => {
    if (!file.is_file) return;

    // 如果是图片，显示预览
    if (file.is_image) {
        imageLoading.value = true;
        try {
            const filePath =
                file.path ||
                (currentPath.value
                    ? `${currentPath.value}/${file.name}`
                    : file.name);
            // 以图片方式读取，获取 base64 数据
            const res = await fileApi.readFile(filePath, {
                skipInterceptor: true,
                as_image: true,
            });
            if (res?.success && res?.data) {
                currentImageUrl.value = res.data.content || "";
                currentImageName.value = file.name;
                imageScale.value = 1;
                imageRotation.value = 0;
                showImagePreview.value = true;
            }
        } catch (error) {
            ZXNotification({
                title: "加载失败",
                message: "图片加载失败了 (´；ω；`)",
                type: "😭",
                position: "top-right",
            });
        } finally {
            imageLoading.value = false;
        }
        return;
    }

    // 文本文件，先尝试读取内容，成功后再打开编辑器
    const fullPath =
        file.path ||
        (currentPath.value ? `${currentPath.value}/${file.name}` : file.name);
    try {
        // 使用 skipInterceptor 跳过拦截器的自动错误处理，由本组件自行处理错误
        const res = await fileApi.readFile(fullPath, { skipInterceptor: true });
        if (res?.success && res?.data) {
            // 读取成功，打开编辑器
            editorInitialFile.value = {
                path: fullPath,
                name: file.name,
                content: res.data.content,
            };
            showEditor.value = true;
        }
    } catch (error) {
        // 读取失败，不打开编辑器，仅显示错误通知
        const errorMessage =
            (error as any)?.response?.data?.message ||
            "文件读取失败了 (´；ω；`)";
        ZXNotification({
            title: "读取失败",
            message: errorMessage,
            type: "😭",
            position: "top-right",
        });
    }
};

// 新建文件/文件夹
const handleNew = async () => {
    if (!newItemName.value.trim()) {
        ZXNotification({
            title: "提示",
            message: "名称不能为空哦～",
            type: "info",
            position: "top-right",
        });
        return;
    }

    try {
        const res =
            newItemType.value === "file"
                ? await fileApi.createFile(
                      currentPath.value || undefined,
                      newItemName.value,
                  )
                : await fileApi.createFolder(
                      currentPath.value || undefined,
                      newItemName.value,
                  );

        if (res?.success) {
            ZXNotification({
                title: "新建成功～",
                message: `${newItemType.value === "file" ? "文件" : "文件夹"} "${newItemName.value}" 创建成功啦！`,
                type: "🎉",
                position: "top-right",
                confetti: true,
            });
            showNewDialog.value = false;
            newItemName.value = "";
            loadFileList(currentPath.value);
        }
    } catch (error) {
        ZXNotification({
            title: "创建失败",
            message: "创建失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

// 路径面包屑 - 直接使用后端返回的 path_segments
const pathSegmentsDisplay = computed(() => {
    return pathSegments.value;
});

// 搜索过滤后的文件列表
const filteredFileList = computed(() => {
    if (!searchQuery.value.trim()) return fileList.value;
    const query = searchQuery.value.toLowerCase().trim();
    return fileList.value.filter((file) =>
        file.name.toLowerCase().includes(query),
    );
});

// 排序后的文件列表（文件夹在前，文件在后，按名称字母排序）
const sortedFileList = computed(() => {
    return [...filteredFileList.value].sort((a, b) => {
        // 文件夹优先
        if (!a.is_file && b.is_file) return -1;
        if (a.is_file && !b.is_file) return 1;
        // 同类别按名称字母排序
        return a.name.localeCompare(b.name, "zh-CN");
    });
});

// 获取文件图标样式
const getFileIconStyle = (file: FileItem) => {
    if (!file.is_file) {
        return { bg: "bg-blue-100", text: "text-blue-600" };
    }
    if (!file.is_image) {
        return { bg: "bg-gray-100", text: "text-gray-600" };
    }
    // 根据图片类型返回不同颜色
    const ext = file.name.split(".").pop()?.toLowerCase();
    const colorMap: Record<string, { bg: string; text: string }> = {
        jpg: { bg: "bg-orange-100", text: "text-orange-600" },
        jpeg: { bg: "bg-orange-100", text: "text-orange-600" },
        png: { bg: "bg-pink-100", text: "text-pink-600" },
        gif: { bg: "bg-purple-100", text: "text-purple-600" },
        svg: { bg: "bg-indigo-100", text: "text-indigo-600" },
        webp: { bg: "bg-teal-100", text: "text-teal-600" },
        bmp: { bg: "bg-rose-100", text: "text-rose-600" },
        ico: { bg: "bg-amber-100", text: "text-amber-600" },
    };
    return colorMap[ext || ""] || { bg: "bg-pink-100", text: "text-pink-600" };
};

// 打开重命名对话框
const openRenameDialog = (file: FileItem) => {
    renamingFile.value = file;
    newName.value = file.name;
    showRenameDialog.value = true;
};

// 执行重命名
const handleRename = async () => {
    if (!newName.value.trim() || !renamingFile.value) {
        ZXNotification({
            title: "提示",
            message: "名称不能为空哦～",
            type: "info",
            position: "top-right",
        });
        return;
    }

    if (newName.value === renamingFile.value.name) {
        showRenameDialog.value = false;
        return;
    }

    try {
        const fullPath =
            renamingFile.value.path ||
            (currentPath.value
                ? `${currentPath.value}/${renamingFile.value.name}`
                : renamingFile.value.name);
        const res = await fileApi.rename(fullPath, newName.value);

        if (res?.success) {
            ZXNotification({
                title: "重命名成功～",
                message: `"${renamingFile.value.name}" 已成功重命名为 "${newName.value}" 啦！`,
                type: "🎉",
                position: "top-right",
            });
            showRenameDialog.value = false;
            renamingFile.value = null;
            newName.value = "";
            loadFileList(currentPath.value);
        }
    } catch (error) {
        ZXNotification({
            title: "重命名失败",
            message: "重命名操作失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

// 键盘快捷键
const handleKeyDown = (e: KeyboardEvent) => {
    if (!showImagePreview.value) return;

    switch (e.key) {
        case "Escape":
            showImagePreview.value = false;
            break;
        case "+":
        case "=":
            zoomIn();
            break;
        case "-":
            zoomOut();
            break;
        case "0":
            resetZoom();
            break;
        case "ArrowLeft":
            if (e.shiftKey) rotateLeft();
            break;
        case "ArrowRight":
            if (e.shiftKey) rotateRight();
            break;
    }
};

onMounted(() => {
    loadFileList();
    window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
    <div class="flex h-full w-full flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题 -->
        <div
            class="flex items-center justify-between rounded-2xl border-1 border-slate-200 bg-white p-4 shadow-sm"
            v-if="!globalStore.isDesktopMode"
        >
            <div class="flex items-center space-x-3">
                <Folder class="h-6 w-6 flex-shrink-0 text-blue-500" />
                <h2 class="text-lg font-semibold text-gray-800">文件管理</h2>
            </div>
            <div class="flex items-center space-x-2">
                <button
                    @click="showNewDialog = true"
                    class="btn-touch flex items-center space-x-2 rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                >
                    <Plus class="h-4 w-4" />
                    <span class="hidden sm:inline">新建</span>
                </button>
            </div>
        </div>

        <!-- 路径导航 -->
        <div
            class="rounded-3xl border-1 border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        >
            <div class="scrollbar-hide flex items-center gap-2 overflow-x-auto">
                <button
                    @click="goBack"
                    :disabled="!currentPath"
                    class="btn-touch flex-shrink-0 cursor-pointer rounded-2xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30"
                >
                    <ArrowLeft class="h-4 w-4" />
                </button>
                <button
                    @click="goHome"
                    class="btn-touch flex-shrink-0 cursor-pointer rounded-2xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
                >
                    <Home class="h-4 w-4" />
                </button>
                <!-- 面包屑导航 - 可滚动 -->
                <div
                    class="scrollbar-hide flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm"
                >
                    <template
                        v-for="(segment, index) in pathSegmentsDisplay"
                        :key="index"
                    >
                        <ChevronRight
                            class="h-4 w-4 flex-shrink-0 text-gray-400"
                        />
                        <button
                            @click="
                                loadFileList(
                                    pathSegmentsDisplay
                                        .slice(0, index + 1)
                                        .join('/'),
                                )
                            "
                            class="max-w-[120px] flex-shrink-0 truncate rounded-2xl px-2 py-1 text-blue-600 transition-colors hover:bg-gray-100"
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
                        class="w-32 rounded-2xl border border-gray-200 px-3 py-1.5 pl-9 text-sm transition-colors focus:outline-none sm:w-48"
                    />
                    <Search
                        class="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
                    />
                </div>
            </div>
        </div>

        <!-- 文件列表 -->
        <div
            class="flex-1 overflow-hidden rounded-4xl border-1 border-slate-200 bg-white shadow-sm"
        >
            <div v-if="loading" class="flex h-full items-center justify-center">
                <div class="text-center text-gray-400">
                    <Folder class="mx-auto mb-4 h-12 w-12 animate-pulse" />
                    <p>加载中...</p>
                </div>
            </div>

            <div
                v-else-if="fileList.length === 0"
                class="flex h-full items-center justify-center"
            >
                <div class="text-center text-gray-400">
                    <Folder class="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p>此文件夹为空</p>
                </div>
            </div>

            <div v-else class="h-full overflow-x-hidden overflow-y-auto px-4">
                <!-- 桌面端表格视图 -->
                <table class="hidden w-full sm:table">
                    <thead
                        class="sticky top-0 border-b-1 border-gray-200 bg-white"
                    >
                        <tr>
                            <th
                                class="px-6 pt-6 pb-4 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                            >
                                名称
                            </th>
                            <th
                                class="px-6 pt-6 pb-4 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                            >
                                大小
                            </th>
                            <th
                                class="hidden px-6 pt-6 pb-4 text-left text-xs font-medium tracking-wider text-gray-500 uppercase md:table-cell"
                            >
                                修改时间
                            </th>
                            <th
                                class="px-6 pt-6 pb-4 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
                            >
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr
                            v-for="file in sortedFileList"
                            :key="file.name"
                            class="transition-colors hover:bg-gray-50"
                        >
                            <td class="px-4 py-2">
                                <div
                                    @click="
                                        file.is_file
                                            ? openEditor(file)
                                            : enterFolder(file)
                                    "
                                    class="ml-2 flex cursor-pointer items-center space-x-3"
                                >
                                    <div
                                        :class="[getFileIconStyle(file).text]"
                                        class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl"
                                    >
                                        <Folder
                                            v-if="!file.is_file"
                                            class="h-5 w-5"
                                        />
                                        <ImageIcon
                                            v-else-if="file.is_image"
                                            class="h-5 w-5"
                                        />
                                        <FileText v-else class="h-5 w-5" />
                                    </div>
                                    <span
                                        class="truncate text-sm text-gray-700"
                                        >{{ file.name }}</span
                                    >
                                </div>
                            </td>
                            <td class="px-4 py-2 text-sm text-gray-500">
                                {{
                                    file.size_formatted ||
                                    formatFileSize(file.size, file.is_file)
                                }}
                            </td>
                            <td
                                class="hidden px-4 py-2 text-sm text-gray-500 md:table-cell"
                            >
                                {{
                                    file.mtime_formatted ||
                                    formatTime(file.mtime)
                                }}
                            </td>
                            <td class="px-4 py-2">
                                <div
                                    class="flex items-center justify-end space-x-2"
                                >
                                    <button
                                        v-if="file.is_file"
                                        @click.stop="openRenameDialog(file)"
                                        class="btn-touch cursor-pointer rounded-2xl p-1.5 transition-colors hover:text-blue-600"
                                        title="重命名"
                                    >
                                        <Edit2 class="h-4 w-4" />
                                    </button>
                                    <button
                                        @click.stop="handleDelete(file)"
                                        class="btn-touch cursor-pointer rounded-2xl p-1.5 transition-colors hover:text-red-600"
                                        title="删除"
                                    >
                                        <Trash2 class="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- 移动端列表视图 -->
                <div class="divide-y divide-gray-100 sm:hidden">
                    <div
                        v-for="file in sortedFileList"
                        :key="file.name"
                        class="p-3 transition-colors hover:bg-gray-50"
                    >
                        <div
                            @click="
                                file.is_file
                                    ? openEditor(file)
                                    : enterFolder(file)
                            "
                            class="flex items-start space-x-3"
                        >
                            <div
                                :class="[getFileIconStyle(file).text]"
                                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
                            >
                                <Folder v-if="!file.is_file" class="h-6 w-6" />
                                <ImageIcon
                                    v-else-if="file.is_image"
                                    class="h-6 w-6"
                                />
                                <FileText v-else class="h-6 w-6" />
                            </div>
                            <div class="min-w-0 flex-1">
                                <div
                                    class="truncate text-sm font-medium text-gray-700"
                                >
                                    {{ file.name }}
                                </div>
                                <div class="mt-1 text-xs text-gray-500">
                                    {{
                                        file.size_formatted ||
                                        formatFileSize(file.size, file.is_file)
                                    }}
                                    <span
                                        v-if="file.mtime_formatted"
                                        class="mx-1"
                                        >·</span
                                    >
                                    {{
                                        file.mtime_formatted ||
                                        formatTime(file.mtime)
                                    }}
                                </div>
                            </div>
                            <div
                                class="flex flex-shrink-0 items-center space-x-1"
                            >
                                <button
                                    v-if="file.is_file"
                                    @click.stop="openRenameDialog(file)"
                                    class="btn-touch rounded-2xl p-2 text-blue-600 transition-colors hover:bg-blue-50"
                                    title="重命名"
                                >
                                    <Edit2 class="h-4 w-4" />
                                </button>
                                <button
                                    @click.stop="handleDelete(file)"
                                    class="btn-touch rounded-2xl p-2 text-red-600 transition-colors hover:bg-red-50"
                                    title="删除"
                                >
                                    <Trash2 class="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- 无搜索结果提示 -->
                <div
                    v-if="searchQuery && sortedFileList.length === 0"
                    class="flex h-full items-center justify-center"
                >
                    <div class="text-center text-gray-400">
                        <Search class="mx-auto mb-4 h-16 w-16 opacity-50" />
                        <p>未找到匹配的文件</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 新建文件/文件夹对话框 -->
        <Transition name="modal-jelly" :duration="{ enter: 400, leave: 250 }">
            <div
                v-if="showNewDialog"
                class="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
                @click="showNewDialog = false"
            >
                <div
                    class="modal-content w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl sm:p-6"
                    @click.stop
                >
                    <h3 class="mb-4 text-lg font-semibold text-gray-800">
                        新建{{ newItemType === "file" ? "文件" : "文件夹" }}
                    </h3>

                    <!-- 类型选择 -->
                    <div class="mb-4 flex space-x-4">
                        <button
                            @click="newItemType = 'file'"
                            :class="
                                newItemType === 'file'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                            "
                            class="flex-1 cursor-pointer rounded-2xl px-4 py-2 text-sm font-medium transition-colors"
                        >
                            文件
                        </button>
                        <button
                            @click="newItemType = 'folder'"
                            :class="
                                newItemType === 'folder'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                            "
                            class="flex-1 cursor-pointer rounded-2xl px-4 py-2 text-sm font-medium transition-colors"
                        >
                            文件夹
                        </button>
                    </div>

                    <!-- 名称输入 -->
                    <input
                        v-model="newItemName"
                        type="text"
                        placeholder="请输入名称"
                        class="mb-4 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:outline-none"
                        @keyup.enter="handleNew"
                    />

                    <!-- 按钮 -->
                    <div class="flex space-x-3">
                        <button
                            @click="showNewDialog = false"
                            class="flex-1 cursor-pointer rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                        >
                            取消
                        </button>
                        <button
                            @click="handleNew"
                            class="flex-1 cursor-pointer rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
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
                class="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
                @click="showRenameDialog = false"
            >
                <div
                    class="modal-content w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl sm:p-6"
                    @click.stop
                >
                    <h3 class="mb-4 text-lg font-semibold text-gray-800">
                        重命名文件
                    </h3>

                    <!-- 名称输入 -->
                    <input
                        v-model="newName"
                        type="text"
                        placeholder="请输入新名称"
                        class="mb-4 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-none focus:ring-2 focus:ring-blue-500"
                        @keyup.enter="handleRename"
                    />

                    <!-- 按钮 -->
                    <div class="flex space-x-3">
                        <button
                            @click="showRenameDialog = false"
                            class="flex-1 rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                        >
                            取消
                        </button>
                        <button
                            @click="handleRename"
                            class="flex-1 rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
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
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            @click="showImagePreview = false"
        >
            <div
                class="relative flex h-full w-full flex-col items-center justify-between p-4"
                @click.stop
            >
                <!-- 顶部控制栏 -->
                <div
                    class="z-20 mb-4 flex w-full flex-shrink-0 items-center justify-between rounded-2xl bg-black/40 p-3 backdrop-blur-sm"
                >
                    <!-- 图片标题 -->
                    <div class="flex-1 text-center text-white">
                        <h3
                            class="mx-auto max-w-md truncate text-base font-semibold"
                        >
                            {{ currentImageName }}
                        </h3>
                        <p class="mt-1 text-sm text-gray-400">
                            缩放：{{ Math.round(imageScale * 100) }}% | 旋转：{{
                                imageRotation
                            }}°
                        </p>
                    </div>
                    <!-- 关闭按钮 -->
                    <button
                        @click="showImagePreview = false"
                        class="ml-4 flex-shrink-0 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
                    >
                        <X class="h-6 w-6" />
                    </button>
                </div>

                <!-- 图片容器 - 使用绝对定位确保不挤压控制栏 -->
                <div
                    class="relative z-0 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
                >
                    <!-- 加载状态 -->
                    <div
                        v-if="imageLoading"
                        class="absolute inset-0 z-10 flex items-center justify-center"
                    >
                        <div class="text-center text-white">
                            <ImageIcon
                                class="mx-auto mb-4 h-16 w-16 animate-pulse opacity-50"
                            />
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
                            zIndex: 0,
                        }"
                        class="block"
                    />
                </div>

                <!-- 底部控制按钮 -->
                <div
                    class="z-20 mt-4 flex flex-shrink-0 flex-wrap items-center justify-center gap-3 rounded-2xl bg-black/40 p-3 backdrop-blur-sm"
                >
                    <!-- 缩放控制 -->
                    <div
                        class="flex items-center gap-2 rounded-2xl bg-white/10 p-2"
                    >
                        <button
                            @click="zoomOut"
                            class="rounded-2xl p-2 text-white transition-colors hover:bg-white/20"
                            title="缩小"
                        >
                            <svg
                                class="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M20 12H4"
                                />
                            </svg>
                        </button>
                        <button
                            @click="resetZoom"
                            class="min-w-[60px] rounded-2xl px-3 py-1 text-sm text-white transition-colors hover:bg-white/20"
                        >
                            {{ Math.round(imageScale * 100) }}%
                        </button>
                        <button
                            @click="zoomIn"
                            class="rounded-2xl p-2 text-white transition-colors hover:bg-white/20"
                            title="放大"
                        >
                            <svg
                                class="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                        </button>
                    </div>

                    <!-- 旋转控制 -->
                    <div
                        class="flex items-center gap-2 rounded-2xl bg-white/10 p-2"
                    >
                        <button
                            @click="rotateLeft"
                            class="rounded-2xl p-2 text-white transition-colors hover:bg-white/20"
                            title="向左旋转"
                        >
                            <svg
                                class="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                />
                            </svg>
                        </button>
                        <button
                            @click="rotateRight"
                            class="rounded-2xl p-2 text-white transition-colors hover:bg-white/20"
                            title="向右旋转"
                        >
                            <svg
                                class="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M21 10H11a8 8 0 00-8 8v2m12-6l6 6m-6-6l-6-6"
                                />
                            </svg>
                        </button>
                    </div>

                    <!-- 下载按钮 -->
                    <button
                        @click="downloadImage"
                        class="flex items-center gap-2 rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                    >
                        <Download class="h-4 w-4" />
                        下载
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
