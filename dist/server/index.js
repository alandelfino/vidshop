var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import dotenv2 from "dotenv";
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
import { eq as eq3, desc, ilike, or, sql as sql2 } from "drizzle-orm";

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
  users: () => users,
  videoCarousels: () => videoCarousels,
  videoProducts: () => videoProducts
});
import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var media = pgTable("media", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull().unique(),
  // UUID gerado no servidor
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  // bytes
  url: text("url").notNull(),
  // /uploads/<filename>
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var products = pgTable("products", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(),
  // g:id
  title: text("title").notNull(),
  // g:title
  description: text("description"),
  // g:description
  price: text("price"),
  // g:price
  imageLink: text("image_link"),
  // g:image_link
  link: text("link"),
  // g:link
  brand: text("brand"),
  // g:brand
  availability: text("availability"),
  // g:availability
  condition: text("condition"),
  // g:condition
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var catalogImports = pgTable("catalog_imports", {
  id: serial("id").primaryKey(),
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
  mediaUrl: text("media_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
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
  name: text("name").notNull(),
  title: text("title"),
  description: text("description"),
  showProducts: boolean("show_products").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var carouselVideos = pgTable("carousel_videos", {
  id: serial("id").primaryKey(),
  carouselId: integer("carousel_id").references(() => videoCarousels.id, { onDelete: "cascade" }).notNull(),
  videoId: integer("video_id").references(() => shoppableVideos.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull().default(0)
});

// server/db.ts
import dotenv from "dotenv";
dotenv.config();
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/upload.ts
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import path2 from "path";
import { v4 as uuidv4 } from "uuid";
var R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
var R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
var R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
var R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.warn("Aviso: Credenciais do Cloudflare R2 n\xE3o est\xE3o totalmente configuradas no .env. O upload falhar\xE1.");
}
var s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || ""
  }
});
var storage = multerS3({
  s3: s3Client,
  bucket: R2_BUCKET || "",
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function(_req, file, cb) {
    const ext = path2.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
function fileFilter(_req, file, cb) {
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo n\xE3o permitido. Somente imagens e v\xEDdeos s\xE3o aceitos."));
  }
}
var upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
  // 100 MB
});

// server/routes.ts
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

// server/queue.ts
import fs2 from "fs";
import path3 from "path";
import { eq as eq2 } from "drizzle-orm";

// server/catalogParser.ts
import sax from "sax";
import { eq, sql } from "drizzle-orm";
async function parseCatalogStream(stream, importId) {
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
        await parseCatalogStream(stream, job.id);
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
import { v4 as uuidv42 } from "uuid";

// server/public-script.ts
var publicScript = `
(function() {
  var API_ORIGIN = "__API_ORIGIN__";

  function injectStyles() {
    if (document.getElementById("onstore-frc-styles")) return;
    var style = document.createElement("style");
    style.id = "onstore-frc-styles";
    style.textContent = " \\
        .fashion-reels-carousel { width: 100%; overflow: hidden; display: flex; justify-content: center; padding: 60px 0; padding-top: 0px; contain: layout paint style; background-color: transparent; } \\
        .fashion-reels-carousel * { box-sizing: border-box; } \\
        .fashion-reels-carousel .frc-carousel { position: relative; width: 100%; max-width: 1200px; height: 500px; display: flex; align-items: center; justify-content: center; isolation: isolate; perspective: 1200px; } \\
        .fashion-reels-carousel .frc-slide { position: absolute; width: auto; height: 100%; aspect-ratio: 9 / 16; border-radius: 24px; overflow: hidden; opacity: 0; transform: translateX(0) scale(.8) rotateY(0deg); transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease, box-shadow 0.6s ease; will-change: transform, opacity; backface-visibility: hidden; -webkit-backface-visibility: hidden; background: #000; pointer-events: none; box-shadow: 0 10px 30px rgba(0,0,0,0.1); } \\
        .fashion-reels-carousel .frc-slide video { width: 100%; height: 100%; object-fit: cover; display: block; background: #000; transition: filter 0.6s ease; filter: brightness(0.6); } \\
        .fashion-reels-carousel .frc-slide.is-center { transform: translateX(0) scale(1) rotateY(0deg); opacity: 1; z-index: 5; pointer-events: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); } \\
        .fashion-reels-carousel .frc-slide.is-center video { filter: brightness(1); } \\
        .fashion-reels-carousel .frc-slide.is-left-1 { transform: translateX(-85%) scale(.85) rotateY(12deg); opacity: .8; z-index: 4; } \\
        .fashion-reels-carousel .frc-slide.is-right-1 { transform: translateX(85%) scale(.85) rotateY(-12deg); opacity: .8; z-index: 4; } \\
        .fashion-reels-carousel .frc-slide.is-left-2 { transform: translateX(-160%) scale(.7) rotateY(20deg); opacity: .4; z-index: 3; } \\
        .fashion-reels-carousel .frc-slide.is-right-2 { transform: translateX(160%) scale(.7) rotateY(-20deg); opacity: .4; z-index: 3; } \\
        .fashion-reels-carousel .frc-slide.is-hidden-left { transform: translateX(-220%) scale(.6) rotateY(25deg); opacity: 0; z-index: 1; } \\
        .fashion-reels-carousel .frc-slide.is-hidden-right { transform: translateX(220%) scale(.6) rotateY(-25deg); opacity: 0; z-index: 1; } \\
        @media (max-width: 900px) { .fashion-reels-carousel .frc-carousel { height: 450px; } } \\
        @media (max-width: 600px) { \\
            .fashion-reels-carousel { padding: 50px 0; } \\
            .fashion-reels-carousel .frc-carousel { height: calc(76vw * 16 / 9); max-height: 85vh; min-height: 380px; perspective: 800px; } \\
            .fashion-reels-carousel .frc-slide { width: 76%; max-width: calc(85vh * 9 / 16); height: auto; aspect-ratio: 9 / 16; border-radius: 18px; } \\
            .fashion-reels-carousel .frc-slide.is-left-1 { transform: translateX(-65%) scale(.85) rotateY(20deg); opacity: 0.9; } \\
            .fashion-reels-carousel .frc-slide.is-right-1 { transform: translateX(65%) scale(.85) rotateY(-20deg); opacity: 0.9; } \\
            .fashion-reels-carousel .frc-slide.is-left-2 { transform: translateX(-110%) scale(.7) rotateY(30deg); opacity: 0.5; } \\
            .fashion-reels-carousel .frc-slide.is-right-2 { transform: translateX(110%) scale(.7) rotateY(-30deg); opacity: 0.5; } \\
            .fashion-reels-carousel .frc-slide.is-hidden-left { transform: translateX(-160%) scale(.6) rotateY(35deg); opacity: 0; } \\
            .fashion-reels-carousel .frc-slide.is-hidden-right { transform: translateX(160%) scale(.6) rotateY(-35deg); opacity: 0; } \\
        } \\
        @media (prefers-reduced-motion: reduce) { .fashion-reels-carousel .frc-slide { transition: none; } } \\
        .fashion-reels-carousel .frc-controls { position: absolute; top: 8px; right: 8px; display: flex; flex-direction: column; gap: 8px; opacity: 0; transition: opacity 0.3s ease; z-index: 10; pointer-events: none; } \\
        .fashion-reels-carousel .frc-slide.is-center .frc-controls { opacity: 1; pointer-events: auto; } \\
        .fashion-reels-carousel .frc-btn { background: transparent; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: background 0.2s, transform 0.2s; } \\
        .fashion-reels-carousel .frc-btn:active { transform: scale(0.9); } \\
        .fashion-reels-carousel .frc-btn:hover { background: rgba(0, 0, 0, 0.7); } \\
        .fashion-reels-carousel .frc-btn svg { width: 20px; height: 20px; } \\
    ";
    document.head.appendChild(style);
  }

  function buildCarousel(el, data) {
    if (!data.carousel.showProducts) { el.style.display = "none"; return; }
    var originalVideos = data.videos || [];
    if (!originalVideos.length) return;

    // Pad videos array if less than 6
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

    var html = '<div class="frc-carousel">';
    videos.forEach(function(v) {
      html += '<div class="frc-slide">';
      html += '<video muted playsinline loop preload="none" poster="' + (v.thumbnailUrl ? escAttr(v.thumbnailUrl) : '') + '">';
      html += '<source src="' + escAttr(v.mediaUrl) + '" type="video/mp4">';
      html += '</video></div>';
    });
    html += '</div>';

    el.innerHTML = html;
    initCarouselLogic(el);
  }

  function escAttr(s) { return String(s).replace(/"/g,"&quot;"); }

  function initCarouselLogic(root) {
      if (root.dataset.frcInitialized === "true") return;
      root.dataset.frcInitialized = "true";

      var slides = Array.from(root.querySelectorAll(".frc-slide"));
      var videos = slides.map(function(slide) { return slide.querySelector("video"); });
      var autoplayDelay = Number(root.dataset.autoplay || 6000);

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
          if (offset > total / 2) offset -= total;
          if (offset < -total / 2) offset += total;
          return offset;
      }

      function applyClasses() {
          var total = slides.length;
          slides.forEach(function(slide, index) {
              slide.className = "frc-slide";
              var offset = getOffset(index, current, total);
              if (offset === 0) slide.classList.add("is-center");
              else if (offset === -1) slide.classList.add("is-left-1");
              else if (offset === 1) slide.classList.add("is-right-1");
              else if (offset === -2) slide.classList.add("is-left-2");
              else if (offset === 2) slide.classList.add("is-right-2");
              else if (offset < 0) slide.classList.add("is-hidden-left");
              else slide.classList.add("is-hidden-right");
          });
      }

      function pauseAllVideos() {
          videos.forEach(function(video) {
              try { video.pause(); } catch (e) { }
          });
      }

      function playCurrentVideo() {
          if (isManualPause) {
              pauseAllVideos();
              return;
          }
          videos.forEach(function(video, index) {
              if (index === current && isVisible && isPageVisible) {
                  if (lastCurrent !== current) {
                      try { video.currentTime = 0; } catch (e) { }
                  }
                  var playPromise = video.play();
                  if (playPromise && typeof playPromise.catch === "function") {
                      playPromise.catch(function() { });
                  }
              } else {
                  try { video.pause(); } catch (e) { }
              }
          });
          lastCurrent = current;
      }

      function update() {
          isManualPause = false; // Reset pauser override on slide change
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
          if (timer || !isVisible || !isPageVisible || isManualPause) return;
          timer = window.setInterval(next, autoplayDelay);
      }

      function stopTimer() {
          if (!timer) return;
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
          isVisible = true; // Fallback
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

      root.addEventListener('touchstart', function(e) {
          touchStartX = e.changedTouches[0].screenX;
          touchStartY = e.changedTouches[0].screenY;
          isSwipingHorizontal = null;
          root.dataset.isDragging = "true";
      }, { passive: true });

      root.addEventListener('touchmove', function(e) {
          if (!root.dataset.isDragging) return;
          var touchCurrentX = e.changedTouches[0].screenX;
          var touchCurrentY = e.changedTouches[0].screenY;
          var dx = Math.abs(touchCurrentX - touchStartX);
          var dy = Math.abs(touchCurrentY - touchStartY);
          if (isSwipingHorizontal === null) {
              if (dx > dy && dx > 5) isSwipingHorizontal = true;
              else if (dy > dx && dy > 5) isSwipingHorizontal = false;
          }
          if (isSwipingHorizontal) {
              if (e.cancelable) e.preventDefault();
          }
      }, { passive: false });

      root.addEventListener('touchend', function(e) {
          root.dataset.isDragging = "";
          if (isSwipingHorizontal === false) return;
          
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
      root.addEventListener('mousedown', function(e) {
          isDragging = true;
          mouseStart = e.screenX;
      });
      
      root.addEventListener('mouseup', function(e) {
          if (!isDragging) return;
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
          setTimeout(function() { root.dataset.lastDragDist = '0'; }, 50);
      });
      
      root.addEventListener('mouseleave', function() {
          isDragging = false;
      });

      videos.forEach(function(video, index) {
          video.muted = true;
          video.addEventListener('play', function() {
              var slide = slides[index];
              var playBtn = slide.querySelector('.frc-play-btn');
              if (playBtn) {
                  playBtn.querySelector('.icon-pause').style.display = 'block';
                  playBtn.querySelector('.icon-play').style.display = 'none';
              }
          });
          video.addEventListener('pause', function() {
              var slide = slides[index];
              var playBtn = slide.querySelector('.frc-play-btn');
              if (playBtn) {
                  playBtn.querySelector('.icon-pause').style.display = 'none';
                  playBtn.querySelector('.icon-play').style.display = 'block';
              }
          });
          video.addEventListener('volumechange', function() {
              var slide = slides[index];
              var muteBtn = slide.querySelector('.frc-mute-btn');
              if (muteBtn) {
                  muteBtn.querySelector('.icon-mute').style.display = video.muted ? 'block' : 'none';
                  muteBtn.querySelector('.icon-unmute').style.display = video.muted ? 'none' : 'block';
              }
          });
      });

      slides.forEach(function(slide, index) {
          var controls = document.createElement('div');
          controls.className = 'frc-controls';
          controls.innerHTML = [
            '<button class="frc-btn frc-mute-btn" aria-label="Mute/Unmute">',
            '    <svg class="icon-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
            '    <svg class="icon-unmute" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
            '</button>',
            '<button class="frc-btn frc-play-btn" aria-label="Play/Pause">',
            '    <svg class="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
            '    <svg class="icon-play" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
            '</button>'
          ].join("");
          slide.appendChild(controls);

          var video = videos[index];
          var muteBtn = controls.querySelector('.frc-mute-btn');
          var playBtn = controls.querySelector('.frc-play-btn');

          muteBtn.addEventListener('click', function(e) {
              e.stopPropagation(); // prevent triggering the slide click
              var setMuted = !video.muted;
              videos.forEach(function(v) { v.muted = setMuted; });
          });

          playBtn.addEventListener('click', function(e) {
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
              if (Number(root.dataset.lastDragDist) > 40) return;
              if (index === current) {
                  // Toggle audio if center slide clicked
                  var setMuted = !video.muted;
                  videos.forEach(function(v) { v.muted = setMuted; });
              } else {
                  current = index;
                  update();
                  resetTimer();
              }
          });
      });

      update();
  }

  function init() {
    injectStyles();
    var els = document.querySelectorAll("[data-onstore-carousel]");
    els.forEach(function(el) {
      var cid = el.getAttribute("data-onstore-carousel");
      if (!cid || el.dataset.onstoreLoaded) return;
      el.dataset.onstoreLoaded = "1";
      fetch(API_ORIGIN + "/api/public/carousels/" + cid)
        .then(function(r) { return r.json(); })
        .then(function(data) { buildCarousel(el, data); })
        .catch(function(e) { console.warn("[onstore] Erro carrossel #" + cid, e); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`;

// server/routes.ts
var JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
var xmlUpload = multer2({
  storage: multer2.diskStorage({
    destination: "uploads",
    filename: (_req, file, cb) => cb(null, `${uuidv42()}.xml`)
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
    const [user] = await db.insert(users).values({ name, email, passwordHash }).returning({ id: users.id, name: users.name, email: users.email });
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d"
    });
    res.status(201).json({ token, user });
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
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d"
    });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });
  app2.get("/api/auth/me", authMiddleware, async (req, res) => {
    const payload = req.user;
    const [user] = await db.select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt }).from(users).where(eq3(users.id, payload.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
      return;
    }
    res.json({ user });
  });
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
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Nenhum arquivo enviado." });
        return;
      }
      const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
      const url = publicDomain ? `${publicDomain}/${file.key}` : file.location;
      const [inserted] = await db.insert(media).values({
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
  app2.get("/api/media", authMiddleware, async (_req, res) => {
    const items = await db.select().from(media).orderBy(desc(media.createdAt));
    res.json({ media: items });
  });
  app2.delete("/api/media/:id", authMiddleware, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inv\xE1lido" });
      return;
    }
    const [item] = await db.select().from(media).where(eq3(media.id, id)).limit(1);
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
    await db.delete(media).where(eq3(media.id, id));
    res.json({ success: true });
  });
  app2.post(
    "/api/catalog/import",
    authMiddleware,
    xmlUpload.single("file"),
    async (req, res) => {
      const file = req.file;
      const { url } = req.body;
      if (!file && !url) {
        res.status(400).json({ error: "Forne\xE7a um arquivo XML ou uma URL HTTP" });
        return;
      }
      let job;
      if (file) {
        [job] = await db.insert(catalogImports).values({ sourceType: "file", sourceUrl: file.filename }).returning();
      } else {
        [job] = await db.insert(catalogImports).values({ sourceType: "url", sourceUrl: url }).returning();
      }
      processQueue().catch(console.error);
      res.status(202).json({ job, message: "Importa\xE7\xE3o adicionada \xE0 fila." });
    }
  );
  app2.get("/api/catalog/imports", authMiddleware, async (_req, res) => {
    const list = await db.select().from(catalogImports).orderBy(desc(catalogImports.createdAt));
    res.json({ imports: list });
  });
  app2.post("/api/catalog/sync", authMiddleware, async (req, res) => {
    try {
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
        url,
        frequencyDays,
        syncTime,
        nextSyncAt: nextSync
      }).returning();
      const [importJob] = await db.insert(catalogImports).values({
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
    const list = await db.select().from(catalogSyncs).orderBy(desc(catalogSyncs.createdAt));
    res.json({ syncs: list });
  });
  app2.delete("/api/catalog/syncs/:id", authMiddleware, async (req, res) => {
    await db.delete(catalogSyncs).where(eq3(catalogSyncs.id, parseInt(req.params.id)));
    res.sendStatus(204);
  });
  app2.get("/api/public/carousels/:id", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    try {
      const carouselId = parseInt(req.params.id);
      if (isNaN(carouselId))
        return res.status(400).json({ error: "ID inv\xE1lido" });
      const [carousel] = await db.select().from(videoCarousels).where(eq3(videoCarousels.id, carouselId));
      if (!carousel)
        return res.status(404).json({ error: "Carrossel n\xE3o encontrado" });
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
      res.json({ carousel, videos: cv.map((r) => r.video) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/embed/carousel.js", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const origin = process.env.PUBLIC_URL || "";
    res.send(publicScript.replace("__API_ORIGIN__", origin));
  });
  app2.get("/api/carousels", authMiddleware, async (_req, res) => {
    const list = await db.select().from(videoCarousels).orderBy(desc(videoCarousels.createdAt));
    res.json({ carousels: list });
  });
  app2.get("/api/carousels/:id", authMiddleware, async (req, res) => {
    const carouselId = parseInt(req.params.id);
    const [carousel] = await db.select().from(videoCarousels).where(eq3(videoCarousels.id, carouselId));
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
        mediaUrl: shoppableVideos.mediaUrl
      }
    }).from(carouselVideos).innerJoin(shoppableVideos, eq3(carouselVideos.videoId, shoppableVideos.id)).where(eq3(carouselVideos.carouselId, carouselId)).orderBy(carouselVideos.position);
    res.json({ carousel, videos: cv });
  });
  app2.post("/api/carousels", authMiddleware, async (req, res) => {
    try {
      const { name, title, description, showProducts } = req.body;
      const [carousel] = await db.insert(videoCarousels).values({
        name: name || "Novo Carrossel",
        title,
        description,
        showProducts: showProducts ?? true
      }).returning();
      res.status(201).json({ carousel });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/carousels/:id", authMiddleware, async (req, res) => {
    const carouselId = parseInt(req.params.id);
    const { name, title, description, showProducts, videoIds } = req.body;
    try {
      const [updated] = await db.update(videoCarousels).set({ name, title, description, showProducts, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(videoCarousels.id, carouselId)).returning();
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
      res.json({ carousel: updated });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/carousels/:id", authMiddleware, async (req, res) => {
    await db.delete(videoCarousels).where(eq3(videoCarousels.id, parseInt(req.params.id)));
    res.sendStatus(204);
  });
  app2.get("/api/videos", authMiddleware, async (_req, res) => {
    const list = await db.select().from(shoppableVideos).orderBy(desc(shoppableVideos.createdAt));
    res.json({ videos: list });
  });
  app2.get("/api/videos/:id", authMiddleware, async (req, res) => {
    const videoId = parseInt(req.params.id);
    const [video] = await db.select().from(shoppableVideos).where(eq3(shoppableVideos.id, videoId));
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
      const { title, description, mediaUrl, thumbnailUrl } = req.body;
      const [video] = await db.insert(shoppableVideos).values({ title: title || "Novo V\xEDdeo", description, mediaUrl, thumbnailUrl }).returning();
      res.status(201).json({ video });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/videos/:id", authMiddleware, async (req, res) => {
    const videoId = parseInt(req.params.id);
    const { title, description, mediaUrl, thumbnailUrl, productsList } = req.body;
    try {
      const [updated] = await db.update(shoppableVideos).set({ title, description, mediaUrl, thumbnailUrl }).where(eq3(shoppableVideos.id, videoId)).returning();
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
      res.json({ video: updated });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/videos/:id", authMiddleware, async (req, res) => {
    await db.delete(shoppableVideos).where(eq3(shoppableVideos.id, parseInt(req.params.id)));
    res.sendStatus(204);
  });
  app2.get("/api/products", authMiddleware, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;
    let condition = void 0;
    if (search) {
      condition = or(
        ilike(products.title, `%${search}%`),
        ilike(products.externalId, `%${search}%`)
      );
    }
    const [countResult] = await db.select({ count: sql2`count(*)`.mapWith(Number) }).from(products).where(condition);
    const total = countResult.count;
    const list = await db.select().from(products).where(condition).orderBy(desc(products.createdAt)).limit(limit).offset(offset);
    res.json({ products: list, total, page, totalPages: Math.ceil(total / limit) || 1 });
  });
  app2.put("/api/products/:id", authMiddleware, async (req, res) => {
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
    }).where(eq3(products.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Produto n\xE3o encontrado" });
      return;
    }
    res.json({ product: updated });
  });
  app2.delete("/api/products/:id", authMiddleware, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inv\xE1lido" });
      return;
    }
    const [deleted] = await db.delete(products).where(eq3(products.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Produto n\xE3o encontrado" });
      return;
    }
    res.json({ success: true });
  });
}

// server/syncScheduler.ts
import { eq as eq4, and, lte } from "drizzle-orm";
function startSyncScheduler() {
  setInterval(async () => {
    try {
      const pendingSyncs = await db.select().from(catalogSyncs).where(
        and(
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
import path4 from "path";
import { eq as eq5 } from "drizzle-orm";
dotenv2.config();
var app = express2();
app.use(cors({ origin: "*" }));
var server = createServer(app);
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use("/uploads", express2.static(path4.resolve("uploads")));
registerRoutes(app);
await setupVite(app, server);
await db.update(catalogImports).set({ status: "failed", error: "Interrompido pela reinicializa\xE7\xE3o do servidor" }).where(eq5(catalogImports.status, "processing"));
startSyncScheduler();
var PORT = parseInt(process.env.PORT || "5000");
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
