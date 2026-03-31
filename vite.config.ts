import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
// import minipic from "vite-plugin-minipic";
import compression from "vite-plugin-compression2";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
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
        vueDevTools(), // 开发时 Vue DevTools 支持
        // Monaco Editor 插件已移除，改为在组件中动态加载 Workers
    ],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
            components: fileURLToPath(
                new URL("./src/components", import.meta.url),
            ),
        },
    },
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
                    if (id.includes("node_modules")) {
                        if (
                            ["birpc", "hookable", "perfect-debounce"].some(
                                (pkg) => id.includes(pkg),
                            )
                        ) {
                            return undefined; // 这几个库不分包
                        }
                        if (id.includes("vue")) {
                            return "vendor_vue"; // Vue 相关库打包到 vendor_vue
                        }
                        if (id.includes("element-plus")) {
                            return "vendor_element"; // Element Plus 打包到 vendor_element
                        }
                        // 其它 node_modules 中的库，按第一层目录分包
                        const match = id
                            .toString()
                            .match(/node_modules\/(.+)\/.+\.js/);
                        if (match) {
                            return match[1];
                        }
                    }
                },
            },
        },
    },
    server: {
        host: "::", // 监听所有 IPv4 和 IPv6 地址（等同于 0.0.0.0）
    },
});
