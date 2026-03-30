<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
    Settings,
    FileText,
    Save,
    RefreshCw,
    Folder,
    Code
} from 'lucide-vue-next'
import { fileApi, configApi, systemApi } from '@/utils/api-next'
import { ZXNotification, ZXMessageBox } from '@/components'
import ZXMonacoEditor from '@/components/ZXMonacoEditor'

// Tab 类型
type TabType = 'env' | 'config'

// 当前选中的 Tab
const activeTab = ref<TabType>('env')

// 环境变量相关
const envContent = ref('')
const envLoading = ref(false)
const envSaving = ref(false)
const envFileList = ref<string[]>([])
const selectedEnvFile = ref('.env')

// 配置文件相关
const configContent = ref('')
const configLoading = ref(false)
const configSaving = ref(false)

// 加载环境变量文件列表
const loadEnvFileList = async () => {
    try {
        const res = await fileApi.getFileList()
        if (res?.success && res?.data?.files) {
            envFileList.value = res.data.files
                .filter((f) => f.name.startsWith('.env'))
                .map((f) => f.name)
            if (envFileList.value.length > 0 && !envFileList.value.includes(selectedEnvFile.value)) {
                selectedEnvFile.value = envFileList.value[0]
            }
        }
    } catch (error) {
        console.error('加载.env 文件列表失败:', error)
    }
}

