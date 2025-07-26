import { createRouter, createWebHistory } from 'vue-router'
import { ZXNotification } from 'components'
import { auth } from '@/utils/auth.js'
// import Login from "@/views/Login.vue";

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/pages/Login.vue')
    },
    {
        path: '/configure',
        name: 'Configure',
        component: () => import('@/pages/Configure.vue')
    },
    {
        path: '/',
        name: 'Home',
        component: () => import('@/pages/Home.vue'),
        redirect: '/dashboard',
        children: [
            {
                path: '/dashboard',
                name: '首页',
                component: () => import('@/views/dashboard/Dashboard.vue'),
                meta: { menuKey: 'dashboard' }
            },
            {
                path: '/command', name: '控制台', component: () => import('@/views/command/Command.vue'),
                meta: { menuKey: 'command' }
            },
            {
                path: '/plugin', name: '插件列表', component: () => import('@/views/plugin/Plugin.vue'),
                meta: { menuKey: 'plugin' }
            },
            {
                path: '/store', name: '插件商店', component: () => import('@/views/store/Store.vue'),
                meta: { menuKey: 'store' }
            },
            {
                path: '/chat', name: '聊天', component: () => import('@/views/chat/Chat.vue'),
                meta: { menuKey: 'chat' }
            },
            {
                path: '/analytics', name: '数据统计', component: () => import('@/views/analytics/Analytics.vue'),
                meta: { menuKey: 'analytics' }
            },
            {
                path: '/files', name: '文件', component: () => import('@/views/files/Files.vue'),
                meta: { menuKey: 'files' }
            },
            {
                path: '/database', name: '数据库', component: () => import('@/views/database/Database.vue'),
                meta: { menuKey: 'database' }
            },
            {
                path: '/about', name: '关于我们', component: () => import('@/views/about/About.vue'),
                meta: { menuKey: 'about' }
            }
        ]
    },
    {
        path: '/:pathMatch(.*)',
        redirect: {
            name: 'Home'
        }
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {
    const isAuthenticated = auth.getAuthState()

    // 如果访问的是配置页，直接放行
    if (to.name === 'Configure') {
        return next()
    }
    console.log('Navigating to:', to.name, 'isAuthenticated:', typeof isAuthenticated)
    // 如果用户认证了但是又前往登录页，则组织他
    if (to.name === 'Login' && isAuthenticated) {

        ZXNotification({
            title: '哼唧',
            message: '哥哥这就嫌弃人家了吗?(ノへ￣、))',
            type: '😭',
            confetti: {
                colors: ['#60a5fa', '#f472b6']
            }
        })

        if (from.path !== '/') {
            return next(false) // 阻止导航，尝试回退
        } else {
            return next('/') // 如果没有上一页，直接跳转首页
        }
    }

    // 如果用户未认证且尝试访问非登录页面，则重定向到登录页
    if (to.name !== 'Login' && !isAuthenticated) {
        if (to.path === '/') {
            ZXNotification({
                title: '欢迎光临~',
                message: '请先登录哦 (｡･ω･｡)',
                type: '🥳',
                confetti: {
                    colors: ['#60a5fa']
                }
            })
        } else {
            // 从其他页面跳转过来
            ZXNotification({
                title: '哎呦喂',
                message: '您可还没登录呢~（〃｀ 3′〃）',
                type: 'error',
                confetti: {
                    colors: ['#f87171']
                }
            })
        }
        auth.deleteAuthToken()

        next({ name: 'Login' })
    } else {
        next()
    }
})