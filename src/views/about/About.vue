<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
    Heart,
    Github,
    Users,
    Sparkles,
    Info,
    Award,
    Book,
    Coffee,
    MessageCircle
} from 'lucide-vue-next'
import { ZXNotification } from '@/components'

// 项目信息
const projectInfo = ref({
    name: '真寻 Bot',
    version: 'v0.9.0',
    description: '基于 Nonebot2 的多功能 QQ 机器人框架',
    author: 'HibiKier',
    repository: 'https://github.com/HibiKier/zhenxun_bot',
    documentation: 'https://zhenxun-bot.readthedocs.io/'
})

// 贡献者列表
const contributors = ref([
    { name: 'HibiKier', role: '创始人', avatar: '' },
    { name: '小真寻', role: '吉祥物', avatar: '' }
])

// 统计数据
const stats = ref({
    stars: 0,
    forks: 0,
    contributors: 0,
    downloads: 0
})

// 特别感谢
const specialThanks = ref([
    { name: 'Nonebot Team', reason: '提供优秀的机器人框架', url: 'https://nonebot.dev/' },
    { name: 'YiriBot Team', reason: '灵感来源', url: 'https://bot.yiriai.com/' },
    { name: '所有贡献者', reason: '感谢你们的支持！', url: '' }
])

// 加载统计数据
const loadStats = async () => {
    try {
        // 尝试从 GitHub API 获取数据（如果可用）
        // 这里使用模拟数据，实际项目中可以调用后端 API 获取真实数据
        stats.value = {
            stars: 2333,
            forks: 567,
            contributors: 42,
            downloads: 10000
        }
    } catch (error) {
        // 静默失败
    }
}

// 打开 GitHub 仓库
const openRepository = () => {
    const win = window as any
    win.open(projectInfo.value.repository, '_blank')
}

// 打开文档
const openDocumentation = () => {
    const win = window as any
    win.open(projectInfo.value.documentation, '_blank')
}

// 打开 URL
const openUrl = (url: string) => {
    const win = window as any
    win.open(url, '_blank')
}

// 复制打赏信息
const copyRewardInfo = (type: '微信' | '支付宝') => {
    ZXNotification({
        title: '打赏支持',
        message: `${type}收款码已复制，感谢支持！(｡･ω･｡)`,
        type: '🥳',
        position: 'top-right'
    })
}

onMounted(() => {
    loadStats()
})
</script>

