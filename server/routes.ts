import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, desc, ilike, or, sql } from "drizzle-orm";
import fs from "fs";
import { db } from "./db.js";
import { users, media, products, catalogImports, catalogSyncs, shoppableVideos, videoProducts, videoCarousels, carouselVideos } from "../shared/schema.js";
import { upload, s3Client } from "./upload.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { processQueue } from "./queue.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

const xmlUpload = multer({
  storage: multer.diskStorage({
    destination: "uploads",
    filename: (_req, file, cb) => cb(null, `${uuidv4()}.xml`),
  }),
  limits: { fileSize: 1024 * 1024 * 500 }, // 500MB limit for massive catalogs
});

export interface JwtPayload {
  userId: number;
  email: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export function registerRoutes(app: Express) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email e password são obrigatórios" });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "E-mail já cadastrado" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({ id: users.id, name: users.name, email: users.email });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token, user });
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "email e password são obrigatórios" });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });

  app.get("/api/auth/me", authMiddleware, async (req: Request, res: Response) => {
    const payload = (req as any).user as JwtPayload;
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    res.json({ user });
  });

  // ── Media ─────────────────────────────────────────────────────────────────

  // POST /api/media/upload
  app.post(
    "/api/media/upload",
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) => {
      upload.single("file")(req, res, (err) => {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      const file = req.file as any; // multer-s3 adds key and location
      if (!file) {
        res.status(400).json({ error: "Nenhum arquivo enviado." });
        return;
      }

      const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
      const url = publicDomain ? `${publicDomain}/${file.key}` : file.location;

      const [inserted] = await db
        .insert(media)
        .values({
          filename: file.key, // multer-s3 uses 'key' instead of 'filename'
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url,
        })
        .returning();

      res.status(201).json({ media: inserted });
    }
  );

  // GET /api/media
  app.get("/api/media", authMiddleware, async (_req: Request, res: Response) => {
    const items = await db.select().from(media).orderBy(desc(media.createdAt));
    res.json({ media: items });
  });

  // DELETE /api/media/:id
  app.delete("/api/media/:id", authMiddleware, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!item) {
      res.status(404).json({ error: "Mídia não encontrada" });
      return;
    }

    // Remove from R2
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: item.filename, // we stored the S3 key in the filename col
        })
      );
    } catch (error) {
      console.error("Erro ao deletar arquivo do R2:", error);
      // We continue to delete from DB even if R2 deletion fails, or we could return 500.
    }

    await db.delete(media).where(eq(media.id, id));
    res.json({ success: true });
  });

  // ── Products & Catalog ────────────────────────────────────────────────────

  app.post(
    "/api/catalog/import",
    authMiddleware,
    xmlUpload.single("file"),
    async (req: Request, res: Response) => {
      const file = req.file;
      const { url } = req.body;

      if (!file && !url) {
        res.status(400).json({ error: "Forneça um arquivo XML ou uma URL HTTP" });
        return;
      }

      let job;
      if (file) {
        [job] = await db
          .insert(catalogImports)
          .values({ sourceType: "file", sourceUrl: file.filename })
          .returning();
      } else {
        [job] = await db
          .insert(catalogImports)
          .values({ sourceType: "url", sourceUrl: url })
          .returning();
      }

      processQueue().catch(console.error);
      res.status(202).json({ job, message: "Importação adicionada à fila." });
    }
  );

  app.get("/api/catalog/imports", authMiddleware, async (_req: Request, res: Response) => {
    const list = await db.select().from(catalogImports).orderBy(desc(catalogImports.createdAt));
    res.json({ imports: list });
  });

  // Sync Automation Routes
  app.post("/api/catalog/sync", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { url, frequencyDays, syncTime } = req.body;
      if (!url || !frequencyDays || !syncTime) {
        return res.status(400).json({ error: "Parâmetros de configuração inválidos." });
      }

      const now = new Date();
      const [hours, minutes] = syncTime.split(":").map(Number);
      
      const nextSync = new Date();
      nextSync.setHours(hours, minutes, 0, 0);
      
      if (nextSync <= now) {
         nextSync.setDate(nextSync.getDate() + 1);
      }

      const [syncRecord] = await db.insert(catalogSyncs).values({
        url,
        frequencyDays,
        syncTime,
        nextSyncAt: nextSync,
      }).returning();

      const [importJob] = await db.insert(catalogImports).values({
        sourceType: "url",
        sourceUrl: url,
        status: "pending",
      }).returning();

      res.status(201).json({ sync: syncRecord, import: importJob });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/catalog/syncs", authMiddleware, async (req: Request, res: Response) => {
    const list = await db.select().from(catalogSyncs).orderBy(desc(catalogSyncs.createdAt));
    res.json({ syncs: list });
  });

  app.delete("/api/catalog/syncs/:id", authMiddleware, async (req: Request, res: Response) => {
    await db.delete(catalogSyncs).where(eq(catalogSyncs.id, parseInt(req.params.id)));
    res.sendStatus(204);
  });

  // ─── PUBLIC EMBED ENDPOINTS (no auth, CORS open) ───────────────────────────

  // Public carousel data API
  app.get("/api/public/carousels/:id", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    try {
      const carouselId = parseInt(req.params.id);
      if (isNaN(carouselId)) return res.status(400).json({ error: "ID inválido" });

      const [carousel] = await db.select().from(videoCarousels).where(eq(videoCarousels.id, carouselId));
      if (!carousel) return res.status(404).json({ error: "Carrossel não encontrado" });

      const cv = await db.select({
        videoId: carouselVideos.videoId,
        position: carouselVideos.position,
        video: {
          id: shoppableVideos.id,
          title: shoppableVideos.title,
          description: shoppableVideos.description,
          mediaUrl: shoppableVideos.mediaUrl,
        }
      })
      .from(carouselVideos)
      .innerJoin(shoppableVideos, eq(carouselVideos.videoId, shoppableVideos.id))
      .where(eq(carouselVideos.carouselId, carouselId))
      .orderBy(carouselVideos.position);

      res.json({ carousel, videos: cv.map(r => r.video) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // carousel.js embed widget
  app.get("/embed/carousel.js", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");

    const origin = process.env.PUBLIC_URL || "";

    res.send(`
(function() {
  var API_ORIGIN = "${origin}";

  function formatTime(s) {
    var m = Math.floor(s / 60).toString().padStart(2, "0");
    return m + ":" + Math.floor(s % 60).toString().padStart(2, "0");
  }

  function injectStyles() {
    if (document.getElementById("onstore-carousel-styles")) return;
    var style = document.createElement("style");
    style.id = "onstore-carousel-styles";
    style.textContent = [
      ".onstore-carousel{font-family:system-ui,sans-serif;max-width:100%;box-sizing:border-box}",
      ".onstore-carousel__header{margin-bottom:12px}",
      ".onstore-carousel__title{font-size:1.25rem;font-weight:700;margin:0 0 4px}",
      ".onstore-carousel__desc{font-size:.875rem;color:#666;margin:0}",
      ".onstore-carousel__track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:4px 2px 12px}",
      ".onstore-carousel__track::-webkit-scrollbar{display:none}",
      ".onstore-carousel__item{flex:0 0 280px;scroll-snap-align:start;border-radius:12px;overflow:hidden;background:#000;position:relative;box-shadow:0 2px 12px rgba(0,0,0,.15)}",
      ".onstore-carousel__item video{width:100%;aspect-ratio:9/16;object-fit:cover;display:block}",
      ".onstore-carousel__item-label{position:absolute;bottom:0;left:0;right:0;padding:12px;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff}",
      ".onstore-carousel__item-title{font-size:.875rem;font-weight:600;margin:0;line-height:1.3}",
      ".onstore-carousel__nav{display:flex;justify-content:center;gap:8px;margin-top:8px}",
      ".onstore-carousel__nav button{width:8px;height:8px;border-radius:50%;border:none;background:#ccc;cursor:pointer;padding:0;transition:background .2s}",
      ".onstore-carousel__nav button.active{background:#333;width:20px;border-radius:4px}",
    ].join("");
    document.head.appendChild(style);
  }

  function buildCarousel(el, data) {
    if (!data.carousel.showProducts) { el.style.display = "none"; return; }
    var videos = data.videos || [];
    if (!videos.length) return;

    el.classList.add("onstore-carousel");

    var html = "";
    if (data.carousel.title) {
      html += '<div class="onstore-carousel__header">';
      html += '<p class="onstore-carousel__title">' + escHtml(data.carousel.title) + "</p>";
      if (data.carousel.description) html += '<p class="onstore-carousel__desc">' + escHtml(data.carousel.description) + "</p>";
      html += "</div>";
    }

    html += '<div class="onstore-carousel__track">';
    videos.forEach(function(v) {
      html += '<div class="onstore-carousel__item">';
      html += '<video src="' + escAttr(v.mediaUrl) + '" muted loop playsinline preload="metadata"></video>';
      html += '<div class="onstore-carousel__item-label"><p class="onstore-carousel__item-title">' + escHtml(v.title) + "</p></div>";
      html += "</div>";
    });
    html += "</div>";

    if (videos.length > 1) {
      html += '<div class="onstore-carousel__nav">';
      videos.forEach(function(_, i) { html += '<button class="' + (i === 0 ? "active" : "") + '" data-idx="' + i + '"></button>'; });
      html += "</div>";
    }

    el.innerHTML = html;

    // Auto-play on hover
    el.querySelectorAll("video").forEach(function(vid) {
      vid.addEventListener("mouseenter", function() { vid.play(); });
      vid.addEventListener("mouseleave", function() { vid.pause(); vid.currentTime = 0; });
    });

    // Dot navigation
    var track = el.querySelector(".onstore-carousel__track");
    var dots = el.querySelectorAll(".onstore-carousel__nav button");
    if (track && dots.length) {
      track.addEventListener("scroll", function() {
        var idx = Math.round(track.scrollLeft / (track.scrollWidth / dots.length));
        dots.forEach(function(d, i) { d.classList.toggle("active", i === idx); });
      });
      dots.forEach(function(dot) {
        dot.addEventListener("click", function() {
          var i = parseInt(dot.getAttribute("data-idx"));
          var itemW = track.querySelector(".onstore-carousel__item").offsetWidth + 12;
          track.scrollTo({ left: i * itemW, behavior: "smooth" });
        });
      });
    }
  }

  function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function escAttr(s) { return String(s).replace(/"/g,"&quot;"); }

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
`);
  });

  // Video Carousels

  app.get("/api/carousels", authMiddleware, async (_req: Request, res: Response) => {
    const list = await db.select().from(videoCarousels).orderBy(desc(videoCarousels.createdAt));
    res.json({ carousels: list });
  });

  app.get("/api/carousels/:id", authMiddleware, async (req: Request, res: Response) => {
    const carouselId = parseInt(req.params.id);
    const [carousel] = await db.select().from(videoCarousels).where(eq(videoCarousels.id, carouselId));
    if (!carousel) return res.status(404).json({ error: "Carrossel não encontrado" });

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
      }
    })
    .from(carouselVideos)
    .innerJoin(shoppableVideos, eq(carouselVideos.videoId, shoppableVideos.id))
    .where(eq(carouselVideos.carouselId, carouselId))
    .orderBy(carouselVideos.position);

    res.json({ carousel, videos: cv });
  });

  app.post("/api/carousels", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { name, title, description, showProducts } = req.body;
      const [carousel] = await db.insert(videoCarousels).values({
        name: name || "Novo Carrossel",
        title,
        description,
        showProducts: showProducts ?? true,
      }).returning();
      res.status(201).json({ carousel });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/carousels/:id", authMiddleware, async (req: Request, res: Response) => {
    const carouselId = parseInt(req.params.id);
    const { name, title, description, showProducts, videoIds } = req.body;
    try {
      const [updated] = await db.update(videoCarousels)
        .set({ name, title, description, showProducts, updatedAt: new Date() })
        .where(eq(videoCarousels.id, carouselId))
        .returning();

      if (!updated) return res.status(404).json({ error: "Carrossel não encontrado" });

      if (videoIds && Array.isArray(videoIds)) {
        await db.delete(carouselVideos).where(eq(carouselVideos.carouselId, carouselId));
        if (videoIds.length > 0) {
          await db.insert(carouselVideos).values(
            videoIds.map((vid: number, idx: number) => ({
              carouselId,
              videoId: vid,
              position: idx,
            }))
          );
        }
      }
      res.json({ carousel: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/carousels/:id", authMiddleware, async (req: Request, res: Response) => {
    await db.delete(videoCarousels).where(eq(videoCarousels.id, parseInt(req.params.id)));
    res.sendStatus(204);
  });

  // Shoppable Videos APIs
  app.get("/api/videos", authMiddleware, async (_req: Request, res: Response) => {
    const list = await db.select().from(shoppableVideos).orderBy(desc(shoppableVideos.createdAt));
    res.json({ videos: list });
  });

  app.get("/api/videos/:id", authMiddleware, async (req: Request, res: Response) => {
    const videoId = parseInt(req.params.id);
    const [video] = await db.select().from(shoppableVideos).where(eq(shoppableVideos.id, videoId));
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });

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
        imageLink: products.imageLink,
      }
    })
    .from(videoProducts)
    .innerJoin(products, eq(videoProducts.productId, products.id))
    .where(eq(videoProducts.videoId, videoId))
    .orderBy(videoProducts.startTime);

    res.json({ video, videoProducts: vp });
  });

  app.post("/api/videos", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { title, description, mediaUrl } = req.body;
      const [video] = await db.insert(shoppableVideos).values({ title: title || "Novo Vídeo", description, mediaUrl }).returning();
      res.status(201).json({ video });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/videos/:id", authMiddleware, async (req: Request, res: Response) => {
    const videoId = parseInt(req.params.id);
    const { title, description, mediaUrl, productsList } = req.body;
    
    try {
      const [updated] = await db.update(shoppableVideos)
        .set({ title, description, mediaUrl })
        .where(eq(shoppableVideos.id, videoId))
        .returning();

      if (!updated) return res.status(404).json({ error: "Vídeo não encontrado" });

      if (productsList && Array.isArray(productsList)) {
        await db.delete(videoProducts).where(eq(videoProducts.videoId, videoId));
        if (productsList.length > 0) {
          const insertData = productsList.map((p: any) => ({
            videoId,
            productId: p.productId,
            startTime: Math.round(p.startTime),
            endTime: Math.round(p.endTime),
          }));
          await db.insert(videoProducts).values(insertData);
        }
      }

      res.json({ video: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/videos/:id", authMiddleware, async (req: Request, res: Response) => {
    await db.delete(shoppableVideos).where(eq(shoppableVideos.id, parseInt(req.params.id)));
    res.sendStatus(204);
  });

  app.get("/api/products", authMiddleware, async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    let condition = undefined;
    if (search) {
      condition = or(
        ilike(products.title, `%${search}%`),
        ilike(products.externalId, `%${search}%`)
      );
    }

    const [countResult] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(products)
      .where(condition);
    const total = countResult.count;

    const list = await db
      .select()
      .from(products)
      .where(condition)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ products: list, total, page, totalPages: Math.ceil(total / limit) || 1 });
  });

  app.put("/api/products/:id", authMiddleware, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const { title, description, price, brand, condition, availability, link, imageLink } = req.body;
    
    // allow partial updates
    const [updated] = await db
      .update(products)
      .set({
        title, description, price, brand, condition, availability, link, imageLink,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    res.json({ product: updated });
  });

  app.delete("/api/products/:id", authMiddleware, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }
    res.json({ success: true });
  });

}
