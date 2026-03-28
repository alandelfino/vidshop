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
var ffmpegPath, ffprobePath;
var init_ffmpeg = __esm({
  "server/ffmpeg.ts"() {
    "use strict";
    init_upload();
    ffmpegPath = ffmpegInstaller.path || ffmpegInstaller.default?.path;
    ffprobePath = ffprobeInstaller.path || ffprobeInstaller.default?.path;
    if (process.env.NODE_ENV === "production") {
      console.log("[ffmpeg] Production: defaulting to system-native binaries.");
    } else {
      if (ffmpegPath)
        ffmpeg.setFfmpegPath(ffmpegPath);
      if (ffprobePath)
        ffmpeg.setFfprobePath(ffprobePath);
    }
  }
});

// server/index.ts
import "express-async-errors";
import dotenv3 from "dotenv";
import express3 from "express";
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
import express2 from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq as eq3, desc, ilike, or, sql as sql2, inArray, and } from "drizzle-orm";
import fs4 from "fs";

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
  storyVideos: () => storyVideos,
  storyViewEvents: () => storyViewEvents,
  users: () => users,
  videoCarousels: () => videoCarousels,
  videoProducts: () => videoProducts,
  videoStories: () => videoStories,
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
  tags: jsonb("tags").$type().default([]),
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
  titleColor: text("title_color").default("#000000"),
  subtitleColor: text("subtitle_color").default("#666666"),
  // Integration & Conditions
  integrationMode: text("integration_mode").notNull().default("code"),
  // code, selector
  selector: text("selector"),
  insertionMethod: text("insertion_method").default("after"),
  // before, after, prepend, append
  conditions: jsonb("conditions").default([]),
  // Array of { data: string, operator: string, value: string }
  // Dynamic Video Selection
  videoSelectionType: text("video_selection_type").notNull().default("manual"),
  // manual, dynamic
  dynamicVideoConditions: jsonb("dynamic_video_conditions").default([]),
  // Array of video conditions
  layout: text("layout").notNull().default("3d-card"),
  showProducts: boolean("show_products").notNull().default(true),
  previewTime: integer("preview_time").notNull().default(3),
  // Card Styles
  cardBorderWidth: integer("card_border_width").notNull().default(0),
  cardBorderColor: text("card_border_color").notNull().default("#000000"),
  cardBorderRadius: integer("card_border_radius").notNull().default(12),
  // Layout customization
  maxWidth: text("max_width").notNull().default("100%"),
  marginTop: text("margin_top").notNull().default("0px"),
  marginRight: text("margin_right").notNull().default("0px"),
  marginBottom: text("margin_bottom").notNull().default("0px"),
  marginLeft: text("margin_left").notNull().default("0px"),
  paddingTop: text("padding_top").notNull().default("0px"),
  paddingRight: text("padding_right").notNull().default("0px"),
  paddingBottom: text("padding_bottom").notNull().default("0px"),
  paddingLeft: text("padding_left").notNull().default("0px"),
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
var videoStories = pgTable("video_stories", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  title: text("title"),
  // Customization
  shape: text("shape").notNull().default("round"),
  // round, rect-9-16, square-9-16
  borderGradient: text("border_gradient").default("linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)"),
  // Integration & Conditions
  integrationMode: text("integration_mode").notNull().default("code"),
  // code, selector
  selector: text("selector"),
  insertionMethod: text("insertion_method").default("after"),
  // before, after, prepend, append
  conditions: jsonb("conditions").default([]),
  // Array of { data: string, operator: string, value: string }
  // Dynamic Video Selection
  videoSelectionType: text("video_selection_type").notNull().default("manual"),
  // manual, dynamic
  dynamicVideoConditions: jsonb("dynamic_video_conditions").default([]),
  // Array of video conditions
  borderEnabled: boolean("border_enabled").notNull().default(true),
  showProducts: boolean("show_products").notNull().default(true),
  bubbleWidth: text("bubble_width").notNull().default("80px"),
  bubbleHeight: text("bubble_height").notNull().default("80px"),
  borderRadius: integer("border_radius").notNull().default(8),
  // Layout customization
  maxWidth: text("max_width").notNull().default("100%"),
  marginTop: text("margin_top").notNull().default("0px"),
  marginRight: text("margin_right").notNull().default("0px"),
  marginBottom: text("margin_bottom").notNull().default("0px"),
  marginLeft: text("margin_left").notNull().default("0px"),
  paddingTop: text("padding_top").notNull().default("0px"),
  paddingRight: text("padding_right").notNull().default("0px"),
  paddingBottom: text("padding_bottom").notNull().default("0px"),
  paddingLeft: text("padding_left").notNull().default("0px"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var storyVideos = pgTable("story_videos", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => videoStories.id, { onDelete: "cascade" }).notNull(),
  videoId: integer("video_id").references(() => shoppableVideos.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull().default(0)
});
var storyViewEvents = pgTable("story_view_events", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }).notNull(),
  storyId: integer("story_id").references(() => videoStories.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(),
  // ISO date string: 'YYYY-MM-DD'
  count: integer("count").notNull().default(0)
}, (t) => ({
  unq: unique("story_view_events_store_story_date_idx").on(t.storeId, t.storyId, t.date)
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
import path5 from "path";
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
function formatPrice(priceStr) {
  if (!priceStr)
    return null;
  const s = priceStr.trim().toUpperCase();
  const regex = /^([A-Z]{3})?[\s]*([\d\.,]+)[\s]*([A-Z]{3})?$/;
  const match = s.match(regex);
  if (match) {
    const currency = match[1] || match[3];
    const val = match[2];
    if (currency === "BRL") {
      return `R$ ${val.replace(".", ",")}`;
    }
    if (currency === "USD") {
      return `$ ${val.replace(",", ".")}`;
    }
    if (currency === "EUR") {
      return `\u20AC ${val.replace(".", ",")}`;
    }
  }
  if (s.includes("BRL")) {
    return s.replace("BRL", "R$").trim().replace(".", ",");
  }
  if (s.includes("USD")) {
    return s.replace("USD", "$").trim().replace(",", ".");
  }
  return priceStr;
}
async function resolveDynamicVideos(storeId, conditions, fetchProducts = true, pageUrl = "") {
  let productsByVideo = {};
  const allVideos = await db.select().from(shoppableVideos).where(eq3(shoppableVideos.storeId, storeId)).orderBy(desc(shoppableVideos.createdAt));
  if (fetchProducts && allVideos.length > 0) {
    const videoIds = allVideos.map((v) => v.id);
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
        ...record.product,
        startTime: record.startTime,
        endTime: record.endTime,
        price: formatPrice(record.product.price)
      });
    });
  }
  const filtered = allVideos.filter((video) => {
    if (!conditions || !Array.isArray(conditions))
      return true;
    for (const cond of conditions) {
      const field = cond.field;
      const operator = cond.operator;
      if (!cond.value || Array.isArray(cond.value) && cond.value.length === 0)
        continue;
      if (field === "title") {
        const title = video.title.toLowerCase();
        const val = String(cond.value).toLowerCase();
        if (operator === "equal_to" && title !== val)
          return false;
        if (operator === "not_equal_to" && title === val)
          return false;
        if (operator === "contains" && !title.includes(val))
          return false;
        if (operator === "not_contains" && title.includes(val))
          return false;
      } else if (field === "description") {
        const desc2 = (video.description || "").toLowerCase();
        const val = String(cond.value).toLowerCase();
        if (operator === "equal_to" && desc2 !== val)
          return false;
        if (operator === "not_equal_to" && desc2 === val)
          return false;
        if (operator === "contains" && !desc2.includes(val))
          return false;
        if (operator === "not_contains" && desc2.includes(val))
          return false;
      } else if (field === "tags") {
        const tags = (video.tags || []).map((t) => String(t).toLowerCase());
        const targetTags = (Array.isArray(cond.value) ? cond.value : [cond.value]).map((t) => String(t).toLowerCase());
        if (targetTags.length > 0) {
          if (operator === "contains_tags") {
            if (!targetTags.some((t) => tags.includes(t)))
              return false;
          } else if (operator === "not_contains_tags") {
            if (targetTags.some((t) => tags.includes(t)))
              return false;
          }
        }
      } else if (field === "products") {
        const videoProds = (productsByVideo[video.id] || []).map((p) => p.id);
        const videoProdLinks = (productsByVideo[video.id] || []).map((p) => p.link ? String(p.link).toLowerCase().trim() : "").filter(Boolean);
        if (operator === "url_equals_page_url" || operator === "url_contains_page_url") {
          if (!pageUrl)
            return false;
          const pUrl = pageUrl.toLowerCase().trim();
          const pUrlNoQuery = pUrl.split("?")[0];
          if (operator === "url_equals_page_url") {
            if (!videoProdLinks.some((l) => l === pUrl || l === pUrlNoQuery))
              return false;
          } else if (operator === "url_contains_page_url") {
            if (!videoProdLinks.some((l) => pUrl.includes(l) || l.includes(pUrl)))
              return false;
          }
        } else {
          const targetProds = (Array.isArray(cond.value) ? cond.value : [cond.value]).map(Number);
          if (targetProds.length > 0) {
            if (operator === "contains_products") {
              if (!targetProds.some((id) => videoProds.includes(id)))
                return false;
            } else if (operator === "not_contains_products") {
              if (targetProds.some((id) => videoProds.includes(id)))
                return false;
            } else if (operator === "contains_only_product") {
              if (videoProds.length !== targetProds.length)
                return false;
              if (!targetProds.every((id) => videoProds.includes(id)))
                return false;
            }
          }
        }
      }
    }
    return true;
  });
  return { videos: filtered, productsByVideo };
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
    const { name, allowedDomain, plan } = req.body;
    if (!name || !allowedDomain)
      return res.status(400).json({ error: "Nome da loja e dom\xEDnio s\xE3o obrigat\xF3rios" });
    const selectedPlan = plan && PLANS[plan] ? plan : "pro";
    const trialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1e3);
    const [store] = await db.insert(stores).values({
      name,
      allowedDomain,
      plan: selectedPlan,
      trialEndsAt,
      ownerId: payload.userId
    }).returning();
    res.status(201).json({ store });
  });
  app2.put("/api/stores/:id", authMiddleware, async (req, res) => {
    const payload = req.user;
    const storeId = parseInt(req.params.id);
    const { name, allowedDomain, headerScripts, footerScripts } = req.body;
    if (!name || !allowedDomain)
      return res.status(400).json({ error: "Nome da loja e dom\xEDnio s\xE3o obrigat\xF3rios" });
    const [existing] = await db.select().from(stores).where(and(eq3(stores.id, storeId), eq3(stores.ownerId, payload.userId))).limit(1);
    if (!existing)
      return res.status(404).json({ error: "Loja n\xE3o encontrada ou acesso negado." });
    const [store] = await db.update(stores).set({
      name,
      allowedDomain,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and(eq3(stores.id, storeId), eq3(stores.ownerId, payload.userId))).returning();
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
      const R2_ACCOUNT_ID2 = process.env.CLOUDFLARE_ACCOUNT_ID;
      const R2_BUCKET2 = process.env.CLOUDFLARE_R2_BUCKET_NAME;
      console.log("[upload] Starting upload attempt...");
      console.log("[upload] Environment check:", {
        hasAccountId: !!R2_ACCOUNT_ID2,
        hasBucket: !!R2_BUCKET2,
        hasAccessKey: !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
      });
      upload.single("file")(req, res, (err) => {
        if (err) {
          console.error("CRITICAL UPLOAD ERROR:", err);
          console.log("Error Message:", err.message);
          console.log("Error Stack:", err.stack);
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
          const isTrialActive = store.trialEndsAt && store.trialEndsAt > /* @__PURE__ */ new Date();
          const isTrialExpired = store.trialEndsAt && store.trialEndsAt <= /* @__PURE__ */ new Date();
          const isPaidPlan = !store.trialEndsAt && store.plan !== "free";
          if (isTrialExpired || !isTrialActive && !isPaidPlan) {
            return res.status(403).json({ error: "O trial gratuito desta loja expirou ou n\xE3o h\xE1 plano ativo. O conte\xFAdo est\xE1 bloqueado." });
          }
          const limits = PLANS[planId] || TRIAL_LIMITS;
          if (store.currentCycleViews >= limits.maxViews) {
            return res.status(403).json({ error: "Cota mensal de visualiza\xE7\xF5es da loja excedida. O conte\xFAdo est\xE1 bloqueado at\xE9 o upgrade do plano." });
          }
          targetStore = store;
        }
      }
      if (carousel.videoSelectionType === "dynamic") {
        const resolved = await resolveDynamicVideos(carousel.storeId, carousel.dynamicVideoConditions, carousel.showProducts, req.query.pageUrl || "");
        const videos = resolved.videos.map((v, i) => ({
          ...v,
          position: i,
          productsList: resolved.productsByVideo[v.id] || []
        }));
        res.json({ carousel, videos });
      } else {
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
              ...record.product,
              price: formatPrice(record.product.price)
            });
          });
        }
        res.json({
          carousel,
          videos: cv.map((r) => ({ ...r.video, productsList: productsByVideo[r.videoId] || [] }))
        });
      }
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
  app2.use("/embed", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cache-Control", "public, max-age=3600");
    next();
  });
  app2.use("/embed", express2.static(path5.resolve("dist/public/embed")));
  app2.use("/embed", express2.static(path5.resolve("server/embed")));
  app2.get("/embed/vidshop.js", async (req, res) => {
    const distPath = path5.resolve("dist/public/embed/vidshop.js");
    if (fs4.existsSync(distPath)) {
      return res.sendFile(distPath);
    }
    res.status(404).send("Embed script not found. Run 'npm run build:embed'.");
  });
  app2.get("/embed/carousel.js", (_req, res) => {
    res.redirect(301, "/embed/vidshop.js");
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
    if (carousel.videoSelectionType === "dynamic") {
      const resolved = await resolveDynamicVideos(storeId, carousel.dynamicVideoConditions, true);
      const mappedVideos = resolved.videos.map((v, i) => ({
        id: i,
        carouselId,
        videoId: v.id,
        position: i,
        video: { ...v, productsList: resolved.productsByVideo[v.id] || [] }
      }));
      return res.json({ carousel, videos: mappedVideos });
    }
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
          ...record.product,
          price: formatPrice(record.product.price)
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
      const isTrialActive = activeStore.trialEndsAt && activeStore.trialEndsAt > /* @__PURE__ */ new Date();
      const isTrialExpired = activeStore.trialEndsAt && activeStore.trialEndsAt <= /* @__PURE__ */ new Date();
      const isPaidPlan = !activeStore.trialEndsAt && activeStore.plan !== "free";
      if (isTrialExpired || !isTrialActive && !isPaidPlan) {
        return res.status(403).json({ error: "Seu trial gratuito expirou ou n\xE3o h\xE1 plano ativo. Assine um plano para continuar criando carross\xE9is.", trialExpired: true });
      }
      const limits = PLANS[planId] || TRIAL_LIMITS;
      const [countRes] = await db.select({ count: sql2`count(*)`.mapWith(Number) }).from(videoCarousels).where(eq3(videoCarousels.storeId, storeId));
      const count = countRes.count;
      if (count >= limits.maxCarousels) {
        return res.status(403).json({ error: `Limite atingido. Voc\xEA pode criar at\xE9 ${limits.maxCarousels} carrossel(eis) no plano ${limits.name}. Fa\xE7a o upgrade para expandir.` });
      }
      const {
        name,
        title,
        subtitle,
        titleColor,
        subtitleColor,
        layout,
        showProducts,
        previewTime,
        maxWidth,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        integrationMode,
        selector,
        insertionMethod,
        conditions,
        videoSelectionType,
        dynamicVideoConditions
      } = req.body;
      const [carousel] = await db.insert(videoCarousels).values({
        storeId,
        name: name || "Novo Carrossel",
        title,
        subtitle,
        titleColor: titleColor || "#000000",
        subtitleColor: subtitleColor || "#666666",
        layout: layout || "3d-card",
        showProducts: showProducts ?? true,
        previewTime: previewTime ?? 3,
        maxWidth: maxWidth || "100%",
        marginTop: marginTop || "0px",
        marginRight: marginRight || "0px",
        marginBottom: marginBottom || "0px",
        marginLeft: marginLeft || "0px",
        paddingTop: paddingTop || "0px",
        paddingRight: paddingRight || "0px",
        paddingBottom: paddingBottom || "0px",
        paddingLeft: paddingLeft || "0px",
        integrationMode: integrationMode || "code",
        selector: selector || null,
        insertionMethod: insertionMethod || "after",
        conditions: conditions || [],
        videoSelectionType: videoSelectionType || "manual",
        dynamicVideoConditions: dynamicVideoConditions || []
      }).returning();
      res.status(201).json({ carousel });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/carousels/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const carouselId = parseInt(req.params.id);
    const {
      name,
      title,
      subtitle,
      titleColor,
      subtitleColor,
      layout,
      showProducts,
      previewTime,
      videoIds,
      maxWidth,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      integrationMode,
      selector,
      insertionMethod,
      conditions,
      videoSelectionType,
      dynamicVideoConditions
    } = req.body;
    try {
      const [updated] = await db.update(videoCarousels).set({
        name,
        title,
        subtitle,
        titleColor,
        subtitleColor,
        layout,
        showProducts,
        previewTime,
        maxWidth,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        integrationMode,
        selector,
        insertionMethod,
        conditions,
        videoSelectionType,
        dynamicVideoConditions,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(and(eq3(videoCarousels.id, carouselId), eq3(videoCarousels.storeId, storeId))).returning();
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
  app2.get("/api/stories", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const myStories = await db.select().from(videoStories).where(eq3(videoStories.storeId, storeId)).orderBy(desc(videoStories.createdAt));
    res.json({ stories: myStories });
  });
  app2.post("/api/stories", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const {
      name,
      title,
      shape,
      borderGradient,
      borderEnabled,
      showProducts,
      maxWidth,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      bubbleWidth,
      bubbleHeight,
      borderRadius,
      integrationMode,
      selector,
      insertionMethod,
      conditions,
      videoSelectionType,
      dynamicVideoConditions
    } = req.body;
    if (!name)
      return res.status(400).json({ error: "Nome da story \xE9 obrigat\xF3rio" });
    const [story] = await db.insert(videoStories).values({
      storeId,
      name,
      title,
      shape: shape || "round",
      borderGradient: borderGradient || "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
      borderEnabled: borderEnabled ?? true,
      showProducts: showProducts ?? true,
      maxWidth: maxWidth || "100%",
      marginTop: marginTop || "0px",
      marginRight: marginRight || "0px",
      marginBottom: marginBottom || "0px",
      marginLeft: marginLeft || "0px",
      paddingTop: paddingTop || "0px",
      paddingRight: paddingRight || "0px",
      paddingBottom: paddingBottom || "0px",
      paddingLeft: paddingLeft || "0px",
      bubbleWidth: bubbleWidth || "80px",
      bubbleHeight: bubbleHeight || "80px",
      integrationMode: integrationMode || "code",
      selector: selector || null,
      insertionMethod: insertionMethod || "after",
      conditions: conditions || [],
      videoSelectionType: videoSelectionType || "manual",
      dynamicVideoConditions: dynamicVideoConditions || []
    }).returning();
    res.status(201).json({ story });
  });
  app2.get("/api/stories/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const storyId = parseInt(req.params.id);
    const [story] = await db.select().from(videoStories).where(and(eq3(videoStories.id, storyId), eq3(videoStories.storeId, storeId))).limit(1);
    if (!story)
      return res.status(404).json({ error: "Story n\xE3o encontrada" });
    if (story.videoSelectionType === "dynamic") {
      const resolved = await resolveDynamicVideos(storeId, story.dynamicVideoConditions, true);
      const mappedVideos = resolved.videos.map((v, i) => ({
        id: v.id,
        title: v.title,
        mediaUrl: v.mediaUrl,
        thumbnailUrl: v.thumbnailUrl,
        position: i,
        productsList: resolved.productsByVideo[v.id] || []
      }));
      return res.json({ ...story, videos: mappedVideos });
    }
    const videosRaw = await db.select({
      id: shoppableVideos.id,
      title: shoppableVideos.title,
      mediaUrl: shoppableVideos.mediaUrl,
      thumbnailUrl: shoppableVideos.thumbnailUrl,
      position: storyVideos.position
    }).from(storyVideos).innerJoin(shoppableVideos, eq3(storyVideos.videoId, shoppableVideos.id)).where(eq3(storyVideos.storyId, storyId)).orderBy(storyVideos.position);
    const videoIds = videosRaw.map((v) => v.id);
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
    const videos = videosRaw.map((v) => ({
      ...v,
      productsList: productsByVideo[v.id] || []
    }));
    res.json({ ...story, videos });
  });
  app2.put("/api/stories/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const storyId = parseInt(req.params.id);
    const {
      name,
      title,
      shape,
      borderGradient,
      borderEnabled,
      showProducts,
      videos,
      maxWidth,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      bubbleWidth,
      bubbleHeight,
      borderRadius,
      integrationMode,
      selector,
      insertionMethod,
      conditions,
      videoSelectionType,
      dynamicVideoConditions
    } = req.body;
    const [existing] = await db.select().from(videoStories).where(and(eq3(videoStories.id, storyId), eq3(videoStories.storeId, storeId))).limit(1);
    if (!existing)
      return res.status(404).json({ error: "Story n\xE3o encontrada" });
    const [story] = await db.update(videoStories).set({
      name,
      title,
      shape,
      borderGradient,
      borderEnabled,
      showProducts,
      maxWidth,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      bubbleWidth,
      bubbleHeight,
      borderRadius: parseInt(borderRadius || "8"),
      integrationMode,
      selector,
      insertionMethod,
      conditions,
      videoSelectionType,
      dynamicVideoConditions,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(videoStories.id, storyId)).returning();
    if (videos && Array.isArray(videos)) {
      await db.delete(storyVideos).where(eq3(storyVideos.storyId, storyId));
      if (videos.length > 0) {
        await db.insert(storyVideos).values(
          videos.map((v, index) => ({
            storyId,
            videoId: v.id,
            position: index
          }))
        );
      }
    }
    res.json({ story });
  });
  app2.delete("/api/stories/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const storyId = parseInt(req.params.id);
    const [deleted] = await db.delete(videoStories).where(and(eq3(videoStories.id, storyId), eq3(videoStories.storeId, storeId))).returning();
    if (!deleted)
      return res.status(404).json({ error: "Story n\xE3o encontrada" });
    res.json({ success: true });
  });
  app2.get("/api/public/stories/:id", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Cache-Control", "no-store");
    try {
      const storyId = parseInt(req.params.id);
      if (isNaN(storyId))
        return res.status(400).json({ error: "ID inv\xE1lido" });
      const [story] = await db.select().from(videoStories).where(eq3(videoStories.id, storyId));
      if (!story)
        return res.status(404).json({ error: "Story n\xE3o encontrada" });
      const [store] = await db.select().from(stores).where(eq3(stores.id, story.storeId));
      if (store) {
        if (store.allowedDomain) {
          const origin = req.headers.origin || req.headers.referer;
          if (origin && !origin.includes(store.allowedDomain)) {
            return res.status(403).json({ error: "Dom\xEDnio n\xE3o autorizado para esta story." });
          }
        }
        const planId = store.plan;
        const isTrialActive = store.trialEndsAt && store.trialEndsAt > /* @__PURE__ */ new Date();
        const isTrialExpired = store.trialEndsAt && store.trialEndsAt <= /* @__PURE__ */ new Date();
        const isPaidPlan = !store.trialEndsAt && store.plan !== "free";
        if (isTrialExpired || !isTrialActive && !isPaidPlan) {
          return res.status(403).json({ error: "O trial gratuito desta loja expirou ou n\xE3o h\xE1 plano ativo. O conte\xFAdo est\xE1 bloqueado." });
        }
        const limits = PLANS[planId] || TRIAL_LIMITS;
        if (store.currentCycleViews >= limits.maxViews) {
          return res.status(403).json({ error: "Cota mensal de visualiza\xE7\xF5es da loja excedida. O conte\xFAdo est\xE1 bloqueado." });
        }
      }
      const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "0.0.0.0";
      if (shouldCountView(-storyId, ip)) {
        const date = todayUTC();
        db.execute(sql2`
                    INSERT INTO story_view_events (store_id, story_id, date, count)
                    VALUES (${story.storeId}, ${storyId}, ${date}, 1)
                    ON CONFLICT (store_id, story_id, date) 
                    DO UPDATE SET count = story_view_events.count + 1
                `).catch((e) => console.error("[view-tracker] Story view failed:", e));
        db.update(stores).set({
          currentCycleViews: sql2`${stores.currentCycleViews} + 1`
        }).where(eq3(stores.id, story.storeId)).catch((e) => console.error("[view-tracker] Views increment failed:", e));
      }
      if (story.videoSelectionType === "dynamic") {
        const resolved = await resolveDynamicVideos(story.storeId, story.dynamicVideoConditions, story.showProducts, req.query.pageUrl || "");
        const videos2 = resolved.videos.map((v, i) => ({
          id: v.id,
          title: v.title,
          mediaUrl: v.mediaUrl,
          thumbnailUrl: v.thumbnailUrl,
          position: i,
          products: (resolved.productsByVideo[v.id] || []).map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            imageLink: p.imageLink,
            link: p.link,
            startTime: p.startTime,
            endTime: p.endTime
          }))
        }));
        return res.json({ ...story, videos: videos2 });
      }
      const svRaw = await db.select({
        id: shoppableVideos.id,
        title: shoppableVideos.title,
        mediaUrl: shoppableVideos.mediaUrl,
        thumbnailUrl: shoppableVideos.thumbnailUrl,
        position: storyVideos.position
      }).from(storyVideos).innerJoin(shoppableVideos, eq3(storyVideos.videoId, shoppableVideos.id)).where(eq3(storyVideos.storyId, storyId)).orderBy(storyVideos.position);
      const videos = await Promise.all(svRaw.map(async (v) => {
        const productsList = await db.select({
          id: products.id,
          title: products.title,
          price: products.price,
          imageLink: products.imageLink,
          link: products.link,
          startTime: videoProducts.startTime,
          endTime: videoProducts.endTime
        }).from(videoProducts).innerJoin(products, eq3(videoProducts.productId, products.id)).where(eq3(videoProducts.videoId, v.id));
        const formattedProducts = productsList.map((p) => ({
          ...p,
          price: formatPrice(p.price)
        }));
        return { ...v, products: formattedProducts };
      }));
      res.json({
        ...story,
        videos
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/public/store-config", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Cache-Control", "no-store");
    try {
      const origin = req.headers.origin || req.headers.referer || "";
      if (!origin) {
        console.warn("[store-config] Origin/Referer missing");
        return res.status(400).json({ error: "Origin/Referer missing" });
      }
      const cleanOrigin = origin.replace(/^https?:\/\//, "").split("/")[0].split(":")[0].toLowerCase();
      const allStores = await db.select().from(stores);
      const store = allStores.find((s) => {
        if (!s.allowedDomain)
          return false;
        const cleanAllowed = s.allowedDomain.replace(/^https?:\/\//, "").split("/")[0].split(":")[0].toLowerCase();
        return cleanOrigin.includes(cleanAllowed) || cleanAllowed.includes(cleanOrigin);
      });
      if (!store) {
        console.warn(`[store-config] Loja n\xE3o encontrada para a origem: ${origin} (limpa: ${cleanOrigin})`);
        return res.status(404).json({ error: `Store not found for domain: ${cleanOrigin}. Certifique-se de que o dom\xEDnio est\xE1 configurado corretamente na loja.` });
      }
      const carousels = await db.select().from(videoCarousels).where(eq3(videoCarousels.storeId, store.id));
      const stories = await db.select().from(videoStories).where(eq3(videoStories.storeId, store.id));
      res.json({
        store: { id: store.id, name: store.name },
        carousels,
        stories
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
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
          ...record.product,
          price: formatPrice(record.product.price)
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
    const formattedVp = vp.map((record) => ({
      ...record,
      product: {
        ...record.product,
        price: formatPrice(record.product.price)
      }
    }));
    res.json({ video, videoProducts: formattedVp });
  });
  app2.post("/api/videos", authMiddleware, async (req, res) => {
    try {
      const storeId = getStoreId(req);
      const payload = req.user;
      const [activeStore] = await db.select().from(stores).where(and(eq3(stores.id, storeId), eq3(stores.ownerId, payload.userId)));
      if (!activeStore)
        return res.status(403).json({ error: "Loja n\xE3o encontrada ou acesso negado." });
      const planId = activeStore.plan;
      const isTrialActive = activeStore.trialEndsAt && activeStore.trialEndsAt > /* @__PURE__ */ new Date();
      const isTrialExpired = activeStore.trialEndsAt && activeStore.trialEndsAt <= /* @__PURE__ */ new Date();
      const isPaidPlan = !activeStore.trialEndsAt && activeStore.plan !== "free";
      if (isTrialExpired || !isTrialActive && !isPaidPlan) {
        return res.status(403).json({ error: "Seu trial gratuito expirou ou n\xE3o h\xE1 plano ativo. Assine um plano para continuar adicionando v\xEDdeos.", trialExpired: true });
      }
      const limits = PLANS[planId] || TRIAL_LIMITS;
      const [countRes] = await db.select({ count: sql2`count(*)`.mapWith(Number) }).from(shoppableVideos).where(eq3(shoppableVideos.storeId, storeId));
      const count = countRes.count;
      if (count >= limits.maxVideos) {
        return res.status(403).json({ error: `Limite atingido. Voc\xEA pode estocar at\xE9 ${limits.maxVideos} v\xEDdeo(s) no plano ${limits.name}. Fa\xE7a o upgrade para expandir.` });
      }
      const { title, description, mediaUrl, thumbnailUrl, tags } = req.body;
      const [video] = await db.insert(shoppableVideos).values({ storeId, title: title || "Novo V\xEDdeo", description, mediaUrl, thumbnailUrl, tags: tags || [] }).returning();
      res.status(201).json({ video });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/videos/preview-dynamic", authMiddleware, async (req, res) => {
    try {
      const storeId = getStoreId(req);
      const { conditions, fetchProducts, pageUrl } = req.body;
      if (!conditions || !Array.isArray(conditions)) {
        return res.json({ videos: [] });
      }
      const resolved = await resolveDynamicVideos(storeId, conditions, fetchProducts ?? true, pageUrl || "");
      const mappedVideos = resolved.videos.map((v) => ({
        id: v.id,
        title: v.title,
        mediaUrl: v.mediaUrl,
        thumbnailUrl: v.thumbnailUrl,
        productsList: resolved.productsByVideo[v.id] || []
      }));
      return res.json({ videos: mappedVideos });
    } catch (e) {
      console.error("Preview Dynamic Videos Error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/videos/:id", authMiddleware, async (req, res) => {
    const storeId = getStoreId(req);
    const videoId = parseInt(req.params.id);
    const { title, description, mediaUrl, thumbnailUrl, productsList, tags } = req.body;
    try {
      const [updated] = await db.update(shoppableVideos).set({ title, description, mediaUrl, thumbnailUrl, tags }).where(and(eq3(shoppableVideos.id, videoId), eq3(shoppableVideos.storeId, storeId))).returning();
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
    if (req.query.ids) {
      const rawIds = String(req.query.ids).split(",").map((id) => parseInt(id.trim())).filter((id) => !isNaN(id));
      if (rawIds.length === 0) {
        return res.json({ products: [], total: 0, page: 1, totalPages: 1 });
      }
      const list2 = await db.select().from(products).where(and(eq3(products.storeId, storeId), inArray(products.id, rawIds)));
      return res.json({ products: list2, total: list2.length, page: 1, totalPages: 1 });
    }
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
            currentCycleViews: 0,
            trialEndsAt: null
            // No longer a trial once paid
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
import path6 from "path";
import { eq as eq5 } from "drizzle-orm";
dotenv3.config();
var app = express3();
app.use(cors({ origin: "*" }));
var server = createServer(app);
app.use("/api/stripe/webhook", express3.raw({ type: "application/json" }));
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use("/uploads", express3.static(path6.resolve("uploads")));
registerRoutes(app);
await setupVite(app, server);
await db.update(catalogImports).set({ status: "failed", error: "Interrompido pela reinicializa\xE7\xE3o do servidor" }).where(eq5(catalogImports.status, "processing"));
startSyncScheduler();
var PORT = parseInt(process.env.PORT || "5000");
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
