/**
 * Mock 模式 - 路由总表
 * 新增 mock 接口：在 routes/ 下对应模块里加一条 MockRoute 即可
 */

import type { MockRoute } from './types'
import { MOCK_MODE } from 'virtual:mock-mode'
import { authRoutes } from './routes/auth'
import { systemRoutes } from './routes/system'
import { mainRoutes, dashboardRoutes } from './routes/main'
import { pluginRoutes, storeRoutes } from './routes/plugin'
import { fileRoutes } from './routes/file'
import { configRoutes, databaseRoutes } from './routes/config'
import { manageRoutes, analyticsRoutes } from './routes/manage'

export const mockRoutes: MockRoute[] = [
    ...authRoutes,
    ...systemRoutes,
    ...mainRoutes,
    ...dashboardRoutes,
    ...pluginRoutes,
    ...storeRoutes,
    ...fileRoutes,
    ...configRoutes,
    ...databaseRoutes,
    ...manageRoutes,
    ...analyticsRoutes,
]

if (MOCK_MODE) {
    console.info(
        `[Mock] 模式已开启，共注册 ${mockRoutes.length} 条路由，所有数据均为本地假数据`,
    )
}
