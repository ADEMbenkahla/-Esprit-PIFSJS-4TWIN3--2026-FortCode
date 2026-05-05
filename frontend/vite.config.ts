import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
    server: {
        port: 5173,
        strictPort: true,
    },
    preview: {
        port: 5173,
        strictPort: true,
    },
    esbuild: {
        drop: ['console', 'debugger'],
    },
    plugins: [
        // The React and Tailwind plugins are both required for Make, even if
        // Tailwind is not being actively used – do not remove them
        react(),
        tailwindcss(),
        viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
            threshold: 10240, // compress files larger than 10KB
        }),
        viteCompression({
            algorithm: 'brotliCompress',
            ext: '.br',
            threshold: 10240,
        })
    ],
    resolve: {
        alias: {
            // Alias @ to the src directory
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('three')) {
                            return 'three-core';
                        }
                        if (id.includes('react-unity-webgl')) {
                            return 'unity';
                        }
                        if (id.includes('monaco-editor')) {
                            return 'monaco';
                        }
                        if (id.includes('face-api.js')) {
                            return 'face-api';
                        }
                        if (id.includes('lucide-react')) {
                            return 'icons';
                        }
                        if (id.includes('framer-motion')) {
                            return 'animations';
                        }
                        // Avoid splitting React core libs manually to prevent circular dependencies
                    }
                }
            }
        },
        chunkSizeWarningLimit: 1200
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
})
