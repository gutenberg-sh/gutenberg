CREATE TABLE "cursors" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	"scope" text NOT NULL,
	"last_signature" text,
	"last_slot" bigint,
	"backfill_completed_at" timestamp,
	CONSTRAINT "cursors_scope_unique" UNIQUE("scope")
);
--> statement-breakpoint
CREATE TABLE "manifests" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	"release_id" text NOT NULL,
	"uri" text NOT NULL,
	"hash" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	"publisher_id" text NOT NULL,
	"address" text NOT NULL,
	"registry_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	"address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT current_timestamp NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp NOT NULL,
	"publisher_id" text NOT NULL,
	"publication_id" text NOT NULL,
	"address" text NOT NULL,
	"version" text NOT NULL,
	"schema_version" smallint NOT NULL,
	"content_hash" "bytea" NOT NULL,
	"content_size_bytes" bigint NOT NULL,
	"signature" text NOT NULL,
	"published_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "manifests_release_id_unique" ON "manifests" USING btree ("release_id");--> statement-breakpoint
CREATE UNIQUE INDEX "publications_address_unique" ON "publications" USING btree ("address");--> statement-breakpoint
CREATE UNIQUE INDEX "publications_registry_id_unique" ON "publications" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "publications_registry_id_trgm_idx" ON "publications" USING gin ("registry_id" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "publishers_address_unique" ON "publishers" USING btree ("address");--> statement-breakpoint
CREATE UNIQUE INDEX "releases_address_unique" ON "releases" USING btree ("address");--> statement-breakpoint
CREATE UNIQUE INDEX "releases_publication_id_version_unique" ON "releases" USING btree ("publication_id","version");--> statement-breakpoint
CREATE INDEX "releases_publisher_id_idx" ON "releases" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "releases_publication_id_idx" ON "releases" USING btree ("publication_id");--> statement-breakpoint
CREATE INDEX "releases_published_at_desc_idx" ON "releases" USING btree ("published_at" DESC NULLS LAST);
