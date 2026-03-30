/**
 * WebUI Next API - 文件管理接口
 */

import { api } from './client'
import type {
    FileListResult,
    FileContent,
    APIResponse,
} from '@/types/api-next.types'

export const fileApi = {
    /**
     * 获取文件列表
     */
    getFileList(path?: string): Promise<APIResponse<FileListResult>> {
        return api.get<FileListResult>('/file/list', { path: path || undefined })
    },

    /**
     * 读取文件内容
     */
    readFile(filePath: string, options?: { skipInterceptor?: boolean; as_image?: boolean }): Promise<APIResponse<FileContent>> {
        return api.get<FileContent>('/file/read', { file_path: filePath, as_image: options?.as_image }, options)
    },

    /**
     * 保存文件内容
     */
    saveFile(filePath: string, content: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/save', { file_path: filePath, content })
    },

    /**
     * 删除文件
     */
    deleteFile(filePath: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/delete', { file_path: filePath })
    },

    /**
     * 删除文件夹
     */
    deleteFolder(folderPath: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/delete-folder', { folder_path: folderPath })
    },

    /**
     * 重命名文件/文件夹
     */
    rename(sourcePath: string, newName: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/rename', { source_path: sourcePath, new_name: newName })
    },

    /**
     * 创建文件
     */
    createFile(parentPath: string | undefined, name: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/create-file', { parent_path: parentPath || '', name })
    },

    /**
     * 创建文件夹
     */
    createFolder(parentPath: string | undefined, name: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/create-folder', { parent_path: parentPath || '', name })
    },
}
