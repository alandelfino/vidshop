import sax from "sax";
import { db } from "./db.js";
import { products, catalogImports, NewProduct } from "../shared/schema.js";
import { eq, sql } from "drizzle-orm";

export async function parseCatalogStream(
  stream: NodeJS.ReadableStream,
  importId: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const parser = sax.createStream(true, { trim: false });
    
    let currentTag: string | null = null;
    let currentItem: Partial<NewProduct> | null = null;
    let currentText = "";
    
    let itemsBatch: NewProduct[] = [];
    const BATCH_SIZE = 50;
    let totalProcessed = 0;
    let activeDbInserts = 0;
    
    parser.on("opentag", (node) => {
      currentTag = node.name;
      currentText = "";
      if (node.name === "item") {
        currentItem = {};
      }
    });

    parser.on("text", (text) => {
      currentText += text;
    });
    
    parser.on("cdata", (text) => {
      currentText += text;
    });

    parser.on("closetag", async (tagName) => {
      if (currentItem) {
        const val = currentText.trim();
        switch (tagName) {
          case "g:id": currentItem.externalId = val; break;
          case "g:title": currentItem.title = val; break;
          case "g:description": currentItem.description = val; break;
          case "g:price": currentItem.price = val; break;
          case "g:image_link": currentItem.imageLink = val; break;
          case "g:link": currentItem.link = val; break;
          case "g:brand": currentItem.brand = val; break;
          case "g:availability": currentItem.availability = val; break;
          case "g:condition": currentItem.condition = val; break;
        }
      }

      if (tagName === "item" && currentItem && currentItem.externalId && currentItem.title) {
        itemsBatch.push(currentItem as NewProduct);
        currentItem = null;
        totalProcessed++;
        
        if (itemsBatch.length >= BATCH_SIZE) {
          const batchToInsert = [...itemsBatch];
          itemsBatch = [];
          
          activeDbInserts++;
          stream.pause(); 
          
          try {
            await db.insert(products)
              .values(batchToInsert)
              .onConflictDoUpdate({
                 target: products.externalId,
                 set: {
                   title: sql`excluded.title`,
                   description: sql`excluded.description`,
                   price: sql`excluded.price`,
                   imageLink: sql`excluded.image_link`,
                   link: sql`excluded.link`,
                   brand: sql`excluded.brand`,
                   availability: sql`excluded.availability`,
                   condition: sql`excluded.condition`,
                   updatedAt: new Date(),
                 }
              });
              
            await db.update(catalogImports)
              .set({ processedItems: totalProcessed })
              .where(eq(catalogImports.id, importId));
              
          } catch (e) {
            parser.emit("error", e);
          } finally {
            activeDbInserts--;
            if (activeDbInserts === 0) {
              stream.resume();
            }
          }
        }
      }
      currentText = "";
      currentTag = null;
    });

    parser.on("end", async () => {
      try {
        if (itemsBatch.length > 0) {
          await db.insert(products)
            .values(itemsBatch)
            .onConflictDoUpdate({
                 target: products.externalId,
                 set: {
                   title: sql`excluded.title`,
                   description: sql`excluded.description`,
                   price: sql`excluded.price`,
                   imageLink: sql`excluded.image_link`,
                   link: sql`excluded.link`,
                   brand: sql`excluded.brand`,
                   availability: sql`excluded.availability`,
                   condition: sql`excluded.condition`,
                   updatedAt: new Date(),
                 }
            });
        }
        await db.update(catalogImports)
          .set({ processedItems: totalProcessed, status: "completed" })
          .where(eq(catalogImports.id, importId));
        resolve();
      } catch (e) {
         reject(e);
      }
    });

    parser.on("error", (err) => {
      reject(err);
    });

    // Instead of stream.pipe(parser), we route events manually to prevent Node Streams internal bugs 
    // trying to call `.pause()` on the sax parser (which doesn't implement it).
    stream.on("data", (chunk) => {
      parser.write(chunk);
    });

    stream.on("end", () => {
      parser.end();
    });

    stream.on("error", (err) => {
      parser.emit("error", err);
    });
  });
}
