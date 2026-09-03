import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [vue()],
    build: {
        lib: {
            entry: {
                index: new URL('./src/index.ts', import.meta.url).pathname,
                inertia: new URL('./src/inertia.ts', import.meta.url).pathname,
            },
            formats: ['es'],
            cssFileName: 'style',
        },
        rollupOptions: {
            external: ['vue'],
            output: {
                entryFileNames: '[name].js',
            },
        },
    },
    test: {
        environment: 'jsdom',
    },
});
