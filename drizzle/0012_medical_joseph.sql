ALTER TABLE "video_carousels" ADD COLUMN "video_selection_type" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_carousels" ADD COLUMN "dynamic_video_conditions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "video_stories" ADD COLUMN "video_selection_type" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_stories" ADD COLUMN "dynamic_video_conditions" jsonb DEFAULT '[]'::jsonb;