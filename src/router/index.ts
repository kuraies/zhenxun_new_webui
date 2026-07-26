import {
    createRouter,
    createWebHistory,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type Router,
} from "vue-router";
import { ZXNotification } from "@/services/ui";
import { auth } from "@/utils/auth";
import { eventBus } from "@/events/eventBus.ts";
import { useThemeStore } from "@/store/theme";

const routes = [
    {
        path: "/login",
        name: "Login",
        component: () => import("@/pages/Login.vue"),
    },
    {
        path: "/",
        name: "Home",
        component: () => import("@/pages/Home.vue"),
        redirect: "/dashboard",
        children: [
            {
                path: "/dashboard",
                name: "首页",
                component: () => import("@/views/dashboard/Dashboard.vue"),
                meta: { menuKey: "dashboard" },
            },
            {
                path: "/analytics",
                name: "数据统计",
                component: () => import("@/views/analytics/Analytics.vue"),
                meta: { menuKey: "analytics" },
            },
            {
                path: "/chat",
                name: "联系人",
                component: () => import("@/views/chat/Chat.vue"),
                meta: { menuKey: "chat" },
            },
            {
                path: "/plugin",
                name: "插件",
                component: () => import("@/views/plugin/Plugin.vue"),
                meta: { menuKey: "plugin" },
            },
            {
                path: "/store",
                name: "插件商店",
                redirect: { path: "/plugin", query: { tab: "market" } },
            },
            {
                path: "/files",
                name: "文件",
                component: () => import("@/views/files/Files.vue"),
                meta: { menuKey: "files" },
            },
            {
                path: "/database",
                name: "数据库",
                component: () => import("@/views/database/Database.vue"),
                meta: { menuKey: "database" },
            },
            {
                path: "/logs",
                redirect: "/dashboard",
            },
            {
                path: "/ext/test",
                name: "扩展测试",
                component: () => import("@/views/extension/ExtensionTest.vue"),
                meta: { menuKey: "ext-test" },
            },
            // {
            //     path: '/settings',
            //     name: '设置',
            //     component: () => import('@/views/settings/Settings.vue'),
            //     meta: { menuKey: 'settings' }
            // },
            // {
            //     path: '/about',
            //     name: '关于我们',
            //     component: () => import('@/views/about/About.vue'),
            //     meta: { menuKey: 'about' }
            // },
            {
                path: "/manage",
                name: "管理",
                redirect: "/chat",
                meta: { menuKey: "manage" },
            },
        ],
    },
    {
        path: "/:pathMatch(.*)",
        redirect: {
            name: "Home",
        },
    },
];

export const router: Router = createRouter({
    history: createWebHistory(import.meta.env.PROD ? "/next/" : "/"),
    routes,
});

router.beforeEach(
    (
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
        next: NavigationGuardNext,
    ) => {
        const isAuthenticated = auth.getAuthState();
        const themeStore = useThemeStore();

        // 如果访问的是配置页，直接放行
        if (to.name === "Configure") {
            return next();
        }

        // 如果用户认证了但是又前往登录页，则阻止他
        if (to.name === "Login" && isAuthenticated) {
            ZXNotification({
                title: "哼唧",
                message: "哥哥这就嫌弃人家了吗？(ノへ￣、))",
                type: "😭",
                confetti: true,
            });

            if (from.path !== "/") {
                return next(false);
            } else {
                return next("/dashboard");
            }
        }

        // 登录页强制亮色主题
        if (to.name === "Login") {
            themeStore.forceApplyLight();
        } else if (from.name === "Login") {
            themeStore.restoreSavedTheme();
        }

        // 如果用户未认证且尝试访问非登录页面，则重定向到登录页
        if (to.name !== "Login" && !isAuthenticated) {
            if (to.path === "/") {
                ZXNotification({
                    title: "欢迎光临~",
                    message: "请先登录哦 (｡･ω･｡)",
                    type: "🥳",
                    confetti: true,
                });
            } else {
                // 从其他页面跳转过来
                ZXNotification({
                    title: "哎呦喂",
                    message: "您可还没登录呢~（〃｀3′〃）",
                    type: "error",
                    confetti: true,
                });
            }
            auth.deleteAuthToken();

            return next("/login");
        } else {
            next();
        }
    },
);

eventBus.on("LOGIN:SUCCESS", () => {
    router.push({ name: "Home" });
});
