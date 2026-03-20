CREATE TABLE IF NOT EXISTS "carousel_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"carousel_id" integer NOT NULL,
	"video_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "catalog_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "catalog_syncs" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"frequency_days" integer NOT NULL,
	"sync_time" text NOT NULL,
	"next_sync_at" timestamp NOT NULL,
	"last_sync_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price" text,
	"image_link" text,
	"link" text,
	"brand" text,
	"availability" text,
	"condition" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shoppable_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_url" text NOT NULL,
	"thumbnail_url" text,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_carousels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"description" text,
	"show_products" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"start_time" integer NOT NULL,
	"end_time" integer NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "carousel_videos" ADD CONSTRAINT "carousel_videos_carousel_id_video_carousels_id_fk" FOREIGN KEY ("carousel_id") REFERENCES "public"."video_carousels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "carousel_videos" ADD CONSTRAINT "carousel_videos_video_id_shoppable_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."shoppable_videos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_products" ADD CONSTRAINT "video_products_video_id_shoppable_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."shoppable_videos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_products" ADD CONSTRAINT "video_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
