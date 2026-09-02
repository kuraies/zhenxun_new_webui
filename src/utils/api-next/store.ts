/**
 * WebUI Next API - 插件商店接口
 */

import { api } from './client'
import type { StorePlugin, NbStorePlugin } from '@/types/store.types'
import type { APIResponse } from '@/types/api-next.types'

export interface StoreResponse {
    install_module: string[]
    plugin_list: StorePlugin[]
}

export const storeApi = {
    /**
     * 获取插件商店列表
     */
    getPluginStore(): Promise<APIResponse<StoreResponse>> {
        return api.get('/store/get-plugin-store')
    },

    /**
     * 安装插件
     */
    installPlugin(id: number): Promise<APIResponse<boolean>> {
        return api.post('/store/install', { id })
    },

    /**
     * 更新插件
     */
    updatePlugin(id: number): Promise<APIResponse<boolean>> {
        return api.post('/store/update', { id })
    },

    /**
     * 移除插件
     */
    removePlugin(id: number): Promise<APIResponse<boolean>> {
        return api.post('/store/remove', { id })
    },

    /**
     * 获取 NoneBot 插件商店列表
     */
    getNbStoreList(): Promise<APIResponse<NbStorePlugin[]>> {
        return api.get<NbStorePlugin[]>('/store/nb/list')
    },

    /**
     * 安装 NoneBot 插件
     */
    installNbPlugin(moduleName: string): Promise<APIResponse<boolean>> {
        return api.post('/store/nb/install', { module_name: moduleName })
    },

    /**
     * 更新 NoneBot 插件
     */
    updateNbPlugin(moduleName: string): Promise<APIResponse<boolean>> {
        return api.post('/store/nb/update', { module_name: moduleName })
    },

    /**
     * 移除 NoneBot 插件
     */
    removeNbPlugin(moduleName: string): Promise<APIResponse<boolean>> {
        return api.post('/store/nb/remove', { module_name: moduleName })
    }
}
