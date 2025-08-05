import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import minipic from 'vite-plugin-minipic'
import { compression } from 'vite-plugin-compression2'
// import obfuscator from 'rollup-plugin-obfuscator';
import vueDevTools from 'vite-plugin-vue-devtools'


// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
        AutoImport({
            // resolvers: [ElementPlusResolver()],
            imports: [
                'vue',
                'vue-router',
                'pinia'
            ]
        }),
        minipic(),
        compression({
            threshold: 2000, // 设置只有超过 2k 的文件才执行压缩
            deleteOriginalAssets: false, // 设置是否删除原文件
            skipIfLargerOrEqual: true // 如果压缩后的文件大小与原文件大小一致或者更大时，不进行压缩
        }),
        vueDevTools(),
        // obfuscator({
        //     global:false,
        //     // options配置项实际为 javascript-obfuscator 选项
        //     options: {
        //         compact: true,
        //         controlFlowFlattening: true,
        //         controlFlowFlatteningThreshold: 0.75,
        //         numbersToExpressions: true,
        //         simplify: true,
        //         stringArrayShuffle: true,
        //         splitStrings: true,
        //         splitStringsChunkLength: 10,
        //         rotateUnicodeArray: true,
        //         deadCodeInjection: false,
        //         deadCodeInjectionThreshold: 0.4,
        //         debugProtection: false,
        //         debugProtectionInterval: 2000,
        //         disableConsoleOutput: false,
        //         domainLock: [],
        //         identifierNamesGenerator: "hexadecimal",
        //         identifiersPrefix: "",
        //         inputFileName: "",
        //         log: true,
        //         renameGlobals: true,
        //         reservedNames: [],
        //         reservedStrings: [],
        //         seed: 0,
        //         selfDefending: true,
        //         sourceMap: false,
        //         sourceMapBaseUrl: "",
        //         sourceMapFileName: "",
        //         sourceMapMode: "separate",
        //         stringArray: true,
        //         stringArrayEncoding: ["base64"],
        //         stringArrayThreshold: 0.75,
        //         target: "browser",
        //         transformObjectKeys: true,
        //         unicodeEscapeSequence: true,
        //
        //         domainLockRedirectUrl: "about:blank",
        //         forceTransformStrings: [],
        //         identifierNamesCache: null,
        //         identifiersDictionary: [],
        //         ignoreImports: true,
        //         optionsPreset: "default",
        //         renameProperties: false,
        //         renamePropertiesMode: "safe",
        //         sourceMapSourcesMode: "sources-content",
        //
        //         stringArrayCallsTransform: true,
        //         stringArrayCallsTransformThreshold: 0.5,
        //
        //         stringArrayIndexesType: ["hexadecimal-number"],
        //         stringArrayIndexShift: true,
        //         stringArrayRotate: true,
        //         stringArrayWrappersCount: 1,
        //         stringArrayWrappersChainedCalls: true,
        //         stringArrayWrappersParametersMaxCount: 2,
        //         stringArrayWrappersType: "variable",
        //     }
        // })
        // {
        //     name: 'log-visits',
        //     configureServer(server) {
        //         server.middlewares.use((req, res, next) => {
        //             const ip = req.socket.remoteAddress || 'unknown'
        //             const path = req.url
        //             console.log(`[访问记录] IP: ${ip} 路径: ${path}`)
        //             next()
        //         })
        //     }
        // },
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'components': fileURLToPath(new URL('./src/components', import.meta.url))
        }
    },
    build: {
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        },
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (['birpc', 'hookable', 'perfect-debounce'].some(pkg => id.includes(pkg))) {
                            return undefined
                        }
                        if (id.includes('vue')) {
                            return 'vendor_vue'
                        }
                        if (id.includes('element-plus')) {
                            return 'vendor_element'
                        }
                        return id.toString().split('node_modules/')[1].split('/')[0].toString()
                    }
                }
            }
        }
    },
    server: {
    //     proxy: {
    //         '/zhenxun/api': {
    //             target: 'http://localhost:8080',
    //             changeOrigin: true,
    //             ws: false,
    //             bypass: (req) => {
    //                 // 仅当访问本地地址时才转发
    //                 if (!req.headers.host.includes('localhost') && !req.headers.host.includes('127.0.0.1')) {
    //                     return req.originalUrl;
    //                 }
    //             }
    //         },
    //         '/zhenxun/socket': {
    //             target: 'http://localhost:8080',
    //             changeOrigin: true,
    //             ws: true,
    //             bypass: (req) => {
    //                 // 仅当访问本地地址时才转发
    //                 if (!req.headers.host.includes('localhost') && !req.headers.host.includes('127.0.0.1')) {
    //                     return req.originalUrl;
    //                 }
    //             }
    //         }
    //     },
        host: '::'
    }
})


