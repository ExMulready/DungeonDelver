ALTER TABLE "campaign_turn" ADD COLUMN "scene_art_url" text;--> statement-breakpoint
ALTER TABLE "campaign_turn" ADD COLUMN "scene_art_caption" text;--> statement-breakpoint
ALTER TABLE "character" ADD COLUMN "equipment" jsonb DEFAULT '{"weapon":null,"offhand":null,"head":null,"shoulders":null,"hands":null,"chest":null,"cloak":null,"amulet":null,"boots":null,"ring1":null,"ring2":null,"belt":null}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "character" ADD COLUMN "power_cooldowns" jsonb DEFAULT '{}'::jsonb NOT NULL;