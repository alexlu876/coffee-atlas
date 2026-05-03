ALTER TABLE "cafe_lots" DROP CONSTRAINT "cafe_lots_cafe_slug_cafes_slug_fk";
--> statement-breakpoint
ALTER TABLE "cafe_lots" DROP CONSTRAINT "cafe_lots_lot_slug_lots_slug_fk";
--> statement-breakpoint
ALTER TABLE "cafe_roasters" DROP CONSTRAINT "cafe_roasters_cafe_slug_cafes_slug_fk";
--> statement-breakpoint
ALTER TABLE "cafe_roasters" DROP CONSTRAINT "cafe_roasters_roaster_slug_roasters_slug_fk";
--> statement-breakpoint
ALTER TABLE "competition_results" DROP CONSTRAINT "competition_results_competition_slug_competitions_slug_fk";
--> statement-breakpoint
ALTER TABLE "competition_results" DROP CONSTRAINT "competition_results_producer_slug_producers_slug_fk";
--> statement-breakpoint
ALTER TABLE "competition_results" DROP CONSTRAINT "competition_results_lot_slug_lots_slug_fk";
--> statement-breakpoint
ALTER TABLE "producer_importers" DROP CONSTRAINT "producer_importers_producer_slug_producers_slug_fk";
--> statement-breakpoint
ALTER TABLE "producer_importers" DROP CONSTRAINT "producer_importers_importer_slug_importers_slug_fk";
--> statement-breakpoint
ALTER TABLE "roaster_lots" DROP CONSTRAINT "roaster_lots_roaster_slug_roasters_slug_fk";
--> statement-breakpoint
ALTER TABLE "roaster_lots" DROP CONSTRAINT "roaster_lots_lot_slug_lots_slug_fk";
--> statement-breakpoint
ALTER TABLE "cities" ALTER COLUMN "country_slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "regions" ALTER COLUMN "country_slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sub_regions" ALTER COLUMN "region_slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cafe_lots" ADD CONSTRAINT "cafe_lots_cafe_slug_cafes_slug_fk" FOREIGN KEY ("cafe_slug") REFERENCES "public"."cafes"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_lots" ADD CONSTRAINT "cafe_lots_lot_slug_lots_slug_fk" FOREIGN KEY ("lot_slug") REFERENCES "public"."lots"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_roasters" ADD CONSTRAINT "cafe_roasters_cafe_slug_cafes_slug_fk" FOREIGN KEY ("cafe_slug") REFERENCES "public"."cafes"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_roasters" ADD CONSTRAINT "cafe_roasters_roaster_slug_roasters_slug_fk" FOREIGN KEY ("roaster_slug") REFERENCES "public"."roasters"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_results" ADD CONSTRAINT "competition_results_competition_slug_competitions_slug_fk" FOREIGN KEY ("competition_slug") REFERENCES "public"."competitions"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_results" ADD CONSTRAINT "competition_results_producer_slug_producers_slug_fk" FOREIGN KEY ("producer_slug") REFERENCES "public"."producers"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_results" ADD CONSTRAINT "competition_results_lot_slug_lots_slug_fk" FOREIGN KEY ("lot_slug") REFERENCES "public"."lots"("slug") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_importers" ADD CONSTRAINT "producer_importers_producer_slug_producers_slug_fk" FOREIGN KEY ("producer_slug") REFERENCES "public"."producers"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_importers" ADD CONSTRAINT "producer_importers_importer_slug_importers_slug_fk" FOREIGN KEY ("importer_slug") REFERENCES "public"."importers"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roaster_lots" ADD CONSTRAINT "roaster_lots_roaster_slug_roasters_slug_fk" FOREIGN KEY ("roaster_slug") REFERENCES "public"."roasters"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roaster_lots" ADD CONSTRAINT "roaster_lots_lot_slug_lots_slug_fk" FOREIGN KEY ("lot_slug") REFERENCES "public"."lots"("slug") ON DELETE cascade ON UPDATE no action;