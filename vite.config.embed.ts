import { defineConfig, loadEnv } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    build: {
      lib: {
        entry: path.resolve(__dirname, "server/embed/vidshop-entry.ts"),
        name: "VidShop",
        fileName: () => "vidshop.js",
        formats: ["iife"],
      },
      outDir: path.resolve(__dirname, "dist/public/embed"),
      emptyOutDir: false,
      minify: true,
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === "style.css") return "vidshop.css";
            return assetInfo.name;
          },
        },
      },
    },
    define: {
      "API_ORIGIN": JSON.stringify(env.VITE_API_ORIGIN || ""),
    },
  };
});
