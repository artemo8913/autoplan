import path from "node:path";
import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { viteSingleFile } from "vite-plugin-singlefile";

const resolve: UserConfig["resolve"] = {
    alias: {
        "@": path.resolve(__dirname, "src"),
    },
};

function buildProd(): UserConfig {
    return {
        base: "./",
        resolve,
        plugins: [
            react(),
            visualizer({
                open: true, // Automatically open the report in your browser
                filename: "stats.html", // Output file name
                gzipSize: true, // Show gzipped size
                brotliSize: true, // Show brotli size
            }),
        ],
        build: {
            outDir: "dist",
            sourcemap: false,
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
    };
}

function buildSingleHtml(): UserConfig {
    return {
        base: "./",
        resolve,
        plugins: [react(), viteSingleFile()],
        build: {
            outDir: "dist-html",
            sourcemap: false,
        },
    };
}

export default defineConfig(({ mode }) => {
    if (mode === "singlefile") {
        return buildSingleHtml();
    }
    return buildProd();
});
