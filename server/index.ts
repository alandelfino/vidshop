import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { setupVite } from "./vite.js";
import { registerRoutes } from "./routes.js";
import { startSyncScheduler } from "./syncScheduler.js";
import path from "path";
import { db } from "./db.js";
import { catalogImports } from "../shared/schema.js";
import { eq } from "drizzle-orm";

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files as static assets
app.use("/uploads", express.static(path.resolve("uploads")));

registerRoutes(app);
await setupVite(app, server);

// Reset stuck jobs
await db.update(catalogImports)
  .set({ status: "failed", error: "Interrompido pela reinicialização do servidor" })
  .where(eq(catalogImports.status, "processing"));

startSyncScheduler();

const PORT = parseInt(process.env.PORT || "5000");
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
