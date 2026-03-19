import fs from "fs";
import path from "path";
import { db } from "./db.js";
import { catalogImports } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { parseCatalogStream } from "./catalogParser.js";

let isProcessing = false;

export async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      const [job] = await db
        .select()
        .from(catalogImports)
        .where(eq(catalogImports.status, "pending"))
        .orderBy(catalogImports.createdAt)
        .limit(1);

      if (!job) {
        break; 
      }

      await db
        .update(catalogImports)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(catalogImports.id, job.id));

      try {
        if (!job.sourceUrl) throw new Error("URL de fonte inválida");
        
        // Start streaming the input file/URL
        let stream: NodeJS.ReadableStream;

        if (job.sourceType === "file") {
          const filePath = path.resolve("uploads", job.sourceUrl);
          if (!fs.existsSync(filePath)) {
            throw new Error(`Arquivo não encontrado: ${job.sourceUrl}`);
          }
          stream = fs.createReadStream(filePath);
        } else if (job.sourceType === "url") {
          const response = await fetch(job.sourceUrl);
          if (!response.ok || !response.body) {
            throw new Error(`Falha ao baixar URL HTTP ${response.status}`);
          }
          
          const { Readable } = await import("stream");
          stream = Readable.fromWeb(response.body as any);
        } else {
          throw new Error("Source type inválido.");
        }

        await parseCatalogStream(stream, job.id);
      } catch (err: any) {
        console.error("Queue job error:", err);
        await db
          .update(catalogImports)
          .set({ status: "failed", error: err.message || "Erro desconhecido", updatedAt: new Date() })
          .where(eq(catalogImports.id, job.id));
      }
    }
  } finally {
    isProcessing = false;
  }
}
