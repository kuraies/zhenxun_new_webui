/**
 * WebUI Next API - 统一导出
 */

// 客户端
export { api, default as apiClient, updateApiBaseUrl, getWsBaseUrl } from './client'

// 各模块 API
export { analyticsApi } from './analytics'
export { authApi } from './auth'
export { systemApi } from './system'
export { dashboardApi } from './dashboard'
export { pluginApi } from './plugin'
export { fileApi } from './file'
export { configApi } from './config'
export { databaseApi } from './database'
export { mainApi } from './main'
export { storeApi, type StoreResponse } from './store'
export { chatApi } from './chat'
export { botApi } from './bot'

// WebSocket 工具
export { connectLogsWebSocket, disconnectLogsWebSocket, onLogMessage, onConnectionStateChange as onLogsConnectionStateChange } from './websocket-logs'
export { connectChatWebSocket, disconnectChatWebSocket, onChatMessage, onConnectionStateChange as onChatConnectionStateChange } from './websocket-chat'

// 管理模块
export { manageApi } from './manage'
