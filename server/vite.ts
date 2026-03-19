import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type { Server } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setupVite(app: Express, server: Server) {
  if (process.env.NODE_ENV === "development") {
    // Em dev: Vite roda como middleware com HMR (Hot Module Replacement)
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,        // Vite não cria servidor próprio
        hmr: { server },             // HMR usa o mesmo servidor HTTP
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    // Em produção: serve os arquivos estáticos buildados
    const distPath = path.resolve(__dirname, "../../dist/public");

    if (!fs.existsSync(distPath)) {
      throw new Error(`Build não encontrado em ${distPath}. Rode 'npm run build' primeiro.`);
    }

    app.use(express.static(distPath));

    // SPA fallback: qualquer rota não encontrada serve o index.html
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
}
