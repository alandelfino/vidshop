var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/upload.ts
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import path2 from "path";
import { v4 as uuidv4 } from "uuid";
function fileFilter(_req, file, cb) {
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo n\xE3o permitido. Somente imagens e v\xEDdeos s\xE3o aceitos."));
  }
}
var R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, s3Client, storage, upload;
var init_upload = __esm({
  "server/upload.ts"() {
    "use strict";
    R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
    R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
      console.warn("Aviso: Credenciais do Cloudflare R2 n\xE3o est\xE3o totalmente configuradas no .env. O upload falhar\xE1.");
    }
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || "",
        secretAccessKey: R2_SECRET_ACCESS_KEY || ""
      }
    });
    storage = multerS3({
      s3: s3Client,
      bucket: R2_BUCKET || "",
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function(_req, file, cb) {
        const ext = path2.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
      }
    });
    upload = multer({
      storage,
      fileFilter,
      limits: { fileSize: 100 * 1024 * 1024 }
      // 100 MB
    });
  }
});

// server/ffmpeg.ts
var ffmpeg_exports = {};
__export(ffmpeg_exports, {
  extractFramesToR2: () => extractFramesToR2
});
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import fs3 from "fs/promises";
import path4 from "path";
import os from "os";
import { v4 as uuidv42 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
async function extractFramesToR2(videoUrl) {
  const tmpDir = await fs3.mkdtemp(path4.join(os.tmpdir(), "vidshop-frames-"));
  return new Promise((resolve, reject) => {
    ffmpeg(videoUrl).screenshots({
      count: 5,
      folder: tmpDir,
      filename: "thumbnail-at-%i.jpg",
      size: "640x?"
    }).on("end", async () => {
      try {
        const files = await fs3.readdir(tmpDir);
        const urls = [];
        const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
        const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
        if (!bucket)
          throw new Error("CLOUDFLARE_R2_BUCKET_NAME not set");
        for (const file of files) {
          const filePath = path4.join(tmpDir, file);
          const buffer = await fs3.readFile(filePath);
          const key = `thumbnails/${uuidv42()}.jpg`;
          await s3Client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: "image/jpeg"
          }));
          const finalUrl = publicDomain ? `${publicDomain.replace(/\/$/, "")}/${key}` : `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}/${key}`;
          urls.push(finalUrl);
        }
        for (const file of files) {
          await fs3.unlink(path4.join(tmpDir, file));
        }
        await fs3.rmdir(tmpDir);
        resolve(urls);
      } catch (e) {
        reject(e);
      }
    }).on("error", async (err) => {
      try {
        const files = await fs3.readdir(tmpDir).catch(() => []);
        for (const file of files)
          await fs3.unlink(path4.join(tmpDir, file)).catch(() => {
          });
        await fs3.rmdir(tmpDir).catch(() => {
        });
      } catch (e) {
      }
      reject(err);
    });
  });
}
var init_ffmpeg = __esm({
  "server/ffmpeg.ts"() {
    "use strict";
    init_upload();
    ffmpeg.setFfmpegPath(ffmpegInstaller.path || ffmpegInstaller.default?.path);
    ffmpeg.setFfprobePath(ffprobeInstaller.path || ffprobeInstaller.default?.path);
  }
});

// server/index.ts
import "express-async-errors";
import dotenv3 from "dotenv";
import express2 from "express";
import cors from "cors";
import { createServer } from "http";

// server/vite.ts
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
async function setupVite(app2, server2) {
  if (process.env.NODE_ENV === "development") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Vite não cria servidor próprio
        hmr: { server: server2 }
        // HMR usa o mesmo servidor HTTP
      },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "../../dist/public");
    if (!fs.existsSync(distPath)) {
      throw new Error(`Build n\xE3o encontrado em ${distPath}. Rode 'npm run build' primeiro.`);
    }
    app2.use(express.static(distPath));
    app2.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
}

// server/routes.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq as eq3, desc, ilike, or, sql as sql2, inArray, and } from "drizzle-orm";

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  carouselVideos: () => carouselVideos,
  catalogImports: () => catalogImports,
  catalogSyncs: () => catalogSyncs,
  media: () => media,
  products: () => products,
  shoppableVideos: () => shoppableVideos,
  stores: () => stores,
  users: () => users,
  videoCarousels: () => videoCarousels,
  videoProducts: () => videoProducts,
  viewEvents: () => viewEvents
});
import { pgTable, serial, text, integer, timestamp, boolean, unique, jsonb } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  verificationCode: text("verification_code"),
  verificationCodeExpiresAt: timestamp("verification_code_expires_at"),
  // Billing and Features
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  // active, past_due, canceled
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  allowedDomain: text("allowed_domain"),
  // Billing specific to this store
  plan: text("plan").notNull().default("free"),
  // free (trial/expired), pro, ultra, gold
  trialEndsAt: timestamp("trial_ends_at"),
  // set on store creation, expires after 14 days
  currentCycleViews: integer("current_cycle_views").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var media = pgTable("media", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }),
  filename: text("filename").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var products = pgTable("products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  // removed unique() because it will be unique per store
  title: text("title").notNull(),
  description: text("description"),
  price: text("price"),
  imageLink: text("image_link"),
  link: text("link"),
  brand: text("brand"),
  availability: text("availability"),
  condition: text("condition"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (t) => ({
  unq: unique("product_store_external_idx").on(t.storeId, t.externalId)
}));
var catalogImports = pgTable("catalog_imports", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  // 'file', 'url'
  sourceUrl: text("source_url"),
  status: text("status").notNull().default("pending"),
  // pending, processing, completed, failed
  processedItems: integer("processed_items").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
});
var catalogSyncs = pgTable("catalog_syncs", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  frequencyDays: integer("frequency_days").notNull(),
  syncTime: text("sync_time").notNull(),
  nextSyncAt: timestamp("next_sync_at").notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var shoppableVideos = pgTable("shoppable_videos", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }),
  mediaUrl: text("media_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  autoThumbnails: jsonb("auto_thumbnails").$type(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var videoProducts = pgTable("video_products", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => shoppableVideos.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  startTime: integer("start_time").notNull(),
  // in seconds
  endTime: integer("end_time").notNull()
  // in seconds
});
var videoCarousels = pgTable("video_carousels", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title"),
  subtitle: text("subtitle"),
  titleColor: text("title_color").notNull().default("#000000"),
  subtitleColor: text("subtitle_color").notNull().default("#666666"),
  layout: text("layout").notNull().default("3d-card"),
  showProducts: boolean("show_products").notNull().default(true),
  previewTime: integer("preview_time").notNull().default(3),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var carouselVideos = pgTable("carousel_videos", {
  id: serial("id").primaryKey(),
  carouselId: integer("carousel_id").references(() => videoCarousels.id, { onDelete: "cascade" }).notNull(),
  videoId: integer("video_id").references(() => shoppableVideos.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull().default(0)
});
var viewEvents = pgTable("view_events", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }).notNull(),
  carouselId: integer("carousel_id").references(() => videoCarousels.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(),
  // ISO date string: 'YYYY-MM-DD'
  count: integer("count").notNull().default(0)
}, (t) => ({
  unq: unique("view_events_store_carousel_date_idx").on(t.storeId, t.carouselId, t.date)
}));

// server/db.ts
import dotenv from "dotenv";
dotenv.config();
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/routes.ts
init_upload();

