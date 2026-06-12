<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Code, FileText, Folder, Settings } from "lucide-vue-next";
import { configApi, fileApi, systemApi } from "@/utils/api-next";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import SettingsEditorPanel from "./SettingsEditorPanel.vue";

// Tab 类型
type TabType = "env" | "config";

// 当前选中的 Tab
const activeTab = ref<TabType>("env");

// 环境变量相关
const envContent = ref("");
const envLoading = ref(false);
const envSaving = ref(false);
const envFileList = ref<string[]>([]);
const selectedEnvFile = ref(".env");

// 配置文件相关
const configContent = ref("");
const configLoading = ref(false);
const configSaving = ref(false);

// 加载环境变量文件列表
const loadEnvFileList = async () => {
    try {
        const res = await fileApi.getFileList();
        if (res?.success && res?.data?.files) {
            envFileList.value = res.data.files
                .filter((f) => f.name.startsWith(".env"))
                .map((f) => f.name);

            if (
                envFileList.value.length > 0 &&
                !envFileList.value.includes(selectedEnvFile.value)
            ) {
                selectedEnvFile.value = envFileList.value[0];
            }
        }
    } catch (error) {
        console.error("加载.env 文件列表失败:", error);
    }
};

// 加载环境变量（使用新后端 API）
const loadEnv = async () => {
    envLoading.value = true;
    try {
        const res = await configApi.getEnvFile(selectedEnvFile.value);
        if (res?.success && res?.data) {
            // API 直接返回原始文件内容
            envContent.value = res.data.content;
        }
    } catch (error) {
        ZXNotification({
            title: "呜呼～",
            message: "环境变量加载失败了 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
    } finally {
        envLoading.value = false;
    }
};

// 保存环境变量（使用新后端 API）
const saveEnv = async () => {
    if (envSaving.value) return;

    envSaving.value = true;
    try {
        const res = await configApi.saveEnvFile({
            name: selectedEnvFile.value,
            content: envContent.value,
        });
        if (res?.success) {
            ZXNotification({
                title: "保存成功～",
                message: "环境变量已经保存成功啦！",
                type: "🥳",
                position: "top-right",
                confetti: true,
            });
        } else {
            ZXNotification({
                title: "保存失败",
                message:
                    (res?.message as string) || "环境变量保存失败了 (´；ω；`)",
                type: "😭",
                position: "top-right",
            });
        }
    } catch (error) {
        ZXNotification({
            title: "保存失败",
            message: "环境变量保存失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    } finally {
        envSaving.value = false;
    }
};

// 加载配置文件
const loadConfig = async () => {
    configLoading.value = true;
    try {
        const res = await configApi.getYamlFile();
        if (res?.success && res?.data) {
            configContent.value = res.data.content;
        }
    } catch (error) {
        ZXNotification({
            title: "呜呼～",
            message: "配置文件加载失败了 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
    } finally {
        configLoading.value = false;
    }
};

// 保存配置文件
const saveConfig = async () => {
    if (configSaving.value) return;

    configSaving.value = true;
    try {
        const res = await configApi.saveYamlFile(configContent.value);
        if (res?.success) {
            ZXMessageBox({
                title: "保存成功～",
                message:
                    "配置文件已保存，需要重启 Bot 才能生效，是否立即重启？",
                cancelButtonText: "稍后",
                confirmButtonText: "立即重启",
                onConfirm: async () => {
                    try {
                        await systemApi.restartBot();
                        ZXNotification({
                            title: "重启中～",
                            message: "Bot 正在重启，请稍候...",
                            type: "🔄",
                            position: "top-right",
                        });
                    } catch (error) {
                        ZXNotification({
                            title: "重启失败",
                            message: "Bot 重启失败了 (´；ω；`)",
                            type: "😭",
                            position: "top-right",
                        });
                    }
                },
            });
        } else {
            ZXNotification({
                title: "保存失败",
                message:
                    (res?.message as string) || "配置文件保存失败了 (´；ω；`)",
                type: "😭",
                position: "top-right",
            });
        }
    } catch (error) {
        ZXNotification({
            title: "保存失败",
            message: "配置文件保存失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    } finally {
        configSaving.value = false;
    }
};

onMounted(() => {
    loadEnvFileList();
    loadEnv();
});

// 切换 Tab
const switchTab = (tab: TabType) => {
    activeTab.value = tab;
    if (tab === "env") {
        loadEnv();
    } else {
        loadConfig();
    }
};
</script>

<template>
    <div class="flex h-full w-full flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题 -->
        <div
            class="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm outline-1 outline-slate-200"
        >
            <div class="flex items-center space-x-3">
                <Settings class="h-6 w-6 flex-shrink-0 text-blue-500" />
                <h2 class="text-lg font-semibold text-gray-800">系统设置</h2>
            </div>
        </div>

        <!-- Tab 切换 -->
        <div
            class="rounded-3xl bg-white p-2 shadow-sm outline-1 outline-slate-200"
        >
            <div class="flex space-x-2">
                <button
                    :class="
                        activeTab === 'env'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    "
                    class="btn-touch flex flex-1 items-center justify-center space-x-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors"
                    @click="switchTab('env')"
                >
                    <Code class="h-4 w-4" />
                    <span>环境变量</span>
                </button>
                <button
                    :class="
                        activeTab === 'config'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    "
                    class="btn-touch flex flex-1 items-center justify-center space-x-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors"
                    @click="switchTab('config')"
                >
                    <FileText class="h-4 w-4" />
                    <span>配置文件</span>
                </button>
            </div>
        </div>

        <!-- 环境变量编辑 -->
        <SettingsEditorPanel
            v-if="activeTab === 'env'"
            v-model="envContent"
            :loading="envLoading"
            :path="selectedEnvFile"
            :saving="envSaving"
            @refresh="loadEnv"
            @save="saveEnv"
        >
            <template #toolbar-left>
                <div class="flex items-center space-x-2">
                    <Folder class="h-4 w-4 text-gray-400" />
                    <select
                        v-model="selectedEnvFile"
                        class="rounded-2xl border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        @change="loadEnv"
                    >
                        <option
                            v-for="file in envFileList"
                            :key="file"
                            :value="file"
                        >
                            {{ file }}
                        </option>
                    </select>
                </div>
            </template>
        </SettingsEditorPanel>

        <SettingsEditorPanel
            v-if="activeTab === 'config'"
            v-model="configContent"
            :loading="configLoading"
            path="data/config.yaml"
            :saving="configSaving"
            @refresh="loadConfig"
            @save="saveConfig"
        >
            <template #toolbar-left>
                <div class="flex items-center space-x-2 text-sm text-gray-600">
                    <FileText class="h-4 w-4 text-gray-400" />
                    <span>data/config.yaml</span>
                </div>
            </template>
        </SettingsEditorPanel>
    </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
    width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: var(--zx-color-border-soft);
    border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background: var(--zx-slate-300);
    border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: var(--zx-color-text-subtle);
}
</style>
