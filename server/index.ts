import "express-async-errors";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { setupVite } from "./vite.js";
import { registerRoutes } from "./routes.js";
console.log("[server] registerRoutes imported");
import { startSyncScheduler } from "./syncScheduler.js";
console.log("[server] syncScheduler imported");
import path from "path";
import { db } from "./db.js";
import { catalogImports } from "../shared/schema.js";
import { eq } from "drizzle-orm";

const app = express();
app.use(cors({ origin: "*" })); // Permite acesso do script de carrossel de qualquer origem (inclusive localhost)
const server = createServer(app);

// Stripe webhook needs raw body for signature verification – register BEFORE express.json()
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

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
console.log("[server] index.ts execution reached end");
