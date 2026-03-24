ALTER TABLE "video_carousels" ADD COLUMN "card_border_width" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "video_carousels" ADD COLUMN "card_border_color" text DEFAULT '#000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "video_carousels" ADD COLUMN "card_border_radius" integer DEFAULT 12 NOT NULL;