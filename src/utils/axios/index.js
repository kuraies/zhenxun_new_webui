import axios from 'axios'
import { getBaseUrl } from '@/utils/api/index.js'
import { ZXNotification } from 'components'
import { auth } from '../auth.js'
import { navigateTo } from '@/utils/navigation.js'

let baseUrl =getBaseUrl()
export const apiUrl = '/zhenxun/api'
// console.log(baseUrl)

const request = axios.create({
    baseURL: baseUrl+apiUrl,
    timeout: 10000,
})

// 请求拦截器
request.interceptors.request.use(config => {
    // 添加token等统一处理
    const token = auth.getAuthToken()
    if (token) {
        config.headers['Authorization'] = token
    }
    return config
})


// 响应拦截器
request.interceptors.response.use(
    response => response.data,
    async error => {

        if (error.config?.skipInterceptor && error.response?.status === 500) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 ||error.response?.status === 400) {

            ZXNotification({
                title: "状态失效",
                message: "验证状态失效啦~返回登录(っ °Д °;)っ",
                type: '🥲',
                position: 'top-right',
            })

            auth.setAuthState(false)
            auth.deleteAuthToken()
            await navigateTo({
                name: 'Login'
            })
        }
        else if (error.response?.status > 400 && error.response?.status < 500) {
            ZXNotification({
                title: "对不起",
                message: "服务器被小真寻吃掉惹(っ °Д °;)っ",
                contentClass: 'text-red-500',
                type: '😭',
                position: 'top-right',
            })
        } else if (error.response?.status >= 500 && error.response?.status < 600) {
            ZXNotification({
                title: "哎呀",
                message: "服务器好像被小真寻玩坏惹(*/ω＼*)",
                type: '😋',
                contentClass: 'text-red-500',
                position: 'top-right',
            })
        }
        return Promise.reject(error)
    }
)

export function setRequestBaseUrl() {
    request.defaults.baseURL = getBaseUrl()+apiUrl
}


export default request