ALTER TABLE "video_carousels" ALTER COLUMN "title_color" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "video_carousels" ALTER COLUMN "subtitle_color" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "video_stories" ALTER COLUMN "border_gradient" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "video_carousels" ADD COLUMN "integration_mode" text DEFAULT 'code' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_carousels" ADD COLUMN "selector" text;--> statement-breakpoint
ALTER TABLE "video_carousels" ADD COLUMN "insertion_method" text DEFAULT 'after';--> statement-breakpoint
ALTER TABLE "video_carousels" ADD COLUMN "conditions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "video_stories" ADD COLUMN "integration_mode" text DEFAULT 'code' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_stories" ADD COLUMN "selector" text;--> statement-breakpoint
ALTER TABLE "video_stories" ADD COLUMN "insertion_method" text DEFAULT 'after';--> statement-breakpoint
ALTER TABLE "video_stories" ADD COLUMN "conditions" jsonb DEFAULT '[]'::jsonb;