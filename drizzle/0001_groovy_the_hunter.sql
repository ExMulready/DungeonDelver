DROP INDEX "turn_campaign_number_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "turn_campaign_number_idx" ON "campaign_turn" USING btree ("campaign_id","turn_number");