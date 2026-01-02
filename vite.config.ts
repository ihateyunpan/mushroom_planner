import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],

    // --- 以下是 Cloudflare/部署 优化配置 (保持不变) ---
    esbuild: {
        // 生产环境移除 console 和 debugger，减少体积
        drop: ['console', 'debugger'],
    },
    build: {
        // 设置资源目录
        assetsDir: 'assets',
        // 启用 CSS 代码拆分
        cssCodeSplit: true,
        // 构建时清空输出目录
        emptyOutDir: true,
        // 调整 chunk 大小警告限制 (1MB)
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                // --- 核心优化：手动代码分包 ---
                manualChunks(id) {
                    // 1. 单独打包 node_modules (第三方库)
                    if (id.includes('node_modules')) {
                        // React 核心库单独拆分
                        if (id.includes('react') || id.includes('react-dom')) {
                            return 'react-vendor';
                        }
                        // 其他第三方库打包成 vendor
                        return 'vendor';
                    }
                    // 2. 业务代码逻辑拆分
                    // 将庞大的数据库文件单独拆分
                    if (id.includes('src/database')) {
                        return 'database';
                    }
                    // 逻辑处理部分也拆分
                    if (id.includes('src/logic')) {
                        return 'logic';
                    }
                },
                // 优化输出文件名
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash].[ext]'
            }
        },
        // 使用默认的 esbuild 进行压缩
        minify: 'esbuild',
    }
});