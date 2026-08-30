<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { Folder, Plus } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { fileApi } from "@/utils/api-next";
import type { FileItem } from "@/types/api-next.types";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { useFilesStore } from "@/store/files";
import { useGlobalStore } from "@/store/global.ts";
import FileBreadcrumbBar from "./FileBreadcrumbBar.vue";
import FileListPanel from "./FileListPanel.vue";
import ImagePreviewModal from "./ImagePreviewModal.vue";
import NewItemDialog from "./NewItemDialog.vue";
import RenameDialog from "./RenameDialog.vue";

const FileEditorModal = defineAsyncComponent(
    () => import("@/components/FileEditorModal"),
);

const fileStore = useFilesStore();
const globalStore = useGlobalStore();

const { showNewDialog } = storeToRefs(fileStore);

const currentPath = ref("");
const pathSegments = ref<string[]>([]);
const fileList = ref<FileItem[]>([]);
const loading = ref(false);
const searchQuery = ref("");

const showEditor = ref(false);
const editorInitialFile = ref<{
    path: string;
    name: string;
    content?: string;
} | null>(null);

const showImagePreview = ref(false);
const currentImageUrl = ref("");
const currentImageName = ref("");
const imageLoading = ref(false);

const newItemType = ref<"file" | "folder">("file");
const newItemName = ref("");

const showRenameDialog = ref(false);
const renamingFile = ref<FileItem | null>(null);
const newName = ref("");

const resolveFilePath = (file: FileItem) =>
    file.path ||
    (currentPath.value ? `${currentPath.value}/${file.name}` : file.name);

const loadFileList = async (path = "") => {
    loading.value = true;

    try {
        const res = await fileApi.getFileList(path || undefined);

        if (res?.success && res?.data) {
            fileList.value = res.data.files || [];
            pathSegments.value = res.data.path_segments || [];
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

const enterFolder = (folder: FileItem) => {
    if (!folder.is_file) {
        loadFileList(resolveFilePath(folder));
    }
};

const goBack = () => {
    if (pathSegments.value.length > 0) {
        loadFileList(pathSegments.value.slice(0, -1).join("/"));
        return;
    }

    if (currentPath.value) {
        loadFileList("");
    }
};

const handleDelete = async (file: FileItem) => {
    ZXMessageBox({
        title: file.is_file ? "删除文件" : "删除文件夹",
        message: `确定要删除 "${file.name}" 吗？此操作不可恢复！`,
        cancelButtonText: "取消",
        confirmButtonText: "删除",
        type: "error",
        onConfirm: async () => {
            try {
                const fullPath = resolveFilePath(file);
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

const openEditor = async (file: FileItem) => {
    if (!file.is_file) return;

    const fullPath = resolveFilePath(file);

    if (file.is_image) {
        imageLoading.value = true;

        try {
            const res = await fileApi.readFile(fullPath, {
                skipInterceptor: true,
                as_image: true,
            });

            if (res?.success && res?.data) {
                currentImageUrl.value = res.data.content || "";
                currentImageName.value = file.name;
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

    try {
        const res = await fileApi.readFile(fullPath, { skipInterceptor: true });

        if (res?.success && res?.data) {
            editorInitialFile.value = {
                path: fullPath,
                name: file.name,
                content: res.data.content,
            };
            showEditor.value = true;
        }
    } catch (error) {
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

const openRenameDialog = (file: FileItem) => {
    renamingFile.value = file;
    newName.value = file.name;
    showRenameDialog.value = true;
};

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
        const res = await fileApi.rename(
            resolveFilePath(renamingFile.value),
            newName.value,
        );

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

const sortedFileList = computed(() => {
    const query = searchQuery.value.toLowerCase().trim();
    const files = query
        ? fileList.value.filter((file) =>
              file.name.toLowerCase().includes(query),
          )
        : fileList.value;

    return [...files].sort((a, b) => {
        if (!a.is_file && b.is_file) return -1;
        if (a.is_file && !b.is_file) return 1;

        return a.name.localeCompare(b.name, "zh-CN");
    });
});

onMounted(() => {
    loadFileList();
});
</script>

<template>
    <div class="flex h-full w-full flex-col space-y-3 sm:space-y-4">
        <div
            v-if="!globalStore.isDesktopMode"
            class="flex items-center justify-end rounded-3xl border-1 border-slate-200 bg-white p-2 shadow-sm sm:p-3"
        >
            <button
                class="btn-touch flex items-center space-x-2 rounded-2xl bg-zx-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zx-primary-hover"
                @click="showNewDialog = true"
            >
                <Plus class="h-4 w-4" />
                <span class="hidden sm:inline">新建</span>
            </button>
        </div>

        <FileBreadcrumbBar
            v-model:search-query="searchQuery"
            :current-path="currentPath"
            :path-segments="pathSegments"
            @back="goBack"
            @home="loadFileList('')"
            @navigate="loadFileList"
        />

        <FileListPanel
            :files="sortedFileList"
            :is-empty="fileList.length === 0"
            :loading="loading"
            :search-query="searchQuery"
            @delete="handleDelete"
            @enter-folder="enterFolder"
            @open="openEditor"
            @rename="openRenameDialog"
        />

        <NewItemDialog
            v-model="showNewDialog"
            v-model:item-name="newItemName"
            v-model:item-type="newItemType"
            @confirm="handleNew"
        />

        <RenameDialog
            v-model="showRenameDialog"
            v-model:name="newName"
            @confirm="handleRename"
        />

        <FileEditorModal
            v-if="showEditor"
            :initial-file="editorInitialFile"
            @close="showEditor = false"
        />

        <ImagePreviewModal
            v-model="showImagePreview"
            :image-name="currentImageName"
            :image-url="currentImageUrl"
            :loading="imageLoading"
            @loaded="imageLoading = false"
        />
    </div>
</template>
