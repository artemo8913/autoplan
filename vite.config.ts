import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
    base: "./",
    plugins: [
        react(),
        visualizer({
            open: true, // Automatically open the report in your browser
            filename: "stats.html", // Output file name
            gzipSize: true, // Show gzipped size
            brotliSize: true, // Show brotli size
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        if (id.includes("@mantine") || id.includes("@floating-ui")) {
                            return "ui-chunk";
                        }
                        if (id.includes("mobx")) {
                            return "mobx-chunk";
                        }
                        if (id.includes("xlsx")) {
                            return "xlsx-chunk";
                        }
                        return "vendor";
                    }
                },
            },
        },
    },
});
