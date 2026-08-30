import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
// import minipic from "vite-plugin-minipic";
import compression from "vite-plugin-compression2";

// https://vite.dev/config/
// ==================== Mock 模式开关 ====================
// 开启后开发服务器里所有 API 请求与 WebSocket 数据均来自 src/mocks 的本地数据，
// 无需启动真寻后端即可开发前端页面（仅 dev 生效，build 永远关闭）
const MOCK = false;
// ===========================================================

export default defineConfig(({ command }) =>({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
            components: fileURLToPath(
                new URL("./src/components", import.meta.url),
            ),
            // Mock 开关注入载体:代码里 import { MOCK_MODE } from "virtual:mock-mode"
            // 拿到编译期常量；import { mockAdapter } from "virtual:mock-api" 拿到
            // mock 适配器（关闭时指向空实现，src/mocks 不会进入构建产物）
            ...(command === "serve" && MOCK
                ? {
                      "virtual:mock-mode": fileURLToPath(
                          new URL("./src/mocks/flag-on.ts", import.meta.url),
                      ),
                      "virtual:mock-api": fileURLToPath(
                          new URL("./src/mocks/server.ts", import.meta.url),
                      ),
                  }
                : {
                      "virtual:mock-mode": fileURLToPath(
                          new URL("./src/mocks/flag-off.ts", import.meta.url),
                      ),
                      "virtual:mock-api": fileURLToPath(
                          new URL(
                              "./src/mocks/empty-adapter.ts",
                              import.meta.url,
                          ),
                      ),
                  }),
        },
    },
    plugins: [
        vue(),
        tailwindcss(),
        AutoImport({
            imports: ["vue", "vue-router", "pinia"],
            dts: true,
        }),
        Components({
            resolvers: [ElementPlusResolver()],
        }),
        // minipic(), // 图片压缩插件
        compression({
            threshold: 2000, // 只有大于 2kb 的文件才压缩
            deleteOriginalAssets: false, // 不删除原文件
            skipIfLargerOrEqual: true, // 如果压缩后 >= 原文件，则不压缩
        }),

        // vueDevTools(), // 开发时 Vue DevTools 支持
        // 编辑器已替换为轻量 textarea 实现，避免 worker 进入构建
    ],
    base: command === "build" ? "/next/" : "/",
    build: {
        minify: "terser",
        terserOptions: {
            compress: {
                drop_console: true, // 移除 console.*
                drop_debugger: true, // 移除 debugger;
            },
        },
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes("node_modules")) return;

                    if (
                        id.includes("chart.js") ||
                        id.includes("vue-chartjs")
                    ) {
                        return "vendor_charts";
                    }

                    if (id.includes("element-plus")) {
                        return "vendor_element";
                    }

                    if (
                        id.includes("/vue/") ||
                        id.includes("vue-router") ||
                        id.includes("pinia")
                    ) {
                        return "vendor_vue";
                    }

                    if (id.includes("gsap")) {
                        return "vendor_animation";
                    }

                    if (id.includes("lucide-vue-next")) {
                        return "vendor_icons";
                    }

                    if (id.includes("axios") || id.includes("js-yaml")) {
                        return "vendor_utils";
                    }
                },
            },
        },
    },
    server: {
        host: "::", // 监听所有 IPv4 和 IPv6 地址（等同于 0.0.0.0）
    },
}));
