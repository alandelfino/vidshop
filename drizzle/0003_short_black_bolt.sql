CREATE TABLE IF NOT EXISTS "story_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"video_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_view_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"story_id" integer NOT NULL,
	"date" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "story_view_events_store_story_date_idx" UNIQUE("store_id","story_id","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"shape" text DEFAULT 'round' NOT NULL,
	"border_gradient" text DEFAULT 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' NOT NULL,
	"border_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_videos" ADD CONSTRAINT "story_videos_story_id_video_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."video_stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_videos" ADD CONSTRAINT "story_videos_video_id_shoppable_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."shoppable_videos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_view_events" ADD CONSTRAINT "story_view_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_view_events" ADD CONSTRAINT "story_view_events_story_id_video_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."video_stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_stories" ADD CONSTRAINT "video_stories_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
