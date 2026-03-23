import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, desc, ilike, or, sql, inArray, and } from "drizzle-orm";
import fs from "fs";
import { db } from "./db.js";
import { users, stores, media, products, catalogImports, catalogSyncs, shoppableVideos, videoProducts, videoCarousels, carouselVideos, viewEvents } from "../shared/schema.js";
import { upload, s3Client } from "./upload.js";
import { sendVerificationEmail } from "./email.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { processQueue } from "./queue.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { publicScript } from "./public-script.js";
import { purgeCloudflareCache } from "./cloudflare-purge.js";
import { stripe, PLANS, TRIAL_LIMITS, PlanId } from "./stripe.js";
import { shouldCountView, todayUTC } from "./view-tracker.js";

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
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        const [user] = await db
            .insert(users)
            .values({ name, email, passwordHash, verificationCode, verificationCodeExpiresAt, isEmailVerified: false })
            .returning({ id: users.id, name: users.name, email: users.email });

        try {
            await sendVerificationEmail(email, verificationCode);
        } catch (e) {
            console.error("Failed to send verification email during register", e);
            // Non-blocking for now, or we could return error
        }

        res.status(201).json({ message: "Registration successful. Please verify your email.", user });
    });

    app.post("/api/auth/verify", async (req: Request, res: Response) => {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ error: "E-mail e código são obrigatórios." });

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
        if (user.isEmailVerified) return res.status(400).json({ error: "E-mail já verificado." });
        if (user.verificationCode !== code) return res.status(400).json({ error: "Código inválido." });
        if (user.verificationCodeExpiresAt && new Date() > user.verificationCodeExpiresAt) {
            return res.status(400).json({ error: "Código expirado." });
        }

        await db.update(users).set({ isEmailVerified: true, verificationCode: null, verificationCodeExpiresAt: null }).where(eq(users.id, user.id));
        
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });

    app.post("/api/auth/resend", async (req: Request, res: Response) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
        if (user.isEmailVerified) return res.status(400).json({ error: "E-mail já verificado." });

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await db.update(users).set({ verificationCode, verificationCodeExpiresAt }).where(eq(users.id, user.id));

        try {
            await sendVerificationEmail(email, verificationCode);
        } catch (e) {
            console.error("Failed to resend verification email", e);
        }

        res.json({ success: true, message: "Código reenviado com sucesso." });
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

        if (!user.isEmailVerified) {
            res.status(403).json({ error: "Por favor, verifique seu e-mail antes de fazer login.", unverified: true });
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
            .select({ 
                id: users.id, name: users.name, email: users.email, createdAt: users.createdAt,
                subscriptionStatus: users.subscriptionStatus 
            })
            .from(users)
            .where(eq(users.id, payload.userId))
            .limit(1);

        if (!user) {
            res.status(404).json({ error: "Usuário não encontrado" });
            return;
        }

        res.json({ user });
    });

    // ── Stores ───────────────────────────────────────────────────────────────

    app.get("/api/stores", authMiddleware, async (req: Request, res: Response) => {
        const payload = (req as any).user as JwtPayload;
        const myStores = await db.select().from(stores).where(eq(stores.ownerId, payload.userId)).orderBy(desc(stores.createdAt));
        res.json({ stores: myStores });
    });

    app.post("/api/stores", authMiddleware, async (req: Request, res: Response) => {
        const payload = (req as any).user as JwtPayload;
        const { name, allowedDomain } = req.body;
        if (!name || !allowedDomain) return res.status(400).json({ error: "Nome da loja e domínio são obrigatórios" });

        // Auto-start 14-day free trial (no credit card required)
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const [store] = await db.insert(stores).values({ name, allowedDomain, plan: "free", trialEndsAt, ownerId: payload.userId }).returning();
        res.status(201).json({ store });
    });

    app.put("/api/stores/:id", authMiddleware, async (req: Request, res: Response) => {
        const payload = (req as any).user as JwtPayload;
        const storeId = parseInt(req.params.id);
        const { name, allowedDomain } = req.body;
        
        if (!name || !allowedDomain) return res.status(400).json({ error: "Nome da loja e domínio são obrigatórios" });

        // Ensure user owns store
        const [existing] = await db.select().from(stores).where(and(eq(stores.id, storeId), eq(stores.ownerId, payload.userId))).limit(1);
        if (!existing) return res.status(404).json({ error: "Loja não encontrada ou acesso negado." });

        const [store] = await db.update(stores).set({ name, allowedDomain, updatedAt: new Date() }).where(eq(stores.id, storeId)).returning();
        res.json({ store });
    });

    // Store Middleware helper to extract and validate x-store-id header
    function getStoreId(req: Request) {
        const storeId = req.headers["x-store-id"];
        if (!storeId) throw new Error("x-store-id header is missing");
        return parseInt(storeId as string);
    }

    // ── Media ─────────────────────────────────────────────────────────────────

    // POST /api/media/upload
    app.post(
        "/api/media/upload",
        authMiddleware,
        (req: Request, res: Response, next: NextFunction) => {
            upload.single("file")(req, res, (err) => {
                if (err) {
                    console.error("[upload] Multer error:", err);
                    res.status(400).json({ error: err.message });
                    return;
                }
                next();
            });
        },
        async (req: Request, res: Response) => {
            const storeId = getStoreId(req);
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
                    storeId,
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
    app.get("/api/media", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const items = await db.select().from(media).where(eq(media.storeId, storeId)).orderBy(desc(media.createdAt));
        res.json({ media: items });
    });

    // DELETE /api/media/:id
    app.delete("/api/media/:id", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: "ID inválido" });
            return;
        }

        const [item] = await db.select().from(media).where(and(eq(media.id, id), eq(media.storeId, storeId))).limit(1);
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

        await db.delete(media).where(and(eq(media.id, id), eq(media.storeId, storeId)));
        res.json({ success: true });
    });

    // POST /api/videos/:id/extract-thumbs
    app.post("/api/videos/:id/extract-thumbs", authMiddleware, async (req: Request, res: Response) => {
        try {
            const storeId = getStoreId(req);
            const videoId = parseInt(req.params.id);
            const [video] = await db.select().from(shoppableVideos).where(and(eq(shoppableVideos.id, videoId), eq(shoppableVideos.storeId, storeId)));
            
            if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
            if (video.autoThumbnails && video.autoThumbnails.length > 0) {
                return res.json({ urls: video.autoThumbnails });
            }
            
            const { extractFramesToR2 } = await import("./ffmpeg.js");
            const urls = await extractFramesToR2(video.mediaUrl);
            
            await db.update(shoppableVideos)
                .set({ autoThumbnails: urls })
                .where(eq(shoppableVideos.id, videoId));
            
            res.json({ urls });
        } catch (e: any) {
            console.error("Frame extraction error:", e);
            res.status(500).json({ error: e.message || "Failed to extract frames" });
        }
    });

    // ── Products & Catalog ────────────────────────────────────────────────────

    app.post(
        "/api/catalog/import",
        authMiddleware,
        xmlUpload.single("file"),
        async (req: Request, res: Response) => {
            const storeId = getStoreId(req);
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
                    .values({ storeId, sourceType: "file", sourceUrl: file.filename })
                    .returning();
            } else {
                [job] = await db
                    .insert(catalogImports)
                    .values({ storeId, sourceType: "url", sourceUrl: url })
                    .returning();
            }

            processQueue().catch(console.error);
            res.status(202).json({ job, message: "Importação adicionada à fila." });
        }
    );

    app.get("/api/catalog/imports", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const list = await db.select().from(catalogImports).where(eq(catalogImports.storeId, storeId)).orderBy(desc(catalogImports.createdAt));
        res.json({ imports: list });
    });

    // Sync Automation Routes
    app.post("/api/catalog/sync", authMiddleware, async (req: Request, res: Response) => {
        try {
            const storeId = getStoreId(req);
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
                storeId,
                url,
                frequencyDays,
                syncTime,
                nextSyncAt: nextSync,
            }).returning();

            const [importJob] = await db.insert(catalogImports).values({
                storeId,
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
        const storeId = getStoreId(req);
        const list = await db.select().from(catalogSyncs).where(eq(catalogSyncs.storeId, storeId)).orderBy(desc(catalogSyncs.createdAt));
        res.json({ syncs: list });
    });

    app.delete("/api/catalog/syncs/:id", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        await db.delete(catalogSyncs).where(and(eq(catalogSyncs.id, parseInt(req.params.id)), eq(catalogSyncs.storeId, storeId)));
        res.sendStatus(204);
    });

    // ─── PUBLIC EMBED ENDPOINTS (no auth, CORS open) ───────────────────────────

    // Public carousel data API
    app.get("/api/public/carousels/:id", async (req: Request, res: Response) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET");
        // No heavy CDN caching so the view limit check always runs
        res.setHeader("Cache-Control", "no-store");
        try {
            const carouselId = parseInt(req.params.id);
            if (isNaN(carouselId)) return res.status(400).json({ error: "ID inválido" });

            const [carousel] = await db.select().from(videoCarousels).where(eq(videoCarousels.id, carouselId));
            if (!carousel) return res.status(404).json({ error: "Carrossel não encontrado" });

            // ── Domain and limit check (BEFORE we do any heavy work) ───────────
            let targetStore: typeof stores.$inferSelect | null = null;
            if (carousel.storeId) {
                const [store] = await db.select().from(stores).where(eq(stores.id, carousel.storeId));
                if (store) {
                    if (store.allowedDomain) {
                        const origin = req.headers.origin || req.headers.referer;
                        if (origin && !origin.includes(store.allowedDomain)) {
                            return res.status(403).json({ error: "Domínio não autorizado para este carrossel." });
                        }
                    }

                    const planId = store.plan as PlanId;
                    const isTrialActive = store.plan === "free" && store.trialEndsAt && store.trialEndsAt > new Date();
                    const isTrialExpired = store.plan === "free" && (!store.trialEndsAt || store.trialEndsAt <= new Date());

                    if (isTrialExpired) {
                        return res.status(403).json({ error: "O trial gratuito desta loja expirou. O conteúdo está bloqueado até a ativação de um plano." });
                    }

                    const limits = isTrialActive ? TRIAL_LIMITS : (PLANS[planId] || TRIAL_LIMITS);

                    if (store.currentCycleViews >= limits.maxViews) {
                        return res.status(403).json({ error: "Cota mensal de visualizações da loja excedida. O conteúdo está bloqueado até o upgrade do plano." });
                    }

                    targetStore = store;
                }
            }

            // ── Fetch carousel data ────────────────────────────────────────────
            const cv = await db.select({
                videoId: carouselVideos.videoId,
                position: carouselVideos.position,
                video: {
                    id: shoppableVideos.id,
                    title: shoppableVideos.title,
                    description: shoppableVideos.description,
                    mediaUrl: shoppableVideos.mediaUrl,
                    thumbnailUrl: shoppableVideos.thumbnailUrl,
                }
            })
                .from(carouselVideos)
                .innerJoin(shoppableVideos, eq(carouselVideos.videoId, shoppableVideos.id))
                .where(eq(carouselVideos.carouselId, carouselId))
                .orderBy(carouselVideos.position);

            const videoIds = cv.map(r => r.videoId);
            let productsByVideo: Record<number, any[]> = {};
            
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
                        link: products.link,
                    }
                })
                    .from(videoProducts)
                    .innerJoin(products, eq(videoProducts.productId, products.id))
                    .where(inArray(videoProducts.videoId, videoIds))
                    .orderBy(videoProducts.startTime);

                vp.forEach(record => {
                    if (!productsByVideo[record.videoId]) productsByVideo[record.videoId] = [];
                    productsByVideo[record.videoId].push({
                        startTime: record.startTime,
                        endTime: record.endTime,
                        ...record.product
                    });
                });
            }

            // ── Send the response FIRST (zero extra latency for the visitor) ──
            res.json({ carousel, videos: cv.map(r => ({ ...r.video, productsList: productsByVideo[r.videoId] || [] })) });

            // ── Non-blocking view count increment (happens AFTER response) ────
            if (targetStore) {
                const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
                if (shouldCountView(carouselId, ip)) {
                    const storeId = targetStore.id;
                    const today = todayUTC();
                    // Increment store-level cycle counter
                    db.update(stores)
                        .set({ currentCycleViews: sql`${stores.currentCycleViews} + 1` })
                        .where(eq(stores.id, storeId))
                        .catch(err => console.error("[view-tracker] store increment failed:", err));
                    // Upsert daily analytics row: INSERT ... ON CONFLICT ... DO UPDATE
                    db.execute(sql`
                        INSERT INTO view_events (store_id, carousel_id, date, count)
                        VALUES (${storeId}, ${carouselId}, ${today}, 1)
                        ON CONFLICT (store_id, carousel_id, date)
                        DO UPDATE SET count = view_events.count + 1
                    `).catch(err => console.error("[view-tracker] daily upsert failed:", err));
                }
            }
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // carousel.js embed widget
    app.get("/embed/carousel.js", (_req: Request, res: Response) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        const origin = process.env.PUBLIC_URL || "";

        res.send(publicScript.replace("__API_ORIGIN__", origin));
    });

    // Video Carousels

    app.get("/api/carousels", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const list = await db.select().from(videoCarousels).where(eq(videoCarousels.storeId, storeId)).orderBy(desc(videoCarousels.createdAt));
        res.json({ carousels: list });
    });

    app.get("/api/carousels/:id", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const carouselId = parseInt(req.params.id);
        const [carousel] = await db.select().from(videoCarousels).where(and(eq(videoCarousels.id, carouselId), eq(videoCarousels.storeId, storeId)));
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
                thumbnailUrl: shoppableVideos.thumbnailUrl,
            }
        })
            .from(carouselVideos)
            .innerJoin(shoppableVideos, eq(carouselVideos.videoId, shoppableVideos.id))
            .where(eq(carouselVideos.carouselId, carouselId))
            .orderBy(carouselVideos.position);

        const videoIds = cv.map(r => r.videoId);
        let productsByVideo: Record<number, any[]> = {};
        
        if (videoIds.length > 0) {
            const vp = await db.select({
                videoId: videoProducts.videoId,
                startTime: videoProducts.startTime,
                endTime: videoProducts.endTime,
                product: {
                    id: products.id, title: products.title, price: products.price, imageLink: products.imageLink, link: products.link
                }
            })
                .from(videoProducts)
                .innerJoin(products, eq(videoProducts.productId, products.id))
                .where(inArray(videoProducts.videoId, videoIds))
                .orderBy(videoProducts.startTime);

            vp.forEach(record => {
                if (!productsByVideo[record.videoId]) productsByVideo[record.videoId] = [];
                productsByVideo[record.videoId].push({
                    startTime: record.startTime,
                    endTime: record.endTime,
                    ...record.product
                });
            });
        }

        res.json({ carousel, videos: cv.map(r => ({ ...r, video: { ...r.video, productsList: productsByVideo[r.videoId] || [] } })) });
    });

    app.post("/api/carousels", authMiddleware, async (req: Request, res: Response) => {
        try {
            const storeId = getStoreId(req);
            const payload = (req as any).user;
            
            // Verificação de Limites do Plano da Loja
            const [activeStore] = await db.select().from(stores).where(and(eq(stores.id, storeId), eq(stores.ownerId, payload.userId)));
            if (!activeStore) return res.status(403).json({ error: "Loja não encontrada ou acesso negado." });

            const planId = activeStore.plan as PlanId;
            const isTrialActive = activeStore.plan === "free" && activeStore.trialEndsAt && activeStore.trialEndsAt > new Date();
            const isTrialExpired = activeStore.plan === "free" && (!activeStore.trialEndsAt || activeStore.trialEndsAt <= new Date());

            if (isTrialExpired) {
                return res.status(403).json({ error: "Seu trial gratuito expirou. Assine um plano para continuar criando carrosséis.", trialExpired: true });
            }

            const limits = isTrialActive ? TRIAL_LIMITS : (PLANS[planId] || TRIAL_LIMITS);

            const [countRes] = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(videoCarousels).where(eq(videoCarousels.storeId, storeId));
            const count = countRes.count;

            if (count >= limits.maxCarousels) {
                return res.status(403).json({ error: `Limite atingido. Você pode criar até ${limits.maxCarousels} carrossel(eis) no plano ${limits.name}. Faça o upgrade para expandir.` });
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
                previewTime: previewTime ?? 3,
            }).returning();
            res.status(201).json({ carousel });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.put("/api/carousels/:id", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const carouselId = parseInt(req.params.id);
        const { name, title, subtitle, titleColor, subtitleColor, layout, showProducts, previewTime, videoIds } = req.body;
        try {
            const [updated] = await db.update(videoCarousels)
                .set({ name, title, subtitle, titleColor, subtitleColor, layout, showProducts, previewTime, updatedAt: new Date() })
                .where(and(eq(videoCarousels.id, carouselId), eq(videoCarousels.storeId, storeId)))
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
            
            const publicUrl = process.env.PUBLIC_URL || "http://localhost:5000";
            purgeCloudflareCache([`${publicUrl}/api/public/carousels/${carouselId}`]);
            
            res.json({ carousel: updated });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.delete("/api/carousels/:id", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        await db.delete(videoCarousels).where(and(eq(videoCarousels.id, parseInt(req.params.id)), eq(videoCarousels.storeId, storeId)));
        const publicUrl = process.env.PUBLIC_URL || "http://localhost:5000";
        purgeCloudflareCache([`${publicUrl}/api/public/carousels/${parseInt(req.params.id)}`]);
        res.sendStatus(204);
    });

    // Shoppable Videos APIs
    app.get("/api/videos", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const list = await db.select().from(shoppableVideos).where(eq(shoppableVideos.storeId, storeId)).orderBy(desc(shoppableVideos.createdAt));
        
        const videoIds = list.map(v => v.id);
        let productsByVideo: Record<number, any[]> = {};
        
        if (videoIds.length > 0) {
            const vp = await db.select({
                videoId: videoProducts.videoId,
                startTime: videoProducts.startTime,
                endTime: videoProducts.endTime,
                product: {
                    id: products.id, title: products.title, price: products.price, imageLink: products.imageLink, link: products.link
                }
            })
                .from(videoProducts)
                .innerJoin(products, eq(videoProducts.productId, products.id))
                .where(inArray(videoProducts.videoId, videoIds))
                .orderBy(videoProducts.startTime);

            vp.forEach(record => {
                if (!productsByVideo[record.videoId]) productsByVideo[record.videoId] = [];
                productsByVideo[record.videoId].push({
                    startTime: record.startTime,
                    endTime: record.endTime,
                    ...record.product
                });
            });
        }

        res.json({ videos: list.map(v => ({...v, productsList: productsByVideo[v.id] || []})) });
    });

    app.get("/api/videos/:id", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const videoId = parseInt(req.params.id);
        const [video] = await db.select().from(shoppableVideos).where(and(eq(shoppableVideos.id, videoId), eq(shoppableVideos.storeId, storeId)));
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
            const storeId = getStoreId(req);
            const payload = (req as any).user;
            
            // Verificação de Limites do Plano da Loja
            const [activeStore] = await db.select().from(stores).where(and(eq(stores.id, storeId), eq(stores.ownerId, payload.userId)));
            if (!activeStore) return res.status(403).json({ error: "Loja não encontrada ou acesso negado." });

            const planId = activeStore.plan as PlanId;
            const isTrialActive = activeStore.plan === "free" && activeStore.trialEndsAt && activeStore.trialEndsAt > new Date();
            const isTrialExpired = activeStore.plan === "free" && (!activeStore.trialEndsAt || activeStore.trialEndsAt <= new Date());

            if (isTrialExpired) {
                return res.status(403).json({ error: "Seu trial gratuito expirou. Assine um plano para continuar adicionando vídeos.", trialExpired: true });
            }

            const limits = isTrialActive ? TRIAL_LIMITS : (PLANS[planId] || TRIAL_LIMITS);

            const [countRes] = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(shoppableVideos).where(eq(shoppableVideos.storeId, storeId));
            const count = countRes.count;

            if (count >= limits.maxVideos) {
                return res.status(403).json({ error: `Limite atingido. Você pode estocar até ${limits.maxVideos} vídeo(s) no plano ${limits.name}. Faça o upgrade para expandir.` });
            }

            const { title, description, mediaUrl, thumbnailUrl } = req.body;
            const [video] = await db.insert(shoppableVideos).values({ storeId, title: title || "Novo Vídeo", description, mediaUrl, thumbnailUrl }).returning();
            res.status(201).json({ video });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.put("/api/videos/:id", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const videoId = parseInt(req.params.id);
        const { title, description, mediaUrl, thumbnailUrl, productsList } = req.body;

        try {
            const [updated] = await db.update(shoppableVideos)
                .set({ title, description, mediaUrl, thumbnailUrl })
                .where(and(eq(shoppableVideos.id, videoId), eq(shoppableVideos.storeId, storeId)))
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

            const publicUrl = process.env.PUBLIC_URL || "http://localhost:5000";
            const impactedCarousels = await db.select({ carouselId: carouselVideos.carouselId })
                .from(carouselVideos)
                .where(eq(carouselVideos.videoId, videoId));
            
            if (impactedCarousels.length > 0) {
                const urls = impactedCarousels.map(c => `${publicUrl}/api/public/carousels/${c.carouselId}`);
                purgeCloudflareCache(urls);
            }

            res.json({ video: updated });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.delete("/api/videos/:id", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        await db.delete(shoppableVideos).where(and(eq(shoppableVideos.id, parseInt(req.params.id)), eq(shoppableVideos.storeId, storeId)));
        res.sendStatus(204);
    });

    app.get("/api/products", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const search = (req.query.search as string) || "";
        const offset = (page - 1) * limit;

        let condition = eq(products.storeId, storeId) as any;
        if (search) {
            condition = and(
                eq(products.storeId, storeId),
                or(
                    ilike(products.title, `%${search}%`),
                    ilike(products.externalId, `%${search}%`)
                )
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
        const storeId = getStoreId(req);
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
            .where(and(eq(products.id, id), eq(products.storeId, storeId)))
            .returning();

        if (!updated) {
            res.status(404).json({ error: "Produto não encontrado" });
            return;
        }

        res.json({ product: updated });
    });

    app.delete("/api/products/:id", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: "ID inválido" });
            return;
        }

        const [deleted] = await db.delete(products).where(and(eq(products.id, id), eq(products.storeId, storeId))).returning();
        if (!deleted) {
            res.status(404).json({ error: "Produto não encontrado" });
            return;
        }
        res.json({ success: true });
    });

    // ── Stripe Billing Endpoints ──────────────────────────────────────────────

    // POST /api/stripe/checkout
    // Body: { planId: "pro" | "ultra" | "gold", storeId: number }
    app.post("/api/stripe/checkout", authMiddleware, async (req: Request, res: Response) => {
        const payload = (req as any).user;
        const { planId, storeId } = req.body;

        if (!planId || !PLANS[planId as PlanId]) return res.status(400).json({ error: "Plano inválido. Escolha: pro, ultra ou gold." });

        const plan = PLANS[planId as PlanId];

        // Validate store belongs to this user
        const [store] = await db.select().from(stores).where(and(eq(stores.id, storeId), eq(stores.ownerId, payload.userId))).limit(1);
        if (!store) return res.status(403).json({ error: "Loja não encontrada ou acesso negado." });

        try {
            const [owner] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
            let customerId = owner.stripeCustomerId;

            if (!customerId) {
                const customer = await stripe.customers.create({ email: owner.email, name: owner.name });
                customerId = customer.id;
                await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, owner.id));
            }

            const publicUrl = process.env.PUBLIC_URL || "http://localhost:5000";

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ["card"],
                line_items: [{ price: (plan as any).priceId, quantity: 1 }],
                mode: "subscription",
                success_url: `${publicUrl}/dashboard/billing?success=true`,
                cancel_url: `${publicUrl}/dashboard/billing?canceled=true`,
                // Pass both storeId and planId so the webhook knows what to update
                metadata: { storeId: storeId.toString(), planId, userId: owner.id.toString() },
            });

            res.json({ url: session.url });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // POST /api/stripe/portal  – scoped to the active store's Stripe customer
    app.post("/api/stripe/portal", authMiddleware, async (req: Request, res: Response) => {
        const payload = (req as any).user;
        const [owner] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);

        if (!owner.stripeCustomerId) return res.status(400).json({ error: "Conta Stripe não configurada para este usuário." });

        try {
            const publicUrl = process.env.PUBLIC_URL || "http://localhost:5000";
            const session = await stripe.billingPortal.sessions.create({
                customer: owner.stripeCustomerId,
                return_url: `${publicUrl}/dashboard/billing`,
            });
            res.json({ url: session.url });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // POST /api/stripe/webhook  – must be raw body for signature verification
    app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        let event;

        if (webhookSecret) {
            const sig = req.headers["stripe-signature"] as string;
            try {
                event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
            } catch (err: any) {
                console.error("[webhook] Signature verification failed:", err.message);
                return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
            }
        } else {
            // Dev fallback (no signature check)
            event = req.body;
        }

        try {
            // ── Payment succeeded: activate the plan on the store ──────────────
            if (event.type === "checkout.session.completed") {
                const session = event.data.object;
                const storeId = parseInt(session.metadata?.storeId || "0");
                const planId = session.metadata?.planId as PlanId;
                const userId = parseInt(session.metadata?.userId || "0");

                if (storeId && planId) {
                    await db.update(stores).set({
                        plan: planId,
                        currentCycleViews: 0,
                    }).where(eq(stores.id, storeId));
                }

                if (userId && session.subscription) {
                    await db.update(users).set({
                        stripeSubscriptionId: session.subscription,
                        subscriptionStatus: "active",
                    }).where(eq(users.id, userId));
                }
            }

            // ── Renewal: reset view counter for the new billing cycle ──────────
            else if (event.type === "invoice.payment_succeeded") {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    // Find user by subscription id
                    const [userRow] = await db.select().from(users).where(eq(users.stripeSubscriptionId, invoice.subscription)).limit(1);
                    if (userRow) {
                        await db.update(users).set({ subscriptionStatus: "active" }).where(eq(users.id, userRow.id));
                        // Reset cycle views for ALL stores of this user
                        await db.update(stores).set({ currentCycleViews: 0 }).where(eq(stores.ownerId, userRow.id));
                    }
                }
            }

            // ── Subscription cancelled/deleted: downgrade store to free ────────
            else if (
                event.type === "customer.subscription.deleted" ||
                event.type === "customer.subscription.updated"
            ) {
                const subscription = event.data.object;
                // Only downgrade if status is actually canceled/unpaid
                const isCanceled = ["canceled", "unpaid", "incomplete_expired"].includes(subscription.status);
                if (isCanceled) {
                    const [userRow] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscription.id)).limit(1);
                    if (userRow) {
                        await db.update(users).set({ subscriptionStatus: "canceled", stripeSubscriptionId: null }).where(eq(users.id, userRow.id));
                        // Downgrade all stores owned by this user back to free (trial expired state)
                        await db.update(stores).set({ plan: "free", trialEndsAt: null }).where(eq(stores.ownerId, userRow.id));
                    }
                }
            }

            res.json({ received: true });
        } catch (e: any) {
            console.error("[webhook] Processing failed:", e);
            res.status(500).json({ error: e.message });
        }
    });

    app.delete("/api/products/:id", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: "ID inválido" });
            return;
        }

        const [deleted] = await db.delete(products).where(and(eq(products.id, id), eq(products.storeId, storeId))).returning();
        if (!deleted) {
            res.status(404).json({ error: "Produto não encontrado" });
            return;
        }
        res.json({ success: true });
    });

    // ── Analytics ────────────────────────────────────────────────────────────────
    // GET /api/analytics/views?from=YYYY-MM-DD&to=YYYY-MM-DD
    app.get("/api/analytics/views", authMiddleware, async (req: Request, res: Response) => {
        const storeId = getStoreId(req);
        const { from, to } = req.query as { from?: string; to?: string };

        if (!from || !to) return res.status(400).json({ error: "from e to são obrigatórios (YYYY-MM-DD)" });

        try {
            // Aggregate per-day across all carousels of this store
            const rows = await db.execute(sql`
                SELECT date, SUM(count)::int AS total
                FROM view_events
                WHERE store_id = ${storeId}
                  AND date >= ${from}
                  AND date <= ${to}
                GROUP BY date
                ORDER BY date ASC
            `);

            const byDay = (rows.rows as any[]).map(r => ({ date: r.date, views: r.total }));
            const total = byDay.reduce((acc, r) => acc + r.views, 0);

            res.json({ total, byDay });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Global Error Handler
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        if (err.message === "x-store-id header is missing") {
            return res.status(400).json({ error: "Loja não selecionada ou header x-store-id ausente." });
        }
        
        console.error("Unhandled Error:", err);
        res.status(500).json({ error: err.message || "Erro interno do servidor." });
    });
}
