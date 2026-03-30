import type { RouteLocationRaw } from "vue-router"
import { router } from "@/router"

/**
 * 导航到指定路由
 * @param path 路由路径或对象
 */
export function navigateTo(path: RouteLocationRaw) {
    return router.push(path)
}
