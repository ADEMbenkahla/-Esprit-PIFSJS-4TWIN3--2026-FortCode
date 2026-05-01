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
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    three: ['three', 'react-unity-webgl'],
                    monaco: ['monaco-editor', '@monaco-editor/react'],
                    ui: ['lucide-react', 'framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-label']
                }
            }
        },
        chunkSizeWarningLimit: 1000
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
})