// server/email.ts
import { Resend } from "resend";
import dotenv2 from "dotenv";
dotenv2.config();
var resend = new Resend(process.env.RESEND_API_TOKEN);
async function sendVerificationEmail(to, code) {
  try {
    const data = await resend.emails.send({
      from: "VidShop <suporte@vidshop.com.br>",
      to: [to],
      subject: "VidShop - C\xF3digo de Verifica\xE7\xE3o",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Bem-vindo \xE0 VidShop!</h2>
          <p>Para ativar sua conta e come\xE7ar a gerenciar suas lojas, utilize o c\xF3digo de verifica\xE7\xE3o abaixo:</p>
          <div style="margin: 20px 0; padding: 15px; background: #f4f4f5; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 8px;">
            ${code}
          </div>
          <p>Este c\xF3digo \xE9 v\xE1lido pelas pr\xF3ximas 24 horas.</p>
        </div>
      `
    });
    return data;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    throw error;
  }
}

// server/routes.ts
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

// server/queue.ts
import fs2 from "fs";
import path3 from "path";
import { eq as eq2 } from "drizzle-orm";

// server/catalogParser.ts
import sax from "sax";
import { eq, sql } from "drizzle-orm";
async function parseCatalogStream(stream, importId, storeId) {
  return new Promise((resolve, reject) => {
    const parser = sax.createStream(true, { trim: false });
    let currentTag = null;
    let currentItem = null;
    let currentText = "";
    let itemsBatch = [];
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
    parser.on("text", (text2) => {
      currentText += text2;
    });
    parser.on("cdata", (text2) => {
      currentText += text2;
    });
    parser.on("closetag", async (tagName) => {
      if (currentItem) {
        const val = currentText.trim();
        switch (tagName) {
          case "g:id":
            currentItem.externalId = val;
            break;
          case "g:title":
            currentItem.title = val;
            break;
          case "g:description":
            currentItem.description = val;
            break;
          case "g:price":
            currentItem.price = val;
            break;
          case "g:image_link":
            currentItem.imageLink = val;
            break;
          case "g:link":
            currentItem.link = val;
            break;
          case "g:brand":
            currentItem.brand = val;
            break;
          case "g:availability":
            currentItem.availability = val;
            break;
          case "g:condition":
            currentItem.condition = val;
            break;
        }
      }
      if (tagName === "item" && currentItem && currentItem.externalId && currentItem.title) {
        currentItem.storeId = storeId;
        itemsBatch.push(currentItem);
        currentItem = null;
        totalProcessed++;
        if (itemsBatch.length >= BATCH_SIZE) {
          const batchToInsert = [...itemsBatch];
          itemsBatch = [];
          activeDbInserts++;
          stream.pause();
          try {
            await db.insert(products).values(batchToInsert).onConflictDoUpdate({
              target: [products.storeId, products.externalId],
              set: {
                title: sql`excluded.title`,
                description: sql`excluded.description`,
                price: sql`excluded.price`,
                imageLink: sql`excluded.image_link`,
                link: sql`excluded.link`,
                brand: sql`excluded.brand`,
                availability: sql`excluded.availability`,
                condition: sql`excluded.condition`,
                updatedAt: /* @__PURE__ */ new Date()
              }
            });
            await db.update(catalogImports).set({ processedItems: totalProcessed }).where(eq(catalogImports.id, importId));
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
          await db.insert(products).values(itemsBatch).onConflictDoUpdate({
            target: [products.storeId, products.externalId],
            set: {
              title: sql`excluded.title`,
              description: sql`excluded.description`,
              price: sql`excluded.price`,
              imageLink: sql`excluded.image_link`,
              link: sql`excluded.link`,
              brand: sql`excluded.brand`,
              availability: sql`excluded.availability`,
              condition: sql`excluded.condition`,
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
        }
        await db.update(catalogImports).set({ processedItems: totalProcessed, status: "completed" }).where(eq(catalogImports.id, importId));
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    parser.on("error", (err) => {
      reject(err);
    });
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

// server/queue.ts
var isProcessing = false;
async function processQueue() {
  if (isProcessing)
    return;
  isProcessing = true;
  try {
    while (true) {
      const [job] = await db.select().from(catalogImports).where(eq2(catalogImports.status, "pending")).orderBy(catalogImports.createdAt).limit(1);
      if (!job) {
        break;
      }
      await db.update(catalogImports).set({ status: "processing", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(catalogImports.id, job.id));
      try {
        if (!job.sourceUrl)
          throw new Error("URL de fonte inv\xE1lida");
        let stream;
        if (job.sourceType === "file") {
          const filePath = path3.resolve("uploads", job.sourceUrl);
          if (!fs2.existsSync(filePath)) {
            throw new Error(`Arquivo n\xE3o encontrado: ${job.sourceUrl}`);
          }
          stream = fs2.createReadStream(filePath);
        } else if (job.sourceType === "url") {
          const response = await fetch(job.sourceUrl);
          if (!response.ok || !response.body) {
            throw new Error(`Falha ao baixar URL HTTP ${response.status}`);
          }
          const { Readable } = await import("stream");
          stream = Readable.fromWeb(response.body);
        } else {
          throw new Error("Source type inv\xE1lido.");
        }
        if (!job.storeId)
          throw new Error("Store ID inv\xE1lido no job.");
        await parseCatalogStream(stream, job.id, job.storeId);
      } catch (err) {
        console.error("Queue job error:", err);
        await db.update(catalogImports).set({ status: "failed", error: err.message || "Erro desconhecido", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(catalogImports.id, job.id));
      }
    }
  } finally {
    isProcessing = false;
  }
}

// server/routes.ts
import multer2 from "multer";
import { v4 as uuidv43 } from "uuid";

// server/embed/styles.ts
var embedStyles = function injectStyles() {
  if (document.getElementById("vidshop-frc-styles"))
    return;
  var style = document.createElement("style");
  style.id = "vidshop-frc-styles";
  style.textContent = ".fashion-reels-carousel { width: 100%; overflow: hidden; display: flex; flex-direction: column; align-items: center; padding: 60px 0; padding-top: 0px; contain: layout paint style; background-color: transparent; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; } .fashion-reels-carousel * { box-sizing: border-box; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; } .fashion-reels-carousel .frc-carousel { position: relative; width: 100%; height: 500px; display: flex; align-items: center; justify-content: center; isolation: isolate; perspective: 1200px; } .fashion-reels-carousel .frc-slide { position: absolute; width: auto; height: 100%; aspect-ratio: 9 / 16; border-radius: 24px; overflow: hidden; opacity: 0; transform: translateX(0) scale(.8) rotateY(0deg); transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease, box-shadow 0.6s ease; will-change: transform, opacity; backface-visibility: hidden; -webkit-backface-visibility: hidden; background: #fff; pointer-events: none; box-shadow: 0 10px 30px rgba(0,0,0,0.1); } .fashion-reels-carousel .frc-slide video { width: 100%; height: 100%; object-fit: cover; display: block; background: #fff; transition: filter 0.6s ease; filter: brightness(0.6); } .fashion-reels-carousel .frc-slide.is-center { transform: translateX(0) scale(1) rotateY(0deg); opacity: 1; z-index: 5; pointer-events: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); } .fashion-reels-carousel .frc-slide.is-center video { filter: brightness(1); } .fashion-reels-carousel .frc-slide.is-left-1 { transform: translateX(-85%) scale(.85) rotateY(12deg); opacity: .8; z-index: 4; } .fashion-reels-carousel .frc-slide.is-right-1 { transform: translateX(85%) scale(.85) rotateY(-12deg); opacity: .8; z-index: 4; } .fashion-reels-carousel .frc-slide.is-left-2 { transform: translateX(-160%) scale(.7) rotateY(20deg); opacity: .4; z-index: 3; } .fashion-reels-carousel .frc-slide.is-right-2 { transform: translateX(160%) scale(.7) rotateY(-20deg); opacity: .4; z-index: 3; } .fashion-reels-carousel .frc-slide.is-hidden-left { transform: translateX(-220%) scale(.6) rotateY(25deg); opacity: 0; z-index: 1; } .fashion-reels-carousel .frc-slide.is-hidden-right { transform: translateX(220%) scale(.6) rotateY(-25deg); opacity: 0; z-index: 1; } @media (max-width: 900px) { .fashion-reels-carousel .frc-carousel { height: 450px; } } @media (max-width: 600px) {   .fashion-reels-carousel { padding: 50px 0; }   .fashion-reels-carousel .frc-carousel { height: calc(76vw * 16 / 9); max-height: 85vh; min-height: 380px; perspective: 800px; }   .fashion-reels-carousel .frc-slide { width: 76%; max-width: calc(85vh * 9 / 16); height: auto; aspect-ratio: 9 / 16; border-radius: 18px; }   .fashion-reels-carousel .frc-slide.is-left-1 { transform: translateX(-65%) scale(.85) rotateY(20deg); opacity: 0.9; }   .fashion-reels-carousel .frc-slide.is-right-1 { transform: translateX(65%) scale(.85) rotateY(-20deg); opacity: 0.9; }   .fashion-reels-carousel .frc-slide.is-left-2 { transform: translateX(-110%) scale(.7) rotateY(30deg); opacity: 0.5; }   .fashion-reels-carousel .frc-slide.is-right-2 { transform: translateX(110%) scale(.7) rotateY(-30deg); opacity: 0.5; }   .fashion-reels-carousel .frc-slide.is-hidden-left { transform: translateX(-160%) scale(.6) rotateY(35deg); opacity: 0; }   .fashion-reels-carousel .frc-slide.is-hidden-right { transform: translateX(160%) scale(.6) rotateY(-35deg); opacity: 0; } } @media (prefers-reduced-motion: reduce) { .fashion-reels-carousel .frc-slide { transition: none; } } .fashion-reels-carousel .frc-controls { position: absolute; top: 8px; right: 8px; display: flex; flex-direction: column; gap: 8px; opacity: 0; transition: opacity 0.3s ease; z-index: 10; pointer-events: none; } .fashion-reels-carousel .frc-slide.is-center .frc-controls { opacity: 1; pointer-events: auto; } .fashion-reels-carousel .frc-btn { background: transparent; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: background 0.2s, transform 0.2s; } .fashion-reels-carousel .frc-btn:active { transform: scale(0.9); } .fashion-reels-carousel .frc-btn:hover { background: rgba(0, 0, 0, 0.7); } .fashion-reels-carousel .frc-btn svg { width: 20px; height: 20px; } .vidshop-slider-carousel { width: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px 0; font-family: inherit; -webkit-user-select: none; user-select: none; } .vidshop-slider-track { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 16px 20px; width: 100%; scrollbar-width: none; -webkit-overflow-scrolling: touch; } .vidshop-slider-track::-webkit-scrollbar { display: none; } .vidshop-slider-slide { position: relative; flex: 0 0 calc(16.666% - 13.33px); aspect-ratio: 9/16; border-radius: 16px; overflow: hidden; scroll-snap-align: start; background: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.1); isolation: isolate; cursor: pointer; } @media (max-width: 1400px) { .vidshop-slider-slide { flex: 0 0 calc(20% - 12.8px); } } @media (max-width: 1100px) { .vidshop-slider-slide { flex: 0 0 calc(25% - 12px); } } @media (max-width: 900px) { .vidshop-slider-slide { flex: 0 0 calc(40% - 13px); } } @media (max-width: 600px) {   .vidshop-slider-track { padding: 12px 5%; gap: 12px; }   .vidshop-slider-slide { flex: 0 0 82%; scroll-snap-align: center; border-radius: 12px; } } .vidshop-slider-slide video { width: 100%; height: 100%; object-fit: cover; display: block; } .vidshop-slider-play-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); z-index: 10; pointer-events: none; opacity: 1; transition: opacity 0.3s; } .vidshop-slider-slide.is-playing .vidshop-slider-play-overlay { opacity: 0; } .vidshop-slider-play-overlay svg { width: 48px; height: 48px; fill: white; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); } .fashion-reels-carousel .frc-product-card, .vidshop-slider-slide .frc-product-card { position: absolute; bottom: 20px; left: 16px; right: 16px; border-radius: 12px; padding: 10px; display: flex; align-items: center; gap: 12px; color: #fff; z-index: 20; opacity: 0; pointer-events: none; transition: opacity 0.3s ease, transform 0.3s ease; transform: translateY(10px); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.15); background: transparent; } .fashion-reels-carousel .frc-product-card.is-active, .vidshop-slider-slide .frc-product-card.is-active { opacity: 1; pointer-events: auto; transform: translateY(0); } .fashion-reels-carousel .frc-product-img, .vidshop-slider-slide .frc-product-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; background: #fff; flex-shrink: 0; } .fashion-reels-carousel .frc-product-info, .vidshop-slider-slide .frc-product-info { flex: 1; min-width: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: center; } .fashion-reels-carousel .frc-product-title, .vidshop-slider-slide .frc-product-title { margin: 0 0 2px 0; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; font-family: sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.5); } .fashion-reels-carousel .frc-product-price, .vidshop-slider-slide .frc-product-price { margin: 0; font-size: 14px; font-weight: 700; color: #fff; font-family: sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.5); } .fashion-reels-carousel .frc-product-btn, .vidshop-slider-slide .frc-product-btn { width: auto; height: auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; flex-shrink: 0; transition: transform 0.2s; color: #fff; padding: 3px; } .fashion-reels-carousel .frc-product-btn:hover, .vidshop-slider-slide .frc-product-btn:hover { transform: scale(1.05); } .fashion-reels-carousel .frc-product-btn svg, .vidshop-slider-slide .frc-product-btn svg { width: 16px; height: 16px; stroke-width: 2.5; } @media (max-width: 600px) {   .fashion-reels-carousel .frc-product-card, .vidshop-slider-slide .frc-product-card { bottom: 12px; left: 10px; right: 10px; padding: 8px; gap: 8px; border-radius: 10px; }   .fashion-reels-carousel .frc-product-img, .vidshop-slider-slide .frc-product-img { width: 36px; height: 36px; border-radius: 6px; }   .fashion-reels-carousel .frc-product-title, .vidshop-slider-slide .frc-product-title { font-size: 11px; margin-bottom: 2px; }   .fashion-reels-carousel .frc-product-price, .vidshop-slider-slide .frc-product-price { font-size: 13px; }   .fashion-reels-carousel .frc-product-btn svg, .vidshop-slider-slide .frc-product-btn svg { width: 14px; height: 14px; } }";
  document.head.appendChild(style);
};

// server/embed/layout-3d-card.ts
var layout3DCard = function build3DCard(el, data) {
  var originalVideos = data.videos || [];
  if (!originalVideos.length)
    return;
  var videos = [];
  if (originalVideos.length < 6 && originalVideos.length > 0) {
    var i = 0;
    while (videos.length < 6) {
      videos.push(originalVideos[i % originalVideos.length]);
      i++;
    }
  } else {
    videos = originalVideos;
  }
  el.classList.add("fashion-reels-carousel");
  el.setAttribute("data-autoplay", "6000");
  var headerHtml = "";
  if (data.carousel.title || data.carousel.subtitle) {
    headerHtml += '<div style="text-align: center; margin-bottom: 24px; padding: 0 16px; width: 100%;">';
    if (data.carousel.title) {
      headerHtml += '<h2 style="margin: 0 0 8px 0; font-family: inherit; font-size: 28px; font-weight: 700; color: ' + escAttr(data.carousel.titleColor || "#000000") + ';">' + escAttr(data.carousel.title) + "</h2>";
    }
    if (data.carousel.subtitle) {
      headerHtml += '<p style="margin: 0; font-family: inherit; font-size: 16px; color: ' + escAttr(data.carousel.subtitleColor || "#666666") + ';">' + escAttr(data.carousel.subtitle) + "</p>";
    }
    headerHtml += "</div>";
  }
  var html = headerHtml + '<div class="frc-carousel">';
  videos.forEach(function(v) {
    html += '<div class="frc-slide">';
    html += '<video muted playsinline loop preload="metadata" poster="' + (v.thumbnailUrl ? escAttr(v.thumbnailUrl) : "") + '">';
    html += '<source src="' + escAttr(v.mediaUrl) + '" type="video/mp4">';
    html += "</video>";
    if (data.carousel.showProducts && v.productsList && v.productsList.length > 0) {
      v.productsList.forEach(function(p) {
        var priceHtml = p.price ? '<p class="frc-product-price">' + escAttr(p.price) + "</p>" : "";
        var imgHtml = p.imageLink ? '<img class="frc-product-img" src="' + escAttr(p.imageLink) + '" alt=""/>' : '<div class="frc-product-img" style="background: #333;"></div>';
        var cartIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
        var link = p.link ? escAttr(p.link) : "#";
        html += '<div class="frc-product-card" data-start="' + p.startTime + '" data-end="' + p.endTime + '">' + imgHtml + '<div class="frc-product-info"><h3 class="frc-product-title">' + escAttr(p.title) + "</h3>" + priceHtml + '</div><a href="' + link + '" target="_blank" class="frc-product-btn" aria-label="Comprar">' + cartIcon + "</a></div>";
      });
    }
    html += "</div>";
  });
  html += "</div>";
  el.innerHTML = html;
  init3DCardLogic(el);
  function init3DCardLogic(root) {
    if (root.dataset.frcInitialized === "true")
      return;
    root.dataset.frcInitialized = "true";
    var slides = Array.from(root.querySelectorAll(".frc-slide"));
    var videos2 = slides.map(function(slide) {
      return slide.querySelector("video");
    });
    var autoplayDelay = Number(root.dataset.autoplay || 6e3);
    videos2.forEach(function(video, index) {
      var slide = slides[index];
      var productCards = Array.from(slide.querySelectorAll(".frc-product-card"));
      if (!productCards.length)
        return;
      video.addEventListener("timeupdate", function() {
        var ct = video.currentTime;
        productCards.forEach(function(card) {
          var start = Number(card.dataset.start);
          var end = Number(card.dataset.end);
          if (ct >= start && ct <= end) {
            if (!card.classList.contains("is-active"))
              card.classList.add("is-active");
          } else {
            if (card.classList.contains("is-active"))
              card.classList.remove("is-active");
          }
        });
      });
    });
    var current = Math.floor(slides.length / 2);
    var timer = null;
    var isVisible = false;
    var isPageVisible = !document.hidden;
    var lastCurrent = -1;
    var isManualPause = false;
    var touchStartX = 0;
    var touchEndX = 0;
    function getOffset(index, active, total) {
      var offset = index - active;
      if (offset > total / 2)
        offset -= total;
      if (offset < -total / 2)
        offset += total;
      return offset;
    }
    function applyClasses() {
      var total = slides.length;
      slides.forEach(function(slide, index) {
        slide.className = "frc-slide";
        var offset = getOffset(index, current, total);
        if (offset === 0)
          slide.classList.add("is-center");
        else if (offset === -1)
          slide.classList.add("is-left-1");
        else if (offset === 1)
          slide.classList.add("is-right-1");
        else if (offset === -2)
          slide.classList.add("is-left-2");
        else if (offset === 2)
          slide.classList.add("is-right-2");
        else if (offset < 0)
          slide.classList.add("is-hidden-left");
        else
          slide.classList.add("is-hidden-right");
      });
    }
    function pauseAllVideos() {
      videos2.forEach(function(video) {
        try {
          video.pause();
        } catch (e) {
        }
      });
    }
    function playCurrentVideo() {
      if (isManualPause) {
        pauseAllVideos();
        return;
      }
      videos2.forEach(function(video, index) {
        if (index === current && isVisible && isPageVisible) {
          if (lastCurrent !== current) {
            try {
              video.currentTime = 0;
            } catch (e) {
            }
          }
          var playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function() {
            });
          }
        } else {
          try {
            video.pause();
          } catch (e) {
          }
        }
      });
      lastCurrent = current;
    }
    function update() {
      isManualPause = false;
      applyClasses();
      playCurrentVideo();
    }
    function next() {
      current = (current + 1) % slides.length;
      update();
    }
    function prev() {
      current = (current - 1 + slides.length) % slides.length;
      update();
    }
    function startTimer() {
      if (timer || !isVisible || !isPageVisible || isManualPause)
        return;
      timer = window.setInterval(next, autoplayDelay);
    }
    function stopTimer() {
      if (!timer)
        return;
      window.clearInterval(timer);
      timer = null;
    }
    function resetTimer() {
      stopTimer();
      startTimer();
    }
    if (window.IntersectionObserver) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          isVisible = entry.isIntersecting && entry.intersectionRatio > 0.2;
          if (isVisible) {
            if (!isManualPause) {
              update();
              startTimer();
            }
          } else {
            stopTimer();
            pauseAllVideos();
          }
        });
      }, { threshold: [0, 0.2, 0.6] });
      observer.observe(root);
    } else {
      isVisible = true;
    }
    document.addEventListener("visibilitychange", function() {
      isPageVisible = !document.hidden;
      if (isPageVisible && isVisible) {
        if (!isManualPause) {
          playCurrentVideo();
          startTimer();
        }
      } else {
        stopTimer();
        pauseAllVideos();
      }
    });
    var touchStartY = 0;
    var isSwipingHorizontal = null;
    root.addEventListener("touchstart", function(e) {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      isSwipingHorizontal = null;
      root.dataset.isDragging = "true";
    }, { passive: true });
    root.addEventListener("touchmove", function(e) {
      if (!root.dataset.isDragging)
        return;
      var touchCurrentX = e.changedTouches[0].screenX;
      var touchCurrentY = e.changedTouches[0].screenY;
      var dx = Math.abs(touchCurrentX - touchStartX);
      var dy = Math.abs(touchCurrentY - touchStartY);
      if (isSwipingHorizontal === null) {
        if (dx > dy && dx > 5)
          isSwipingHorizontal = true;
        else if (dy > dx && dy > 5)
          isSwipingHorizontal = false;
      }
      if (isSwipingHorizontal) {
        if (e.cancelable)
          e.preventDefault();
      }
    }, { passive: false });
    root.addEventListener("touchend", function(e) {
      root.dataset.isDragging = "";
      if (isSwipingHorizontal === false)
        return;
      touchEndX = e.changedTouches[0].screenX;
      var swipeThreshold = 40;
      if (touchEndX < touchStartX - swipeThreshold) {
        next();
        resetTimer();
      } else if (touchEndX > touchStartX + swipeThreshold) {
        prev();
        resetTimer();
      }
    }, { passive: true });
    var isDragging = false;
    var mouseStart = 0;
    root.addEventListener("mousedown", function(e) {
      isDragging = true;
      mouseStart = e.screenX;
    });
    root.addEventListener("mouseup", function(e) {
      if (!isDragging)
        return;
      isDragging = false;
      var touchEnd = e.screenX;
      var swipeThreshold = 40;
      if (touchEnd < mouseStart - swipeThreshold) {
        next();
        resetTimer();
      } else if (touchEnd > mouseStart + swipeThreshold) {
        prev();
        resetTimer();
      }
      root.dataset.lastDragDist = Math.abs(touchEnd - mouseStart);
      setTimeout(function() {
        root.dataset.lastDragDist = "0";
      }, 50);
    });
    root.addEventListener("mouseleave", function() {
      isDragging = false;
    });
    videos2.forEach(function(video, index) {
      video.muted = true;
      video.addEventListener("play", function() {
        var slide = slides[index];
        var playBtn = slide.querySelector(".frc-play-btn");
        if (playBtn) {
          playBtn.querySelector(".icon-pause").style.display = "block";
          playBtn.querySelector(".icon-play").style.display = "none";
        }
      });
      video.addEventListener("pause", function() {
        var slide = slides[index];
        var playBtn = slide.querySelector(".frc-play-btn");
        if (playBtn) {
          playBtn.querySelector(".icon-pause").style.display = "none";
          playBtn.querySelector(".icon-play").style.display = "block";
        }
      });
      video.addEventListener("volumechange", function() {
        var slide = slides[index];
        var muteBtn = slide.querySelector(".frc-mute-btn");
        if (muteBtn) {
          muteBtn.querySelector(".icon-mute").style.display = video.muted ? "block" : "none";
          muteBtn.querySelector(".icon-unmute").style.display = video.muted ? "none" : "block";
        }
      });
    });
    slides.forEach(function(slide, index) {
      var controls = document.createElement("div");
      controls.className = "frc-controls";
      controls.innerHTML = [
        '<button class="frc-btn frc-mute-btn" aria-label="Mute/Unmute">',
        '    <svg class="icon-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
        '    <svg class="icon-unmute" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
        "</button>",
        '<button class="frc-btn frc-play-btn" aria-label="Play/Pause">',
        '    <svg class="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
        '    <svg class="icon-play" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
        "</button>"
      ].join("");
      slide.appendChild(controls);
      var video = videos2[index];
      var muteBtn = controls.querySelector(".frc-mute-btn");
      var playBtn = controls.querySelector(".frc-play-btn");
      muteBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        var setMuted = !video.muted;
        videos2.forEach(function(v) {
          v.muted = setMuted;
        });
      });
      playBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        if (video.paused) {
          isManualPause = false;
          video.play();
          startTimer();
        } else {
          isManualPause = true;
          video.pause();
          stopTimer();
        }
      });
      slide.addEventListener("click", function(e) {
        if (Number(root.dataset.lastDragDist) > 40)
          return;
        if (index === current) {
          var setMuted = !video.muted;
          videos2.forEach(function(v) {
            v.muted = setMuted;
          });
        } else {
          current = index;
          update();
          resetTimer();
        }
      });
    });
    update();
  }
};

// server/embed/layout-slider.ts
var layoutSlider = function buildSlider(el, data) {
  var videos = data.videos || [];
  if (!videos.length)
    return;
  if (videos.length < 6) {
    var original = videos.slice();
    while (videos.length < 6) {
      videos = videos.concat(original);
    }
  }
  var previewTime = data.carousel.previewTime || 3;
  var uid = "vslider-" + Math.floor(Math.random() * 1e6);
  el.classList.add("vidshop-slider-carousel", uid);
  el.setAttribute("data-preview-time", String(previewTime * 1e3));
  var headerHtml = "";
  if (data.carousel.title || data.carousel.subtitle) {
    headerHtml += '<div style="text-align: center; margin-bottom: 24px; padding: 0 16px; width: 100%;">';
    if (data.carousel.title) {
      headerHtml += '<h2 style="margin: 0 0 8px 0; font-family: inherit; font-size: 28px; font-weight: 700; color: ' + escAttr(data.carousel.titleColor || "#000000") + ';">' + escAttr(data.carousel.title) + "</h2>";
    }
    if (data.carousel.subtitle) {
      headerHtml += '<p style="margin: 0; font-family: inherit; font-size: 16px; color: ' + escAttr(data.carousel.subtitleColor || "#666666") + ';">' + escAttr(data.carousel.subtitle) + "</p>";
    }
    headerHtml += "</div>";
  }
  var playIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  var html = headerHtml + '<div class="vidshop-slider-track">';
  videos.forEach(function(v) {
    html += '<div class="vidshop-slider-slide">';
    html += '<video loop playsinline preload="metadata" poster="' + (v.thumbnailUrl ? escAttr(v.thumbnailUrl) : "") + '">';
    html += '<source src="' + escAttr(v.mediaUrl) + '" type="video/mp4">';
    html += "</video>";
    html += '<div class="vidshop-slider-play-overlay">' + playIcon + "</div>";
    if (data.carousel.showProducts && v.productsList && v.productsList.length > 0) {
      v.productsList.forEach(function(p) {
        var priceHtml = p.price ? '<p class="frc-product-price">' + escAttr(p.price) + "</p>" : "";
        var imgHtml = p.imageLink ? '<img class="frc-product-img" src="' + escAttr(p.imageLink) + '" alt=""/>' : '<div class="frc-product-img" style="background: #333;"></div>';
        var cartIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
        var link = p.link ? escAttr(p.link) : "#";
        html += '<div class="frc-product-card" data-start="' + p.startTime + '" data-end="' + p.endTime + '">' + imgHtml + '<div class="frc-product-info"><h3 class="frc-product-title">' + escAttr(p.title) + "</h3>" + priceHtml + '</div><a href="' + link + '" target="_blank" class="frc-product-btn" aria-label="Comprar">' + cartIcon + "</a></div>";
      });
    }
    html += "</div>";
  });
  html += "</div>";
  el.innerHTML = html;
  initSliderLogic(el);
  function initSliderLogic(root) {
    if (root.dataset.vsSliderInitialized === "true")
      return;
    root.dataset.vsSliderInitialized = "true";
    var slides = Array.from(root.querySelectorAll(".vidshop-slider-slide"));
    var videos2 = slides.map(function(s) {
      return s.querySelector("video");
    });
    var track = root.querySelector(".vidshop-slider-track");
    var previewTime2 = Number(root.dataset.previewTime || 3e3);
    var isManualPause = false;
    var currentPreview = -1;
    var previewTimer = null;
    var observer = null;
    function playPreview(index) {
      if (isManualPause)
        return;
      if (currentPreview !== -1 && videos2[currentPreview]) {
        videos2[currentPreview].pause();
        slides[currentPreview].classList.remove("is-playing");
      }
      currentPreview = index;
      var video = videos2[currentPreview];
      var slide = slides[currentPreview];
      if (!video)
        return;
      video.muted = true;
      video.currentTime = 0;
      var p = video.play();
      if (p && p.catch)
        p.catch(function() {
        });
      slide.classList.add("is-playing");
      clearTimeout(previewTimer);
      previewTimer = setTimeout(function() {
        var nextIndex = (currentPreview + 1) % videos2.length;
        var nextSlide = slides[nextIndex];
        var slideWidth = nextSlide.offsetWidth + 16;
        var maxScroll = track.scrollWidth - track.clientWidth;
        var targetScroll = nextSlide.offsetLeft - track.offsetLeft;
        if (targetScroll > maxScroll || nextIndex === 0) {
          track.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          track.scrollTo({ left: targetScroll, behavior: "smooth" });
        }
        setTimeout(function() {
          playPreview(nextIndex);
        }, 400);
      }, previewTime2);
    }
    if (window.IntersectionObserver) {
      observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            if (!isManualPause && currentPreview === -1) {
              playPreview(0);
            }
          } else {
            clearTimeout(previewTimer);
            if (currentPreview !== -1 && videos2[currentPreview]) {
              videos2[currentPreview].pause();
            }
            currentPreview = -1;
          }
        });
      }, { threshold: 0.3 });
      observer.observe(root);
    } else {
      setTimeout(function() {
        playPreview(0);
      }, 500);
    }
    videos2.forEach(function(video, index) {
      var slide = slides[index];
      var productCards = Array.from(slide.querySelectorAll(".frc-product-card"));
      if (productCards.length > 0) {
        video.addEventListener("timeupdate", function() {
          var ct = video.currentTime;
          productCards.forEach(function(card) {
            var start = Number(card.dataset.start);
            var end = Number(card.dataset.end);
            if (ct >= start && ct <= end) {
              if (!card.classList.contains("is-active"))
                card.classList.add("is-active");
            } else {
              if (card.classList.contains("is-active"))
                card.classList.remove("is-active");
            }
          });
        });
      }
      slide.addEventListener("click", function(e) {
        if (e.target.closest(".frc-product-card"))
          return;
        isManualPause = true;
        clearTimeout(previewTimer);
        if (video.paused) {
          videos2.forEach(function(v) {
            if (v !== video)
              v.pause();
          });
          slides.forEach(function(s) {
            if (s !== slide)
              s.classList.remove("is-playing");
          });
          video.muted = false;
          var p = video.play();
          if (p && p.catch)
            p.catch(function() {
            });
          slide.classList.add("is-playing");
        } else {
          video.pause();
          slide.classList.remove("is-playing");
        }
      });
      video.addEventListener("ended", function() {
        video.currentTime = 0;
        if (isManualPause) {
          var p = video.play();
          if (p && p.catch)
            p.catch(function() {
            });
          slide.classList.add("is-playing");
        }
      });
    });
  }
};

// server/public-script.ts
var publicScript = `
(function() {
  var API_ORIGIN = "__API_ORIGIN__";

  function escAttr(s) { return String(s).replace(/"/g,"&quot;"); }
  var __name = function(n, t) { return n; };

${embedStyles}

${layout3DCard}

${layoutSlider}

  function buildCarousel(el, data) {
    var layout = data.carousel.layout || "3d-card";
    if (layout === "3d-card") {
      build3DCard(el, data);
    } else if (layout === "slider") {
      buildSlider(el, data);
    } else {
      console.warn("[Vidshop] Modelo de carrossel n\xE3o suportado:", layout);
    }
  }

  function init() {
    injectStyles();
    var els = document.querySelectorAll("[data-vidshop-carousel], [data-onstore-carousel]");
    els.forEach(function(el) {
      var cid = el.getAttribute("data-vidshop-carousel") || el.getAttribute("data-onstore-carousel");
      if (!cid || el.dataset.vidshopLoaded) return;
      el.dataset.vidshopLoaded = "1";
      fetch(API_ORIGIN + "/api/public/carousels/" + cid)
        .then(function(r) { return r.json(); })
        .then(function(data) { buildCarousel(el, data); })
        .catch(function(e) { console.warn("[Vidshop] Erro carrossel #" + cid, e); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`;

// server/cloudflare-purge.ts
async function purgeCloudflareCache(urls) {
  if (!urls.length)
    return;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!zoneId || !token) {
    console.warn("Cloudflare purge skipped: CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not set in .env");
    return;
  }
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ files: urls })
    });
    if (!response.ok) {
      const data = await response.json();
      console.error("Cloudflare purge error:", data);
    } else {
      console.log("Cloudflare cache purged for:", urls);
    }
  } catch (e) {
    console.error("Cloudflare purge request failed:", e);
  }
}

// server/stripe.ts
import Stripe from "stripe";
var stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
var stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16"
});
var PLANS = {
  pro: {
    name: "Pro",
    price: 3990,
    // cents
    priceId: process.env.STRIPE_PRICE_ID_PRO || "price_pro_dummy",
    maxCarousels: 2,
    maxVideos: 50,
    maxViews: 1e4
  },
  ultra: {
    name: "Ultra",
    price: 9990,
    priceId: process.env.STRIPE_PRICE_ID_ULTRA || "price_ultra_dummy",
    maxCarousels: Infinity,
    maxVideos: Infinity,
    maxViews: 5e4
  },
  gold: {
    name: "Gold",
    price: 29990,
    priceId: process.env.STRIPE_PRICE_ID_GOLD || "price_gold_dummy",
    maxCarousels: Infinity,
    maxVideos: Infinity,
    maxViews: Infinity
  }
};
var TRIAL_LIMITS = {
  name: "Trial",
  maxCarousels: 2,
  maxVideos: 50,
  maxViews: 1e4
};

// server/view-tracker.ts
var DEBOUNCE_MS = 6e4;
var cache = /* @__PURE__ */ new Map();
function shouldCountView(carouselId, ip) {
  const key = `${carouselId}:${ip}`;
  const now = Date.now();
  const expiresAt = cache.get(key);
  if (expiresAt && now < expiresAt)
    return false;
  cache.set(key, now + DEBOUNCE_MS);
  return true;
}
function todayUTC() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
setInterval(() => {
  const now = Date.now();
  for (const [key, exp] of cache.entries()) {
    if (now >= exp)
      cache.delete(key);
  }
}, 5 * 6e4).unref();

// server/routes.ts
var JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
var xmlUpload = multer2({
  storage: multer2.diskStorage({
    destination: "uploads",
    filename: (_req, file, cb) => cb(null, `${uuidv43()}.xml`)
  }),
  limits: { fileSize: 1024 * 1024 * 500 }
  // 500MB limit for massive catalogs
});
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token n\xE3o fornecido" });
    return;
  }
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inv\xE1lido ou expirado" });
  }
}
function registerRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email e password s\xE3o obrigat\xF3rios" });
      return;
    }
    const existing = await db.select().from(users).where(eq3(users.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "E-mail j\xE1 cadastrado" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const verificationCode = Math.floor(1e5 + Math.random() * 9e5).toString();
    const verificationCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    const [user] = await db.insert(users).values({ name, email, passwordHash, verificationCode, verificationCodeExpiresAt, isEmailVerified: false }).returning({ id: users.id, name: users.name, email: users.email });
    try {
      await sendVerificationEmail(email, verificationCode);
    } catch (e) {
      console.error("Failed to send verification email during register", e);
    }
    res.status(201).json({ message: "Registration successful. Please verify your email.", user });
  });
  app2.post("/api/auth/verify", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ error: "E-mail e c\xF3digo s\xE3o obrigat\xF3rios." });
    const [user] = await db.select().from(users).where(eq3(users.email, email)).limit(1);
    if (!user)
      return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    if (user.isEmailVerified)
      return res.status(400).json({ error: "E-mail j\xE1 verificado." });
    if (user.verificationCode !== code)
      return res.status(400).json({ error: "C\xF3digo inv\xE1lido." });
    if (user.verificationCodeExpiresAt && /* @__PURE__ */ new Date() > user.verificationCodeExpiresAt) {
      return res.status(400).json({ error: "C\xF3digo expirado." });
    }
    await db.update(users).set({ isEmailVerified: true, verificationCode: null, verificationCodeExpiresAt: null }).where(eq3(users.id, user.id));
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });
  app2.post("/api/auth/resend", async (req, res) => {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ error: "E-mail \xE9 obrigat\xF3rio." });
    const [user] = await db.select().from(users).where(eq3(users.email, email)).limit(1);
    if (!user)
      return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    if (user.isEmailVerified)
      return res.status(400).json({ error: "E-mail j\xE1 verificado." });
    const verificationCode = Math.floor(1e5 + Math.random() * 9e5).toString();
    const verificationCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    await db.update(users).set({ verificationCode, verificationCodeExpiresAt }).where(eq3(users.id, user.id));
    try {
      await sendVerificationEmail(email, verificationCode);
    } catch (e) {
      console.error("Failed to resend verification email", e);
    }
    res.json({ success: true, message: "C\xF3digo reenviado com sucesso." });
  });
  app2.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email e password s\xE3o obrigat\xF3rios" });
      return;
    }
    const [user] = await db.select().from(users).where(eq3(users.email, email)).limit(1);
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      res.status(401).json({ error: "Credenciais inv\xE1lidas" });
      return;
    }
    if (!user.isEmailVerified) {
      res.status(403).json({ error: "Por favor, verifique seu e-mail antes de fazer login.", unverified: true });
      return;
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d"
    });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });
  app2.get("/api/auth/me", authMiddleware, async (req, res) => {
    const payload = req.user;
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      subscriptionStatus: users.subscriptionStatus
    }).from(users).where(eq3(users.id, payload.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
      return;
    }
    res.json({ user });
  });
  app2.get("/api/stores", authMiddleware, async (req, res) => {
    const payload = req.user;
    const myStores = await db.select().from(stores).where(eq3(stores.ownerId, payload.userId)).orderBy(desc(stores.createdAt));
    res.json({ stores: myStores });
  });
  app2.post("/api/stores", authMiddleware, async (req, res) => {
    const payload = req.user;
    const { name, allowedDomain } = req.body;
    if (!name || !allowedDomain)
      return res.status(400).json({ error: "Nome da loja e dom\xEDnio s\xE3o obrigat\xF3rios" });
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3);
    const [store] = await db.insert(stores).values({ name, allowedDomain, plan: "free", trialEndsAt, ownerId: payload.userId }).returning();
    res.status(201).json({ store });
  });
  app2.put("/api/stores/:id", authMiddleware, async (req, res) => {
    const payload = req.user;
    const storeId = parseInt(req.params.id);
    const { name, allowedDomain } = req.body;
    if (!name || !allowedDomain)
      return res.status(400).json({ error: "Nome da loja e dom\xEDnio s\xE3o obrigat\xF3rios" });
    const [existing] = await db.select().from(stores).where(and(eq3(stores.id, storeId), eq3(stores.ownerId, payload.userId))).limit(1);
    if (!existing)
      return res.status(404).json({ error: "Loja n\xE3o encontrada ou acesso negado." });
    const [store] = await db.update(stores).set({ name, allowedDomain, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(stores.id, storeId)).returning();
    res.json({ store });
  });
  function getStoreId(req) {
    const storeId = req.headers["x-store-id"];
    if (!storeId)
      throw new Error("x-store-id header is missing");
    return parseInt(storeId);
  }
  app2.post(
    "/api/media/upload",
    authMiddleware,
    (req, res, next) => {
      upload.single("file")(req, res, (err) => {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        next();
      });
    },
    async (req, res) => {
      const storeId = getStoreId(req);
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Nenhum arquivo enviado." });
        return;
      }
      const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
      const url = publicDomain ? `${publicDomain}/${file.key}` : file.location;
      const [inserted] = await db.insert(media).values({
        storeId,
        filename: file.key,
        // multer-s3 uses 'key' instead of 'filename'
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url
      }).returning();
      res.status(201).json({ media: inserted });
    }
  );
  app2.get("/api/media", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const items = await db.select().from(media).where(eq3(media.storeId, storeId)).orderBy(desc(media.createdAt));
    res.json({ media: items });
  });
  app2.delete("/api/media/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inv\xE1lido" });
      return;
    }
    const [item] = await db.select().from(media).where(and(eq3(media.id, id), eq3(media.storeId, storeId))).limit(1);
    if (!item) {
      res.status(404).json({ error: "M\xEDdia n\xE3o encontrada" });
      return;
    }
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: item.filename
          // we stored the S3 key in the filename col
        })
      );
    } catch (error) {
      console.error("Erro ao deletar arquivo do R2:", error);
    }
    await db.delete(media).where(and(eq3(media.id, id), eq3(media.storeId, storeId)));
    res.json({ success: true });
  });
  app2.post("/api/videos/:id/extract-thumbs", authMiddleware, async (req, res) => {
    try {
      const storeId = getStoreId(req);
      const videoId = parseInt(req.params.id);
      const [video] = await db.select().from(shoppableVideos).where(and(eq3(shoppableVideos.id, videoId), eq3(shoppableVideos.storeId, storeId)));
      if (!video)
        return res.status(404).json({ error: "V\xEDdeo n\xE3o encontrado" });
      if (video.autoThumbnails && video.autoThumbnails.length > 0) {
        return res.json({ urls: video.autoThumbnails });
      }
      const { extractFramesToR2: extractFramesToR22 } = await Promise.resolve().then(() => (init_ffmpeg(), ffmpeg_exports));
      const urls = await extractFramesToR22(video.mediaUrl);
      await db.update(shoppableVideos).set({ autoThumbnails: urls }).where(eq3(shoppableVideos.id, videoId));
      res.json({ urls });
    } catch (e) {
      console.error("Frame extraction error:", e);
      res.status(500).json({ error: e.message || "Failed to extract frames" });
    }
  });
  app2.post(
    "/api/catalog/import",
    authMiddleware,
    xmlUpload.single("file"),
    async (req, res) => {
      const storeId = getStoreId(req);
      const file = req.file;
      const { url } = req.body;
      if (!file && !url) {
        res.status(400).json({ error: "Forne\xE7a um arquivo XML ou uma URL HTTP" });
        return;
      }
      let job;
      if (file) {
        [job] = await db.insert(catalogImports).values({ storeId, sourceType: "file", sourceUrl: file.filename }).returning();
      } else {
        [job] = await db.insert(catalogImports).values({ storeId, sourceType: "url", sourceUrl: url }).returning();
      }
      processQueue().catch(console.error);
      res.status(202).json({ job, message: "Importa\xE7\xE3o adicionada \xE0 fila." });
    }
  );
  app2.get("/api/catalog/imports", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const list = await db.select().from(catalogImports).where(eq3(catalogImports.storeId, storeId)).orderBy(desc(catalogImports.createdAt));
    res.json({ imports: list });
  });
  app2.post("/api/catalog/sync", authMiddleware, async (req, res) => {
    try {
      const storeId = getStoreId(req);
      const { url, frequencyDays, syncTime } = req.body;
      if (!url || !frequencyDays || !syncTime) {
        return res.status(400).json({ error: "Par\xE2metros de configura\xE7\xE3o inv\xE1lidos." });
      }
      const now = /* @__PURE__ */ new Date();
      const [hours, minutes] = syncTime.split(":").map(Number);
      const nextSync = /* @__PURE__ */ new Date();
      nextSync.setHours(hours, minutes, 0, 0);
      if (nextSync <= now) {
        nextSync.setDate(nextSync.getDate() + 1);
      }
      const [syncRecord] = await db.insert(catalogSyncs).values({
        storeId,
        url,
        frequencyDays,
        syncTime,
        nextSyncAt: nextSync
      }).returning();
      const [importJob] = await db.insert(catalogImports).values({
        storeId,
        sourceType: "url",
        sourceUrl: url,
        status: "pending"
      }).returning();
      res.status(201).json({ sync: syncRecord, import: importJob });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/catalog/syncs", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const list = await db.select().from(catalogSyncs).where(eq3(catalogSyncs.storeId, storeId)).orderBy(desc(catalogSyncs.createdAt));
    res.json({ syncs: list });
  });
  app2.delete("/api/catalog/syncs/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    await db.delete(catalogSyncs).where(and(eq3(catalogSyncs.id, parseInt(req.params.id)), eq3(catalogSyncs.storeId, storeId)));
    res.sendStatus(204);
  });
  app2.get("/api/public/carousels/:id", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Cache-Control", "no-store");
    try {
      const carouselId = parseInt(req.params.id);
      if (isNaN(carouselId))
        return res.status(400).json({ error: "ID inv\xE1lido" });
      const [carousel] = await db.select().from(videoCarousels).where(eq3(videoCarousels.id, carouselId));
      if (!carousel)
        return res.status(404).json({ error: "Carrossel n\xE3o encontrado" });
      let targetStore = null;
      if (carousel.storeId) {
        const [store] = await db.select().from(stores).where(eq3(stores.id, carousel.storeId));
        if (store) {
          if (store.allowedDomain) {
            const origin = req.headers.origin || req.headers.referer;
            if (origin && !origin.includes(store.allowedDomain)) {
              return res.status(403).json({ error: "Dom\xEDnio n\xE3o autorizado para este carrossel." });
            }
          }
          const planId = store.plan;
          const isTrialActive = store.plan === "free" && store.trialEndsAt && store.trialEndsAt > /* @__PURE__ */ new Date();
          const isTrialExpired = store.plan === "free" && (!store.trialEndsAt || store.trialEndsAt <= /* @__PURE__ */ new Date());
          if (isTrialExpired) {
            return res.status(403).json({ error: "O trial gratuito desta loja expirou. O conte\xFAdo est\xE1 bloqueado at\xE9 a ativa\xE7\xE3o de um plano." });
          }
          const limits = isTrialActive ? TRIAL_LIMITS : PLANS[planId] || TRIAL_LIMITS;
          if (store.currentCycleViews >= limits.maxViews) {
            return res.status(403).json({ error: "Cota mensal de visualiza\xE7\xF5es da loja excedida. O conte\xFAdo est\xE1 bloqueado at\xE9 o upgrade do plano." });
          }
          targetStore = store;
        }
      }
      const cv = await db.select({
        videoId: carouselVideos.videoId,
        position: carouselVideos.position,
        video: {
          id: shoppableVideos.id,
          title: shoppableVideos.title,
          description: shoppableVideos.description,
          mediaUrl: shoppableVideos.mediaUrl,
          thumbnailUrl: shoppableVideos.thumbnailUrl
        }
      }).from(carouselVideos).innerJoin(shoppableVideos, eq3(carouselVideos.videoId, shoppableVideos.id)).where(eq3(carouselVideos.carouselId, carouselId)).orderBy(carouselVideos.position);
      const videoIds = cv.map((r) => r.videoId);
      let productsByVideo = {};
      if (carousel.showProducts && videoIds.length > 0) {
        const vp = await db.select({
          videoId: videoProducts.videoId,
          startTime: videoProducts.startTime,
          endTime: videoProducts.endTime,
          product: {
            id: products.id,
            title: products.title,
            price: products.price,
            imageLink: products.imageLink,
            link: products.link
          }
        }).from(videoProducts).innerJoin(products, eq3(videoProducts.productId, products.id)).where(inArray(videoProducts.videoId, videoIds)).orderBy(videoProducts.startTime);
        vp.forEach((record) => {
          if (!productsByVideo[record.videoId])
            productsByVideo[record.videoId] = [];
          productsByVideo[record.videoId].push({
            startTime: record.startTime,
            endTime: record.endTime,
            ...record.product
          });
        });
      }
      res.json({ carousel, videos: cv.map((r) => ({ ...r.video, productsList: productsByVideo[r.videoId] || [] })) });
      if (targetStore) {
        const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
        if (shouldCountView(carouselId, ip)) {
          const storeId = targetStore.id;
          const today = todayUTC();
          db.update(stores).set({ currentCycleViews: sql2`${stores.currentCycleViews} + 1` }).where(eq3(stores.id, storeId)).catch((err) => console.error("[view-tracker] store increment failed:", err));
          db.execute(sql2`
                        INSERT INTO view_events (store_id, carousel_id, date, count)
                        VALUES (${storeId}, ${carouselId}, ${today}, 1)
                        ON CONFLICT (store_id, carousel_id, date)
                        DO UPDATE SET count = view_events.count + 1
                    `).catch((err) => console.error("[view-tracker] daily upsert failed:", err));
        }
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/embed/carousel.js", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const origin = process.env.PUBLIC_URL || "";
    res.send(publicScript.replace("__API_ORIGIN__", origin));
  });
  app2.get("/api/carousels", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const list = await db.select().from(videoCarousels).where(eq3(videoCarousels.storeId, storeId)).orderBy(desc(videoCarousels.createdAt));
    res.json({ carousels: list });
  });
  app2.get("/api/carousels/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const carouselId = parseInt(req.params.id);
    const [carousel] = await db.select().from(videoCarousels).where(and(eq3(videoCarousels.id, carouselId), eq3(videoCarousels.storeId, storeId)));
    if (!carousel)
      return res.status(404).json({ error: "Carrossel n\xE3o encontrado" });
    const cv = await db.select({
      id: carouselVideos.id,
      carouselId: carouselVideos.carouselId,
      videoId: carouselVideos.videoId,
      position: carouselVideos.position,
      video: {
        id: shoppableVideos.id,
        title: shoppableVideos.title,
        description: shoppableVideos.description,
        mediaUrl: shoppableVideos.mediaUrl,
        thumbnailUrl: shoppableVideos.thumbnailUrl
      }
    }).from(carouselVideos).innerJoin(shoppableVideos, eq3(carouselVideos.videoId, shoppableVideos.id)).where(eq3(carouselVideos.carouselId, carouselId)).orderBy(carouselVideos.position);
    const videoIds = cv.map((r) => r.videoId);
    let productsByVideo = {};
    if (videoIds.length > 0) {
      const vp = await db.select({
        videoId: videoProducts.videoId,
        startTime: videoProducts.startTime,
        endTime: videoProducts.endTime,
        product: {
          id: products.id,
          title: products.title,
          price: products.price,
          imageLink: products.imageLink,
          link: products.link
        }
      }).from(videoProducts).innerJoin(products, eq3(videoProducts.productId, products.id)).where(inArray(videoProducts.videoId, videoIds)).orderBy(videoProducts.startTime);
      vp.forEach((record) => {
        if (!productsByVideo[record.videoId])
          productsByVideo[record.videoId] = [];
        productsByVideo[record.videoId].push({
          startTime: record.startTime,
          endTime: record.endTime,
          ...record.product
        });
      });
    }
    res.json({ carousel, videos: cv.map((r) => ({ ...r, video: { ...r.video, productsList: productsByVideo[r.videoId] || [] } })) });
  });
  app2.post("/api/carousels", authMiddleware, async (req, res) => {
    try {
      const storeId = getStoreId(req);
      const payload = req.user;
      const [activeStore] = await db.select().from(stores).where(and(eq3(stores.id, storeId), eq3(stores.ownerId, payload.userId)));
      if (!activeStore)
        return res.status(403).json({ error: "Loja n\xE3o encontrada ou acesso negado." });
      const planId = activeStore.plan;
      const isTrialActive = activeStore.plan === "free" && activeStore.trialEndsAt && activeStore.trialEndsAt > /* @__PURE__ */ new Date();
      const isTrialExpired = activeStore.plan === "free" && (!activeStore.trialEndsAt || activeStore.trialEndsAt <= /* @__PURE__ */ new Date());
      if (isTrialExpired) {
        return res.status(403).json({ error: "Seu trial gratuito expirou. Assine um plano para continuar criando carross\xE9is.", trialExpired: true });
      }
      const limits = isTrialActive ? TRIAL_LIMITS : PLANS[planId] || TRIAL_LIMITS;
      const [countRes] = await db.select({ count: sql2`count(*)`.mapWith(Number) }).from(videoCarousels).where(eq3(videoCarousels.storeId, storeId));
      const count = countRes.count;
      if (count >= limits.maxCarousels) {
        return res.status(403).json({ error: `Limite atingido. Voc\xEA pode criar at\xE9 ${limits.maxCarousels} carrossel(eis) no plano ${limits.name}. Fa\xE7a o upgrade para expandir.` });
      }
      const { name, title, subtitle, titleColor, subtitleColor, layout, showProducts, previewTime } = req.body;
      const [carousel] = await db.insert(videoCarousels).values({
        storeId,
        name: name || "Novo Carrossel",
        title,
        subtitle,
        titleColor: titleColor || "#000000",
        subtitleColor: subtitleColor || "#666666",
        layout: layout || "3d-card",
        showProducts: showProducts ?? true,
        previewTime: previewTime ?? 3
      }).returning();
      res.status(201).json({ carousel });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/carousels/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const carouselId = parseInt(req.params.id);
    const { name, title, subtitle, titleColor, subtitleColor, layout, showProducts, previewTime, videoIds } = req.body;
    try {
      const [updated] = await db.update(videoCarousels).set({ name, title, subtitle, titleColor, subtitleColor, layout, showProducts, previewTime, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq3(videoCarousels.id, carouselId), eq3(videoCarousels.storeId, storeId))).returning();
      if (!updated)
        return res.status(404).json({ error: "Carrossel n\xE3o encontrado" });
      if (videoIds && Array.isArray(videoIds)) {
        await db.delete(carouselVideos).where(eq3(carouselVideos.carouselId, carouselId));
        if (videoIds.length > 0) {
          await db.insert(carouselVideos).values(
            videoIds.map((vid, idx) => ({
              carouselId,
              videoId: vid,
              position: idx
            }))
          );
        }
      }
      const publicUrl = process.env.PUBLIC_URL || "http://localhost:5000";
      purgeCloudflareCache([`${publicUrl}/api/public/carousels/${carouselId}`]);
      res.json({ carousel: updated });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/carousels/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    await db.delete(videoCarousels).where(and(eq3(videoCarousels.id, parseInt(req.params.id)), eq3(videoCarousels.storeId, storeId)));
    const publicUrl = process.env.PUBLIC_URL || "http://localhost:5000";
    purgeCloudflareCache([`${publicUrl}/api/public/carousels/${parseInt(req.params.id)}`]);
    res.sendStatus(204);
  });
  app2.get("/api/videos", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const list = await db.select().from(shoppableVideos).where(eq3(shoppableVideos.storeId, storeId)).orderBy(desc(shoppableVideos.createdAt));
    const videoIds = list.map((v) => v.id);
    let productsByVideo = {};
    if (videoIds.length > 0) {
      const vp = await db.select({
        videoId: videoProducts.videoId,
        startTime: videoProducts.startTime,
        endTime: videoProducts.endTime,
        product: {
          id: products.id,
          title: products.title,
          price: products.price,
          imageLink: products.imageLink,
          link: products.link
        }
      }).from(videoProducts).innerJoin(products, eq3(videoProducts.productId, products.id)).where(inArray(videoProducts.videoId, videoIds)).orderBy(videoProducts.startTime);
      vp.forEach((record) => {
        if (!productsByVideo[record.videoId])
          productsByVideo[record.videoId] = [];
        productsByVideo[record.videoId].push({
          startTime: record.startTime,
          endTime: record.endTime,
          ...record.product
        });
      });
    }
    res.json({ videos: list.map((v) => ({ ...v, productsList: productsByVideo[v.id] || [] })) });
  });
  app2.get("/api/videos/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const videoId = parseInt(req.params.id);
    const [video] = await db.select().from(shoppableVideos).where(and(eq3(shoppableVideos.id, videoId), eq3(shoppableVideos.storeId, storeId)));
    if (!video)
      return res.status(404).json({ error: "V\xEDdeo n\xE3o encontrado" });
    const vp = await db.select({
      id: videoProducts.id,
      videoId: videoProducts.videoId,
      productId: videoProducts.productId,
      startTime: videoProducts.startTime,
      endTime: videoProducts.endTime,
      product: {
        id: products.id,
        title: products.title,
        price: products.price,
        imageLink: products.imageLink
      }
    }).from(videoProducts).innerJoin(products, eq3(videoProducts.productId, products.id)).where(eq3(videoProducts.videoId, videoId)).orderBy(videoProducts.startTime);
    res.json({ video, videoProducts: vp });
  });
  app2.post("/api/videos", authMiddleware, async (req, res) => {
    try {
      const storeId = getStoreId(req);
      const payload = req.user;
      const [activeStore] = await db.select().from(stores).where(and(eq3(stores.id, storeId), eq3(stores.ownerId, payload.userId)));
      if (!activeStore)
        return res.status(403).json({ error: "Loja n\xE3o encontrada ou acesso negado." });
      const planId = activeStore.plan;
      const isTrialActive = activeStore.plan === "free" && activeStore.trialEndsAt && activeStore.trialEndsAt > /* @__PURE__ */ new Date();
      const isTrialExpired = activeStore.plan === "free" && (!activeStore.trialEndsAt || activeStore.trialEndsAt <= /* @__PURE__ */ new Date());
      if (isTrialExpired) {
        return res.status(403).json({ error: "Seu trial gratuito expirou. Assine um plano para continuar adicionando v\xEDdeos.", trialExpired: true });
      }
      const limits = isTrialActive ? TRIAL_LIMITS : PLANS[planId] || TRIAL_LIMITS;
      const [countRes] = await db.select({ count: sql2`count(*)`.mapWith(Number) }).from(shoppableVideos).where(eq3(shoppableVideos.storeId, storeId));
      const count = countRes.count;
      if (count >= limits.maxVideos) {
        return res.status(403).json({ error: `Limite atingido. Voc\xEA pode estocar at\xE9 ${limits.maxVideos} v\xEDdeo(s) no plano ${limits.name}. Fa\xE7a o upgrade para expandir.` });
      }
      const { title, description, mediaUrl, thumbnailUrl } = req.body;
      const [video] = await db.insert(shoppableVideos).values({ storeId, title: title || "Novo V\xEDdeo", description, mediaUrl, thumbnailUrl }).returning();
      res.status(201).json({ video });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/videos/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const videoId = parseInt(req.params.id);
    const { title, description, mediaUrl, thumbnailUrl, productsList } = req.body;
    try {
      const [updated] = await db.update(shoppableVideos).set({ title, description, mediaUrl, thumbnailUrl }).where(and(eq3(shoppableVideos.id, videoId), eq3(shoppableVideos.storeId, storeId))).returning();
      if (!updated)
        return res.status(404).json({ error: "V\xEDdeo n\xE3o encontrado" });
      if (productsList && Array.isArray(productsList)) {
        await db.delete(videoProducts).where(eq3(videoProducts.videoId, videoId));
        if (productsList.length > 0) {
          const insertData = productsList.map((p) => ({
            videoId,
            productId: p.productId,
            startTime: Math.round(p.startTime),
            endTime: Math.round(p.endTime)
          }));
          await db.insert(videoProducts).values(insertData);
        }
      }
      const publicUrl = process.env.PUBLIC_URL || "http://localhost:5000";
      const impactedCarousels = await db.select({ carouselId: carouselVideos.carouselId }).from(carouselVideos).where(eq3(carouselVideos.videoId, videoId));
      if (impactedCarousels.length > 0) {
        const urls = impactedCarousels.map((c) => `${publicUrl}/api/public/carousels/${c.carouselId}`);
        purgeCloudflareCache(urls);
      }
      res.json({ video: updated });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/videos/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    await db.delete(shoppableVideos).where(and(eq3(shoppableVideos.id, parseInt(req.params.id)), eq3(shoppableVideos.storeId, storeId)));
    res.sendStatus(204);
  });
  app2.get("/api/products", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;
    let condition = eq3(products.storeId, storeId);
    if (search) {
      condition = and(
        eq3(products.storeId, storeId),
        or(
          ilike(products.title, `%${search}%`),
          ilike(products.externalId, `%${search}%`)
        )
      );
    }
    const [countResult] = await db.select({ count: sql2`count(*)`.mapWith(Number) }).from(products).where(condition);
    const total = countResult.count;
    const list = await db.select().from(products).where(condition).orderBy(desc(products.createdAt)).limit(limit).offset(offset);
    res.json({ products: list, total, page, totalPages: Math.ceil(total / limit) || 1 });
  });
  app2.put("/api/products/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inv\xE1lido" });
      return;
    }
    const { title, description, price, brand, condition, availability, link, imageLink } = req.body;
    const [updated] = await db.update(products).set({
      title,
      description,
      price,
      brand,
      condition,
      availability,
      link,
      imageLink,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and(eq3(products.id, id), eq3(products.storeId, storeId))).returning();
    if (!updated) {
      res.status(404).json({ error: "Produto n\xE3o encontrado" });
      return;
    }
    res.json({ product: updated });
  });
  app2.delete("/api/products/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inv\xE1lido" });
      return;
    }
    const [deleted] = await db.delete(products).where(and(eq3(products.id, id), eq3(products.storeId, storeId))).returning();
    if (!deleted) {
      res.status(404).json({ error: "Produto n\xE3o encontrado" });
      return;
    }
    res.json({ success: true });
  });
  app2.post("/api/stripe/checkout", authMiddleware, async (req, res) => {
    const payload = req.user;
    const { planId, storeId } = req.body;
    if (!planId || !PLANS[planId])
      return res.status(400).json({ error: "Plano inv\xE1lido. Escolha: pro, ultra ou gold." });
    const plan = PLANS[planId];
    const [store] = await db.select().from(stores).where(and(eq3(stores.id, storeId), eq3(stores.ownerId, payload.userId))).limit(1);
    if (!store)
      return res.status(403).json({ error: "Loja n\xE3o encontrada ou acesso negado." });
    try {
      const [owner] = await db.select().from(users).where(eq3(users.id, payload.userId)).limit(1);
      let customerId = owner.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({ email: owner.email, name: owner.name });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customerId }).where(eq3(users.id, owner.id));
      }
      const publicUrl = process.env.PUBLIC_URL || "http://localhost:5000";
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: plan.priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${publicUrl}/dashboard/billing?success=true`,
        cancel_url: `${publicUrl}/dashboard/billing?canceled=true`,
        // Pass both storeId and planId so the webhook knows what to update
        metadata: { storeId: storeId.toString(), planId, userId: owner.id.toString() }
      });
      res.json({ url: session.url });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/stripe/portal", authMiddleware, async (req, res) => {
    const payload = req.user;
    const [owner] = await db.select().from(users).where(eq3(users.id, payload.userId)).limit(1);
    if (!owner.stripeCustomerId)
      return res.status(400).json({ error: "Conta Stripe n\xE3o configurada para este usu\xE1rio." });
    try {
      const publicUrl = process.env.PUBLIC_URL || "http://localhost:5000";
      const session = await stripe.billingPortal.sessions.create({
        customer: owner.stripeCustomerId,
        return_url: `${publicUrl}/dashboard/billing`
      });
      res.json({ url: session.url });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/stripe/webhook", async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    if (webhookSecret) {
      const sig = req.headers["stripe-signature"];
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error("[webhook] Signature verification failed:", err.message);
        return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
      }
    } else {
      event = req.body;
    }
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const storeId = parseInt(session.metadata?.storeId || "0");
        const planId = session.metadata?.planId;
        const userId = parseInt(session.metadata?.userId || "0");
        if (storeId && planId) {
          await db.update(stores).set({
            plan: planId,
            currentCycleViews: 0
          }).where(eq3(stores.id, storeId));
        }
        if (userId && session.subscription) {
          await db.update(users).set({
            stripeSubscriptionId: session.subscription,
            subscriptionStatus: "active"
          }).where(eq3(users.id, userId));
        }
      } else if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const [userRow] = await db.select().from(users).where(eq3(users.stripeSubscriptionId, invoice.subscription)).limit(1);
          if (userRow) {
            await db.update(users).set({ subscriptionStatus: "active" }).where(eq3(users.id, userRow.id));
            await db.update(stores).set({ currentCycleViews: 0 }).where(eq3(stores.ownerId, userRow.id));
          }
        }
      } else if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
        const subscription = event.data.object;
        const isCanceled = ["canceled", "unpaid", "incomplete_expired"].includes(subscription.status);
        if (isCanceled) {
          const [userRow] = await db.select().from(users).where(eq3(users.stripeSubscriptionId, subscription.id)).limit(1);
          if (userRow) {
            await db.update(users).set({ subscriptionStatus: "canceled", stripeSubscriptionId: null }).where(eq3(users.id, userRow.id));
            await db.update(stores).set({ plan: "free", trialEndsAt: null }).where(eq3(stores.ownerId, userRow.id));
          }
        }
      }
      res.json({ received: true });
    } catch (e) {
      console.error("[webhook] Processing failed:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/products/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inv\xE1lido" });
      return;
    }
    const [deleted] = await db.delete(products).where(and(eq3(products.id, id), eq3(products.storeId, storeId))).returning();
    if (!deleted) {
      res.status(404).json({ error: "Produto n\xE3o encontrado" });
      return;
    }
    res.json({ success: true });
  });
  app2.get("/api/analytics/views", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const { from, to } = req.query;
    if (!from || !to)
      return res.status(400).json({ error: "from e to s\xE3o obrigat\xF3rios (YYYY-MM-DD)" });
    try {
      const rows = await db.execute(sql2`
                SELECT date, SUM(count)::int AS total
                FROM view_events
                WHERE store_id = ${storeId}
                  AND date >= ${from}
                  AND date <= ${to}
                GROUP BY date
                ORDER BY date ASC
            `);
      const byDay = rows.rows.map((r) => ({ date: r.date, views: r.total }));
      const total = byDay.reduce((acc, r) => acc + r.views, 0);
      res.json({ total, byDay });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.use((err, req, res, next) => {
    if (err.message === "x-store-id header is missing") {
      return res.status(400).json({ error: "Loja n\xE3o selecionada ou header x-store-id ausente." });
    }
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: err.message || "Erro interno do servidor." });
  });
}

// server/syncScheduler.ts
import { eq as eq4, and as and2, lte } from "drizzle-orm";
function startSyncScheduler() {
  setInterval(async () => {
    try {
      const pendingSyncs = await db.select().from(catalogSyncs).where(
        and2(
          eq4(catalogSyncs.isActive, true),
          lte(catalogSyncs.nextSyncAt, /* @__PURE__ */ new Date())
        )
      );
      for (const sync of pendingSyncs) {
        await db.insert(catalogImports).values({
          sourceType: "url",
          sourceUrl: sync.url,
          status: "pending"
        });
        const nextDate = new Date(sync.nextSyncAt);
        nextDate.setDate(nextDate.getDate() + sync.frequencyDays);
        await db.update(catalogSyncs).set({
          lastSyncAt: /* @__PURE__ */ new Date(),
          nextSyncAt: nextDate
        }).where(eq4(catalogSyncs.id, sync.id));
      }
    } catch (e) {
      console.error("Erro no scheduler de sincroniza\xE7\xE3o:", e);
    }
  }, 60 * 1e3);
}

// server/index.ts
import path5 from "path";
import { eq as eq5 } from "drizzle-orm";
dotenv3.config();
var app = express2();
app.use(cors({ origin: "*" }));
var server = createServer(app);
app.use("/api/stripe/webhook", express2.raw({ type: "application/json" }));
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use("/uploads", express2.static(path5.resolve("uploads")));
registerRoutes(app);
await setupVite(app, server);
await db.update(catalogImports).set({ status: "failed", error: "Interrompido pela reinicializa\xE7\xE3o do servidor" }).where(eq5(catalogImports.status, "processing"));
startSyncScheduler();
var PORT = parseInt(process.env.PORT || "5000");
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
