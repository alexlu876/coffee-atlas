CREATE TABLE "cafe_lots" (
	"cafe_slug" text NOT NULL,
	"lot_slug" text NOT NULL,
	"format" text,
	"status" text,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "cafe_lots_cafe_slug_lot_slug_pk" PRIMARY KEY("cafe_slug","lot_slug")
);
--> statement-breakpoint
CREATE TABLE "cafe_roasters" (
	"cafe_slug" text NOT NULL,
	"roaster_slug" text NOT NULL,
	"is_primary" boolean,
	"notes_md" text,
	CONSTRAINT "cafe_roasters_cafe_slug_roaster_slug_pk" PRIMARY KEY("cafe_slug","roaster_slug")
);
--> statement-breakpoint
CREATE TABLE "cafes" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"neighborhood_slug" text,
	"address" text,
	"location" geometry(point),
	"hours_json" jsonb,
	"description_md" text,
	"ambiance_notes" text,
	"photo_urls" text[]
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"slug" text PRIMARY KEY NOT NULL,
	"country_slug" text,
	"name" text NOT NULL,
	"centroid" geometry(point)
);
--> statement-breakpoint
CREATE TABLE "competition_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_slug" text NOT NULL,
	"producer_slug" text NOT NULL,
	"lot_slug" text,
	"rank" integer,
	"score" numeric(4, 2),
	"lot_name_at_competition" text
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country_slug" text,
	"year" integer NOT NULL,
	"type" text
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"iso_code" text,
	"description_md" text,
	"coffee_history_md" text,
	"total_production_bags" integer,
	"hero_image_url" text,
	"centroid" geometry(point),
	CONSTRAINT "countries_iso_code_unique" UNIQUE("iso_code")
);
--> statement-breakpoint
CREATE TABLE "estates" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"primary_producer_slug" text,
	"sub_region_slug" text,
	"location" geometry(point),
	"altitude_min" integer,
	"altitude_max" integer,
	"area_hectares" numeric,
	"year_founded" integer,
	"description_md" text,
	"notable_lots_md" text,
	"hero_image_url" text
);
--> statement-breakpoint
CREATE TABLE "importers" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hq_country_slug" text,
	"website" text,
	"description_md" text
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"slug" text PRIMARY KEY NOT NULL,
	"estate_slug" text,
	"producer_slug" text,
	"variety_slug" text,
	"process_slug" text,
	"harvest_year" integer NOT NULL,
	"name" text,
	"sca_score" numeric(4, 2),
	"tasting_notes" text[],
	"altitude_picked" integer,
	"lot_size_kg" integer,
	"description_md" text
);
--> statement-breakpoint
CREATE TABLE "neighborhoods" (
	"slug" text PRIMARY KEY NOT NULL,
	"city_slug" text,
	"name" text NOT NULL,
	"centroid" geometry(point),
	CONSTRAINT "neighborhoods_city_slug_slug_unique" UNIQUE("city_slug","slug")
);
--> statement-breakpoint
CREATE TABLE "processes" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alt_names" text[],
	"parent_process_slug" text,
	"description_md" text,
	"pioneered_by_producer_slug" text
);
--> statement-breakpoint
CREATE TABLE "producer_importers" (
	"producer_slug" text NOT NULL,
	"importer_slug" text NOT NULL,
	"since_year" integer,
	"is_primary" boolean,
	CONSTRAINT "producer_importers_producer_slug_importer_slug_pk" PRIMARY KEY("producer_slug","importer_slug")
);
--> statement-breakpoint
CREATE TABLE "producers" (
	"slug" text PRIMARY KEY NOT NULL,
	"primary_name" text NOT NULL,
	"alt_names" text[],
	"bio_md" text,
	"generation" integer,
	"year_started" integer,
	"hero_image_url" text,
	"is_collective" boolean DEFAULT false,
	"family_member_slugs" text[]
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"slug" text PRIMARY KEY NOT NULL,
	"country_slug" text,
	"name" text NOT NULL,
	"centroid" geometry(point),
	"geo_polygon" text,
	"altitude_min" integer,
	"altitude_max" integer,
	"typical_processes" text[],
	"typical_varieties" text[],
	"description_md" text,
	CONSTRAINT "regions_country_slug_slug_unique" UNIQUE("country_slug","slug")
);
--> statement-breakpoint
CREATE TABLE "roaster_lots" (
	"roaster_slug" text NOT NULL,
	"lot_slug" text NOT NULL,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"status" text,
	"product_url" text,
	"retail_price_usd" numeric,
	CONSTRAINT "roaster_lots_roaster_slug_lot_slug_pk" PRIMARY KEY("roaster_slug","lot_slug")
);
--> statement-breakpoint
CREATE TABLE "roasters" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hq_city_slug" text,
	"website" text,
	"philosophy_md" text,
	"founded_year" integer,
	"description_md" text,
	"hero_image_url" text
);
--> statement-breakpoint
CREATE TABLE "sub_regions" (
	"slug" text PRIMARY KEY NOT NULL,
	"region_slug" text,
	"name" text NOT NULL,
	"centroid" geometry(point),
	"description_md" text,
	CONSTRAINT "sub_regions_region_slug_slug_unique" UNIQUE("region_slug","slug")
);
--> statement-breakpoint
CREATE TABLE "varieties" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alt_names" text[],
	"parent_variety_slug" text,
	"origin_country_slug" text,
	"origin_story_md" text,
	"flavor_profile_md" text
);
--> statement-breakpoint
ALTER TABLE "cafe_lots" ADD CONSTRAINT "cafe_lots_cafe_slug_cafes_slug_fk" FOREIGN KEY ("cafe_slug") REFERENCES "public"."cafes"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_lots" ADD CONSTRAINT "cafe_lots_lot_slug_lots_slug_fk" FOREIGN KEY ("lot_slug") REFERENCES "public"."lots"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_roasters" ADD CONSTRAINT "cafe_roasters_cafe_slug_cafes_slug_fk" FOREIGN KEY ("cafe_slug") REFERENCES "public"."cafes"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_roasters" ADD CONSTRAINT "cafe_roasters_roaster_slug_roasters_slug_fk" FOREIGN KEY ("roaster_slug") REFERENCES "public"."roasters"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafes" ADD CONSTRAINT "cafes_neighborhood_slug_neighborhoods_slug_fk" FOREIGN KEY ("neighborhood_slug") REFERENCES "public"."neighborhoods"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_slug_countries_slug_fk" FOREIGN KEY ("country_slug") REFERENCES "public"."countries"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_results" ADD CONSTRAINT "competition_results_competition_slug_competitions_slug_fk" FOREIGN KEY ("competition_slug") REFERENCES "public"."competitions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_results" ADD CONSTRAINT "competition_results_producer_slug_producers_slug_fk" FOREIGN KEY ("producer_slug") REFERENCES "public"."producers"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_results" ADD CONSTRAINT "competition_results_lot_slug_lots_slug_fk" FOREIGN KEY ("lot_slug") REFERENCES "public"."lots"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_country_slug_countries_slug_fk" FOREIGN KEY ("country_slug") REFERENCES "public"."countries"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estates" ADD CONSTRAINT "estates_primary_producer_slug_producers_slug_fk" FOREIGN KEY ("primary_producer_slug") REFERENCES "public"."producers"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estates" ADD CONSTRAINT "estates_sub_region_slug_sub_regions_slug_fk" FOREIGN KEY ("sub_region_slug") REFERENCES "public"."sub_regions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importers" ADD CONSTRAINT "importers_hq_country_slug_countries_slug_fk" FOREIGN KEY ("hq_country_slug") REFERENCES "public"."countries"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_estate_slug_estates_slug_fk" FOREIGN KEY ("estate_slug") REFERENCES "public"."estates"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_producer_slug_producers_slug_fk" FOREIGN KEY ("producer_slug") REFERENCES "public"."producers"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_variety_slug_varieties_slug_fk" FOREIGN KEY ("variety_slug") REFERENCES "public"."varieties"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_process_slug_processes_slug_fk" FOREIGN KEY ("process_slug") REFERENCES "public"."processes"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_parent_process_slug_processes_slug_fk" FOREIGN KEY ("parent_process_slug") REFERENCES "public"."processes"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_pioneered_by_producer_slug_producers_slug_fk" FOREIGN KEY ("pioneered_by_producer_slug") REFERENCES "public"."producers"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_importers" ADD CONSTRAINT "producer_importers_producer_slug_producers_slug_fk" FOREIGN KEY ("producer_slug") REFERENCES "public"."producers"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_importers" ADD CONSTRAINT "producer_importers_importer_slug_importers_slug_fk" FOREIGN KEY ("importer_slug") REFERENCES "public"."importers"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_country_slug_countries_slug_fk" FOREIGN KEY ("country_slug") REFERENCES "public"."countries"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roaster_lots" ADD CONSTRAINT "roaster_lots_roaster_slug_roasters_slug_fk" FOREIGN KEY ("roaster_slug") REFERENCES "public"."roasters"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roaster_lots" ADD CONSTRAINT "roaster_lots_lot_slug_lots_slug_fk" FOREIGN KEY ("lot_slug") REFERENCES "public"."lots"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roasters" ADD CONSTRAINT "roasters_hq_city_slug_cities_slug_fk" FOREIGN KEY ("hq_city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_regions" ADD CONSTRAINT "sub_regions_region_slug_regions_slug_fk" FOREIGN KEY ("region_slug") REFERENCES "public"."regions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "varieties" ADD CONSTRAINT "varieties_parent_variety_slug_varieties_slug_fk" FOREIGN KEY ("parent_variety_slug") REFERENCES "public"."varieties"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "varieties" ADD CONSTRAINT "varieties_origin_country_slug_countries_slug_fk" FOREIGN KEY ("origin_country_slug") REFERENCES "public"."countries"("slug") ON DELETE no action ON UPDATE no action;