// 加载环境变量（使用新后端 API）
const loadEnv = async () => {
    envLoading.value = true
    try {
        const res = await configApi.getEnvFile(selectedEnvFile.value)
        if (res?.success && res?.data) {
            // API 直接返回原始文件内容
            envContent.value = res.data.content
        }
    } catch (error) {
        ZXNotification({
            title: '呜呼～',
            message: '环境变量加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        envLoading.value = false
    }
}

// 保存环境变量（使用新后端 API）
const saveEnv = async () => {
    if (envSaving.value) return

    envSaving.value = true
    try {
        const res = await configApi.saveEnvFile({
            name: selectedEnvFile.value,
            content: envContent.value
        })
        if (res?.success) {
            ZXNotification({
                title: '保存成功～',
                message: '环境变量已经保存成功啦！',
                type: '🥳',
                position: 'top-right',
                confetti: true
            })
        } else {
            ZXNotification({
                title: '保存失败',
                message: (res?.message as string) || '环境变量保存失败了 (´；ω；`)',
                type: '😭',
                position: 'top-right'
            })
        }
    } catch (error) {
        ZXNotification({
            title: '保存失败',
            message: '环境变量保存失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        envSaving.value = false
    }
}

// 加载配置文件
const loadConfig = async () => {
    configLoading.value = true
    try {
        const res = await configApi.getYamlFile()
        if (res?.success && res?.data) {
            configContent.value = res.data.content
        }
    } catch (error) {
        ZXNotification({
            title: '呜呼～',
            message: '配置文件加载失败了 (っ °Д °;) っ',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        configLoading.value = false
    }
}

// 保存配置文件
const saveConfig = async () => {
    if (configSaving.value) return

    configSaving.value = true
    try {
        const res = await configApi.saveYamlFile(configContent.value)
        if (res?.success) {
            ZXMessageBox({
                title: '保存成功～',
                message: '配置文件已保存，需要重启 Bot 才能生效，是否立即重启？',
                cancelButtonText: '稍后',
                confirmButtonText: '立即重启',
                onConfirm: async () => {
                    try {
                        await systemApi.restartBot()
                        ZXNotification({
                            title: '重启中～',
                            message: 'Bot 正在重启，请稍候...',
                            type: '🔄',
                            position: 'top-right'
                        })
                    } catch (error) {
                        ZXNotification({
                            title: '重启失败',
                            message: 'Bot 重启失败了 (´；ω；`)',
                            type: '😭',
                            position: 'top-right'
                        })
                    }
                }
            })
        } else {
            ZXNotification({
                title: '保存失败',
                message: (res?.message as string) || '配置文件保存失败了 (´；ω；`)',
                type: '😭',
                position: 'top-right'
            })
        }
    } catch (error) {
        ZXNotification({
            title: '保存失败',
            message: '配置文件保存失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    } finally {
        configSaving.value = false
    }
}

onMounted(() => {
    loadEnvFileList()
    loadEnv()
})

// 切换 Tab
const switchTab = (tab: TabType) => {
    activeTab.value = tab
    if (tab === 'env') {
        loadEnv()
    } else {
        loadConfig()
    }
}
</script>

<template>
    <div class="w-full h-full flex flex-col space-y-3 sm:space-y-4">
        <!-- 头部标题 -->
        <div class="flex items-center justify-between bg-white rounded-2xl shadow-sm p-4 outline-1 outline-slate-200">
            <div class="flex items-center space-x-3">
                <Settings class="h-6 w-6 text-blue-500 flex-shrink-0" />
                <h2 class="text-lg font-semibold text-gray-800">系统设置</h2>
            </div>
        </div>

        <!-- Tab 切换 -->
        <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-2">
            <div class="flex space-x-2">
                <button
                    @click="switchTab('env')"
                    :class="activeTab === 'env' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                    class="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center space-x-2 btn-touch"
                >
                    <Code class="w-4 h-4" />
                    <span>环境变量</span>
                </button>
                <button
                    @click="switchTab('config')"
                    :class="activeTab === 'config' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                    class="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center space-x-2 btn-touch"
                >
                    <FileText class="w-4 h-4" />
                    <span>配置文件</span>
                </button>
            </div>
        </div>

        <!-- 环境变量编辑 -->
        <div v-if="activeTab === 'env'" class="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm outline-1 outline-slate-200">
            <!-- 工具栏 -->
            <div class="p-3 flex items-center justify-between flex-wrap gap-2 border-b border-slate-100">
                <div class="flex items-center space-x-2">
                    <Folder class="w-4 h-4 text-gray-400" />
                    <select
                        v-model="selectedEnvFile"
                        @change="loadEnv"
                        class="px-3 py-1.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option v-for="file in envFileList" :key="file" :value="file">{{ file }}</option>
                    </select>
                    <button
                        @click="loadEnv"
                        :disabled="envLoading"
                        class="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors btn-touch"
                        title="刷新"
                    >
                        <RefreshCw :class="{ 'animate-spin': envLoading }" class="w-4 h-4 text-gray-600" />
                    </button>
                </div>

                <button
                    @click="saveEnv"
                    :disabled="envSaving || envLoading"
                    class="px-4 py-2 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2 btn-touch"
                >
                    <Save :class="{ 'animate-spin': envSaving }" class="w-4 h-4" />
                    <span>保存</span>
                </button>
            </div>

            <!-- 编辑区 -->
            <div class="flex-1 min-h-0">
                <ZXMonacoEditor
                    v-model="envContent"
                    :language="'yaml'"
                    :path="selectedEnvFile"
                    :loading="envLoading"
                    hide-toolbar
                />
            </div>
        </div>

        <!-- 配置文件编辑 -->
        <div v-if="activeTab === 'config'" class="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm outline-1 outline-slate-200">
            <!-- 工具栏 -->
            <div class="p-3 flex items-center justify-between flex-wrap gap-2 border-b border-slate-100">
                <div class="flex items-center space-x-2 text-sm text-gray-600">
                    <FileText class="w-4 h-4 text-gray-400" />
                    <span>data/config.yaml</span>
                </div>

                <div class="flex items-center space-x-2">
                    <button
                        @click="loadConfig"
                        :disabled="configLoading"
                        class="p-1.5 hover:bg-gray-100 rounded-2xl transition-colors btn-touch"
                        title="刷新"
                    >
                        <RefreshCw :class="{ 'animate-spin': configLoading }" class="w-4 h-4 text-gray-600" />
                    </button>

                    <button
                        @click="saveConfig"
                        :disabled="configSaving || configLoading"
                        class="px-4 py-2 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2 btn-touch"
                    >
                        <Save :class="{ 'animate-spin': configSaving }" class="w-4 h-4" />
                        <span>保存</span>
                    </button>
                </div>
            </div>

            <!-- 编辑区 -->
            <div class="flex-1 min-h-0">
                <ZXMonacoEditor
                    v-model="configContent"
                    :language="'yaml'"
                    :path="'data/config.yaml'"
                    :loading="configLoading"
                    hide-toolbar
                />
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
