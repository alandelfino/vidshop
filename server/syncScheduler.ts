import { db } from "./db.js";
import { catalogSyncs, catalogImports } from "../shared/schema.js";
import { eq, and, lte } from "drizzle-orm";

export function startSyncScheduler() {
  // Executa uma vez por minuto para checar agendamentos pendentes
  setInterval(async () => {
    try {
      const pendingSyncs = await db.select()
        .from(catalogSyncs)
        .where(
          and(
            eq(catalogSyncs.isActive, true),
            lte(catalogSyncs.nextSyncAt, new Date())
          )
        );

      for (const sync of pendingSyncs) {
        // Enfileira a importação para o background worker (queue.ts) pegar
        await db.insert(catalogImports).values({
          sourceType: "url",
          sourceUrl: sync.url,
          status: "pending",
        });

        // Calcula a próxima data somando a frequência
        const nextDate = new Date(sync.nextSyncAt);
        nextDate.setDate(nextDate.getDate() + sync.frequencyDays);
        
        await db.update(catalogSyncs)
          .set({
            lastSyncAt: new Date(),
            nextSyncAt: nextDate,
          })
          .where(eq(catalogSyncs.id, sync.id));
      }
    } catch (e) {
      console.error("Erro no scheduler de sincronização:", e);
    }
  }, 60 * 1000); // 1 minuto
}
