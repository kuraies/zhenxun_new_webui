/**
 * 独立调试客户端的精简 API 客户端
 *
 * 从主站 src/utils/api-next/client.ts 精简移植：
 * - 后端地址同样存放在 localStorage 的 url / port（与主站语义一致）
 * - Authorization 直接携带完整 token（与主站格式相同，如 "Bearer xxx"）
 * - 401 时不做路由跳转，而是回调由 App 注册的处理函数切回登录页
 *
 * 登录态与主站共用 localStorage 的同一个 key（'token'），
 * 主站登录后调试窗口天然免登录。
 */
import axios from "axios";
import type {
    APIResponse,
    LoginRequest,
    LoginResponse,
} from "@/types/api-next.types";

const API_V1_BASE = "/zhenxun/api/v1";

// ==================== 后端地址 ====================

export const getPort = () =>
    localStorage.getItem("port") || window.location.port || "8080";

export const setPort = (port: string) => localStorage.setItem("port", port);

export const getBaseUrl = () => {
    const port = getPort();
    const host =
        localStorage.getItem("url") ||
        `${window.location.protocol}//${window.location.hostname}`;
    return host.startsWith("http://") || host.startsWith("https://")
        ? `${host}:${port}`
        : `${window.location.protocol}//${host}:${port}`;
};

export const setBaseApiUrl = (url: string) => localStorage.setItem("url", url);

export const getWsBaseUrl = () => {
    const port = getPort();
    let host = localStorage.getItem("url") || `${window.location.hostname}`;
    host = host.replace(/^https?:\/\//, "");
    const protocol =
        localStorage.getItem("url")?.startsWith("https://") ||
        window.location.protocol === "https:"
            ? "wss:"
            : "ws:";
    return `${protocol}//${host}:${port}/zhenxun/ws/v1`;
};

// ==================== 令牌（与主站共用同一个 key） ====================

export const getToken = () => localStorage.getItem("token");

export const setToken = (token: string) => localStorage.setItem("token", token);

export const clearToken = () => localStorage.removeItem("token");

/** 按主站同样的格式拼接 token（"Bearer xxx"） */
export const formatToken = (tokenType: string, accessToken: string) =>
    `${tokenType.charAt(0).toUpperCase() + tokenType.slice(1)} ${accessToken}`;

// ==================== 401 处理 ====================

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: () => void) => {
    unauthorizedHandler = fn;
};

// ==================== axios 实例 ====================

export const apiClient = axios.create({
    baseURL: getBaseUrl() + API_V1_BASE,
    timeout: 100000,
});

export const updateApiBaseUrl = () => {
    apiClient.defaults.baseURL = getBaseUrl() + API_V1_BASE;
};

apiClient.interceptors.request.use(config => {
    const token = getToken();
    if (token) {
        config.headers["Authorization"] = token;
    }
    return config;
});

apiClient.interceptors.response.use(
    response => {
        // 后端不可用时请求可能落到前端自身的 index.html（返回 HTML），
        // 统一按失败处理，避免把 HTML 字符串当业务数据传给调用方
        const contentType = String(response.headers?.["content-type"] ?? "");
        if (!contentType.includes("application/json")) {
            return Promise.reject(
                new Error(
                    `Unexpected non-JSON response: ${response.config?.url}`,
                ),
            );
        }
        return response.data;
    },
    error => {
        if (error.response?.status === 401) {
            clearToken();
            unauthorizedHandler?.();
        }
        return Promise.reject(error);
    },
);

export const api = {
    get<T>(
        url: string,
        params?: Record<string, any>,
    ): Promise<APIResponse<T>> {
        return apiClient.get(url, { params });
    },

    post<T>(url: string, data?: any): Promise<APIResponse<T>> {
        return apiClient.post(url, data);
    },
};

export const authApi = {
    login(request: LoginRequest): Promise<APIResponse<LoginResponse>> {
        return apiClient.post("/auth/login", request, {
            headers: { "Content-Type": "application/json" },
        });
    },

    verifyToken(
        token: string,
    ): Promise<
        APIResponse<{ valid: boolean; username?: string; error?: string }>
    > {
        // 后端要的是裸 JWT；存储里的 token 带 "Bearer " 前缀（Authorization 头格式），
        // 混用会导致后端解析失败抛 Token 无效
        const raw = token.replace(/^(Bearer|bearer)\s+/, "");
        return apiClient.get(`/auth/verify?token=${encodeURIComponent(raw)}`);
    },
};