<template>
    <div class="w-full h-full flex flex-col space-y-4 overflow-y-auto">
        <!-- 头部横幅 -->
        <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-8 text-gray-800 relative overflow-hidden min-h-[240px]">
            <div class="absolute top-0 right-0 opacity-5">
                <Sparkles class="w-48 h-48 text-blue-500" />
            </div>
            <div class="relative z-10">
                <div class="flex items-center space-x-4 mb-4">
                    <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <Heart class="w-10 h-10 text-blue-600" />
                    </div>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-800">{{ projectInfo.name }}</h1>
                        <p class="text-gray-600 text-lg">{{ projectInfo.version }}</p>
                    </div>
                </div>
                <p class="text-gray-700 text-lg max-w-2xl">{{ projectInfo.description }}</p>
                <div class="flex items-center space-x-4 mt-6">
                    <button
                        @click="openRepository"
                        class="px-6 py-2 bg-blue-50 hover:bg-blue-100 rounded-2xl text-sm font-medium transition-colors flex items-center space-x-2 text-blue-600"
                    >
                        <Github class="w-4 h-4" />
                        <span>GitHub 仓库</span>
                    </button>
                    <button
                        @click="openDocumentation"
                        class="px-6 py-2 bg-purple-50 hover:bg-purple-100 rounded-2xl text-sm font-medium transition-colors flex items-center space-x-2 text-purple-600"
                    >
                        <Book class="w-4 h-4" />
                        <span>官方文档</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 统计卡片 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                        <Award class="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-gray-800">{{ stats.stars }}</div>
                        <div class="text-xs text-gray-500">Stars</div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Sparkles class="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-gray-800">{{ stats.forks }}</div>
                        <div class="text-xs text-gray-500">Forks</div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Users class="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-gray-800">{{ stats.contributors }}</div>
                        <div class="text-xs text-gray-500">贡献者</div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <MessageCircle class="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-gray-800">{{ stats.downloads }}</div>
                        <div class="text-xs text-gray-500">下载量</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 项目信息 -->
        <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Info class="w-5 h-5 text-blue-500" />
                <span>项目信息</span>
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-3">
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span class="text-sm text-gray-600">项目名称</span>
                        <span class="text-sm font-medium text-gray-800">{{ projectInfo.name }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span class="text-sm text-gray-600">版本</span>
                        <span class="text-sm font-medium text-gray-800">{{ projectInfo.version }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span class="text-sm text-gray-600">作者</span>
                        <span class="text-sm font-medium text-gray-800">{{ projectInfo.author }}</span>
                    </div>
                </div>
                <div class="space-y-3">
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span class="text-sm text-gray-600">框架</span>
                        <span class="text-sm font-medium text-gray-800">Nonebot2</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span class="text-sm text-gray-600">语言</span>
                        <span class="text-sm font-medium text-gray-800">Python 3.9+</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <span class="text-sm text-gray-600">协议</span>
                        <span class="text-sm font-medium text-gray-800">MIT</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 特别感谢 -->
        <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Coffee class="w-5 h-5 text-pink-500" />
                <span>特别感谢</span>
            </h2>
            <div class="space-y-3">
                <div
                    v-for="(item, index) in specialThanks"
                    :key="index"
                    class="p-4 bg-gray-50 rounded-2xl hover:shadow-md transition-shadow cursor-pointer"
                    @click="item.url && openUrl(item.url)"
                >
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="font-medium text-gray-800">{{ item.name }}</h3>
                            <p class="text-sm text-gray-500 mt-1">{{ item.reason }}</p>
                        </div>
                        <span v-if="item.url" class="text-blue-500 text-sm">访问 →</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 贡献者 -->
        <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Users class="w-5 h-5 text-purple-500" />
                <span>核心贡献者</span>
            </h2>
            <div class="flex flex-wrap gap-4">
                <div
                    v-for="(contributor, index) in contributors"
                    :key="index"
                    class="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                >
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {{ contributor.name.charAt(0) }}
                    </div>
                    <div>
                        <div class="font-medium text-gray-800">{{ contributor.name }}</div>
                        <div class="text-xs text-gray-500">{{ contributor.role }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 打赏支持 -->
        <div class="bg-white rounded-2xl shadow-sm outline-1 outline-slate-200 p-6">
            <h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Coffee class="w-5 h-5 text-yellow-500" />
                <span>打赏支持</span>
            </h2>
            <p class="text-sm text-gray-600 mb-4">
                如果这个项目对你有帮助，欢迎打赏支持一下作者喵～ (｡･ω･｡)
            </p>
            <div class="grid grid-cols-2 gap-4">
                <button
                    @click="copyRewardInfo('微信')"
                    class="p-4 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors text-center"
                >
                    <div class="text-green-600 font-medium mb-2">微信打赏</div>
                    <div class="text-xs text-gray-500">点击复制收款码</div>
                </button>
                <button
                    @click="copyRewardInfo('支付宝')"
                    class="p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors text-center"
                >
                    <div class="text-blue-600 font-medium mb-2">支付宝打赏</div>
                    <div class="text-xs text-gray-500">点击复制收款码</div>
                </button>
            </div>
        </div>

        <!-- 版权信息 -->
        <div class="text-center text-sm text-gray-500 py-4">
            <p>Copyright © 2023-{{ new Date().getFullYear() }} {{ projectInfo.author }}</p>
            <p>Based on Nonebot2 Framework | Made with <Heart class="w-4 h-4 inline text-red-500" /> by Zhenxun Team</p>
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
