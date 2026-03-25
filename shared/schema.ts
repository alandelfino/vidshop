import { pgTable, serial, text, integer, timestamp, boolean, unique, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
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
  subscriptionStatus: text("subscription_status"), // active, past_due, canceled
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  allowedDomain: text("allowed_domain"),
  
  // Billing specific to this store
  plan: text("plan").notNull().default("free"), // free (trial/expired), pro, ultra, gold
  trialEndsAt: timestamp("trial_ends_at"), // set on store creation, expires after 14 days
  currentCycleViews: integer("current_cycle_views").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }),
  filename: text("filename").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }),
  externalId: text("external_id").notNull(), // removed unique() because it will be unique per store
  title: text("title").notNull(),
  description: text("description"),
  price: text("price"),
  imageLink: text("image_link"),
  link: text("link"),
  brand: text("brand"),
  availability: text("availability"),
  condition: text("condition"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique("product_store_external_idx").on(t.storeId, t.externalId)
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export const catalogImports = pgTable("catalog_imports", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }),
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
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }),
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
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }),
  mediaUrl: text("media_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  autoThumbnails: jsonb("auto_thumbnails").$type<string[]>(),
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
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  title: text("title"),
  subtitle: text("subtitle"),
  titleColor: text("title_color").default("#000000"),
  subtitleColor: text("subtitle_color").default("#666666"),
  
  // Integration & Conditions
  integrationMode: text("integration_mode").notNull().default("code"), // code, selector
  selector: text("selector"),
  insertionMethod: text("insertion_method").default("after"), // before, after, prepend, append
  conditions: jsonb("conditions").default([]), // Array of { data: string, operator: string, value: string }

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

// Per-day view analytics (upserted on each carousel view)
export const viewEvents = pgTable("view_events", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }).notNull(),
  carouselId: integer("carousel_id").references(() => videoCarousels.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(), // ISO date string: 'YYYY-MM-DD'
  count: integer("count").notNull().default(0),
}, (t) => ({
  unq: unique("view_events_store_carousel_date_idx").on(t.storeId, t.carouselId, t.date),
}));

export type ViewEvent = typeof viewEvents.$inferSelect;

// ─── Stories Feature (Independent) ──────────────────────────────────────────

export const videoStories = pgTable("video_stories", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  title: text("title"),
  
  // Customization
  shape: text("shape").notNull().default("round"), // round, rect-9-16, square-9-16
  borderGradient: text("border_gradient").default("linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)"),
  
  // Integration & Conditions
  integrationMode: text("integration_mode").notNull().default("code"), // code, selector
  selector: text("selector"),
  insertionMethod: text("insertion_method").default("after"), // before, after, prepend, append
  conditions: jsonb("conditions").default([]), // Array of { data: string, operator: string, value: string }

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
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const storyVideos = pgTable("story_videos", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => videoStories.id, { onDelete: 'cascade' }).notNull(),
  videoId: integer("video_id").references(() => shoppableVideos.id, { onDelete: 'cascade' }).notNull(),
  position: integer("position").notNull().default(0),
});

export type VideoStory = typeof videoStories.$inferSelect;
export type NewVideoStory = typeof videoStories.$inferInsert;
export type StoryVideo = typeof storyVideos.$inferSelect;
export type NewStoryVideo = typeof storyVideos.$inferInsert;

// Per-day view analytics for Stories
export const storyViewEvents = pgTable("story_view_events", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }).notNull(),
  storyId: integer("story_id").references(() => videoStories.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(), // ISO date string: 'YYYY-MM-DD'
  count: integer("count").notNull().default(0),
}, (t) => ({
  unq: unique("story_view_events_store_story_date_idx").on(t.storeId, t.storyId, t.date),
}));

export type StoryViewEvent = typeof storyViewEvents.$inferSelect;
