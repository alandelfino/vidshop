import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull().unique(),   // UUID gerado no servidor
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),                 // bytes
  url: text("url").notNull(),                      // /uploads/<filename>
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(), // g:id
  title: text("title").notNull(),                     // g:title
  description: text("description"),                   // g:description
  price: text("price"),                               // g:price
  imageLink: text("image_link"),                      // g:image_link
  link: text("link"),                                 // g:link
  brand: text("brand"),                               // g:brand
  availability: text("availability"),                 // g:availability
  condition: text("condition"),                       // g:condition
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export const catalogImports = pgTable("catalog_imports", {
  id: serial("id").primaryKey(),
  sourceType: text("source_type").notNull(), // 'file', 'url'
  sourceUrl: text("source_url"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  processedItems: integer("processed_items").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type CatalogImport = typeof catalogImports.$inferSelect;
export type NewCatalogImport = typeof catalogImports.$inferInsert;

export const catalogSyncs = pgTable("catalog_syncs", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  frequencyDays: integer("frequency_days").notNull(),
  syncTime: text("sync_time").notNull(),
  nextSyncAt: timestamp("next_sync_at").notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shoppableVideos = pgTable("shoppable_videos", {
  id: serial("id").primaryKey(),
  mediaUrl: text("media_url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const videoProducts = pgTable("video_products", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => shoppableVideos.id, { onDelete: 'cascade' }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  startTime: integer("start_time").notNull(), // in seconds
  endTime: integer("end_time").notNull(),     // in seconds
});

export type CatalogSync = typeof catalogSyncs.$inferSelect;
export type NewCatalogSync = typeof catalogSyncs.$inferInsert;
export type ShoppableVideo = typeof shoppableVideos.$inferSelect;
export type NewShoppableVideo = typeof shoppableVideos.$inferInsert;
export type VideoProduct = typeof videoProducts.$inferSelect;
export type NewVideoProduct = typeof videoProducts.$inferInsert;

export const videoCarousels = pgTable("video_carousels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  description: text("description"),
  showProducts: boolean("show_products").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const carouselVideos = pgTable("carousel_videos", {
  id: serial("id").primaryKey(),
  carouselId: integer("carousel_id").references(() => videoCarousels.id, { onDelete: 'cascade' }).notNull(),
  videoId: integer("video_id").references(() => shoppableVideos.id, { onDelete: 'cascade' }).notNull(),
  position: integer("position").notNull().default(0),
});

export type VideoCarousel = typeof videoCarousels.$inferSelect;
export type NewVideoCarousel = typeof videoCarousels.$inferInsert;
export type CarouselVideo = typeof carouselVideos.$inferSelect;
