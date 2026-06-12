<script setup lang="ts">
import {
    Edit2,
    FileText,
    Folder,
    Image as ImageIcon,
    Search,
    Trash2,
} from "lucide-vue-next";
import type { FileItem } from "@/types/api-next.types";

const props = defineProps<{
    files: FileItem[];
    loading: boolean;
    isEmpty: boolean;
    searchQuery: string;
}>();

const emit = defineEmits<{
    open: [file: FileItem];
    "enter-folder": [file: FileItem];
    rename: [file: FileItem];
    delete: [file: FileItem];
}>();

const formatFileSize = (bytes: number | undefined | null, isFile = true) => {
    if (!isFile) return "-";
    if (bytes === undefined || bytes === null) return "--";
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const formatTime = (timestamp: string | number | undefined) => {
    if (timestamp === undefined) return "--";

    const date =
        typeof timestamp === "number"
            ? new Date(timestamp * 1000)
            : new Date(timestamp);

    return date.toLocaleString("zh-CN");
};

const getFileIconStyle = (file: FileItem) => {
    if (!file.is_file) {
        return "text-blue-600";
    }

    if (!file.is_image) {
        return "text-gray-600";
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const colorMap: Record<string, string> = {
        jpg: "text-orange-600",
        jpeg: "text-orange-600",
        png: "text-pink-600",
        gif: "text-purple-600",
        svg: "text-indigo-600",
        webp: "text-teal-600",
        bmp: "text-rose-600",
        ico: "text-amber-600",
    };

    return colorMap[ext || ""] || "text-pink-600";
};

const handleOpen = (file: FileItem) => {
    if (file.is_file) {
        emit("open", file);
        return;
    }

    emit("enter-folder", file);
};
</script>

<template>
    <div
        class="flex-1 overflow-hidden rounded-3xl border-1 border-slate-200 bg-white shadow-sm"
    >
        <div v-if="loading" class="flex h-full items-center justify-center">
            <div class="text-center text-gray-400">
                <Folder class="mx-auto mb-4 h-12 w-12 animate-pulse" />
                <p>加载中...</p>
            </div>
        </div>

        <div
            v-else-if="isEmpty"
            class="flex h-full items-center justify-center"
        >
            <div class="text-center text-gray-400">
                <Folder class="mx-auto mb-4 h-16 w-16 opacity-50" />
                <p>此文件夹为空</p>
            </div>
        </div>

        <div v-else class="h-full overflow-x-hidden overflow-y-auto px-4">
            <table class="hidden w-full sm:table">
                <thead class="sticky top-0 border-b-1 border-gray-200 bg-white">
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
                        v-for="file in files"
                        :key="file.name"
                        class="transition-colors hover:bg-gray-50"
                    >
                        <td class="px-4 py-2">
                            <div
                                class="ml-2 flex cursor-pointer items-center space-x-3"
                                @click="handleOpen(file)"
                            >
                                <div
                                    :class="getFileIconStyle(file)"
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
                                <span class="truncate text-sm text-gray-700">
                                    {{ file.name }}
                                </span>
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
                            {{ file.mtime_formatted || formatTime(file.mtime) }}
                        </td>
                        <td class="px-4 py-2">
                            <div
                                class="flex items-center justify-end space-x-2"
                            >
                                <button
                                    v-if="file.is_file"
                                    class="btn-touch cursor-pointer rounded-2xl p-1.5 transition-colors hover:text-blue-600"
                                    title="重命名"
                                    @click.stop="emit('rename', file)"
                                >
                                    <Edit2 class="h-4 w-4" />
                                </button>
                                <button
                                    class="btn-touch cursor-pointer rounded-2xl p-1.5 transition-colors hover:text-red-600"
                                    title="删除"
                                    @click.stop="emit('delete', file)"
                                >
                                    <Trash2 class="h-4 w-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="divide-y divide-gray-100 sm:hidden">
                <div
                    v-for="file in files"
                    :key="file.name"
                    class="p-3 transition-colors hover:bg-gray-50"
                >
                    <div
                        class="flex items-start space-x-3"
                        @click="handleOpen(file)"
                    >
                        <div
                            :class="getFileIconStyle(file)"
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
                                <span v-if="file.mtime_formatted" class="mx-1"
                                    >·</span
                                >
                                {{
                                    file.mtime_formatted ||
                                    formatTime(file.mtime)
                                }}
                            </div>
                        </div>
                        <div class="flex flex-shrink-0 items-center space-x-1">
                            <button
                                v-if="file.is_file"
                                class="btn-touch rounded-2xl p-2 text-blue-600 transition-colors hover:bg-blue-50"
                                title="重命名"
                                @click.stop="emit('rename', file)"
                            >
                                <Edit2 class="h-4 w-4" />
                            </button>
                            <button
                                class="btn-touch rounded-2xl p-2 text-red-600 transition-colors hover:bg-red-50"
                                title="删除"
                                @click.stop="emit('delete', file)"
                            >
                                <Trash2 class="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div
                v-if="searchQuery && files.length === 0"
                class="flex h-full items-center justify-center"
            >
                <div class="text-center text-gray-400">
                    <Search class="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p>未找到匹配的文件</p>
                </div>
            </div>
        </div>
    </div>
</template>
