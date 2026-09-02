import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { existsSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import compression from "vite-plugin-compression2";

/**
 * OneBot 调试客户端（调试页独立构建）的构建配置
 *
 * - 独立入口 debug/index.html，不依赖主站 router / pinia / element-plus，
 *   依赖图与主站构建完全隔离（rolldown 多入口共享图会产生循环 chunk，故独立构建）
 * - 产物输出到 dist/debug/ 且不清空目录，与主站产物合并成一个 dist ——
 *   部署方式与之前完全一致，调试端挂在与主站同域的 /next/debug/ 下
 * - 主站构建（vite.config.ts）保持原样，npm run build 会串起两个构建
 */
export default defineConfig(({ command }) => ({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
            components: fileURLToPath(new URL("./src/components", import.meta.url)),
        },
    },
    plugins: [
        vue(),
        tailwindcss(),
        // 调试端代码全部显式 import，不需要 AutoImport（也避免与主站争写 auto-imports.d.ts）
        compression({
            threshold: 2000,
            deleteOriginalAssets: false,
            skipIfLargerOrEqual: true,
        }),
        // 入口源文件在 debug/index.html，产物会继承相对路径输出到
        // dist/debug/debug/index.html，这里把它提到 dist/debug/ 下
        {
            name: "lift-debug-html",
            writeBundle(options) {
                const dir = options.dir ?? "dist/debug";
                const nested = resolve(dir, "debug");
                if (!existsSync(nested)) return;
                for (const f of ["index.html", "index.html.br", "index.html.gz"]) {
                    const from = resolve(nested, f);
                    if (existsSync(from)) renameSync(from, resolve(dir, f));
                }
                rmSync(nested, { recursive: true, force: true });
            },
        },
    ],
    base: command === "build" ? "/next/debug/" : "/",
    build: {
        outDir: "dist/debug",
        // 关键：不清空输出目录，否则会把主站刚构建的产物抹掉
        emptyOutDir: false,
        minify: "terser",
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
        rollupOptions: {
            input: {
                index: fileURLToPath(new URL("./debug/index.html", import.meta.url)),
            },
        },
    },
    server: {
        host: "::",
    },
}));
