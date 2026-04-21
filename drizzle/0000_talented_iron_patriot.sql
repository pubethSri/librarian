CREATE TYPE "public"."book_location" AS ENUM('home', 'apartment');--> statement-breakpoint
CREATE TYPE "public"."book_source" AS ENUM('bookstore', 'bookfair', 'online');--> statement-breakpoint
CREATE TYPE "public"."reading_status" AS ENUM('unread', 'reading', 'read', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."series_status" AS ENUM('ongoing', 'ended', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."series_type" AS ENUM('light_novel', 'manga');--> statement-breakpoint
CREATE TABLE "bookfairs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"date" date NOT NULL,
	"location" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"series_id" integer NOT NULL,
	"volume_number" numeric(4, 1) NOT NULL,
	"location" "book_location" DEFAULT 'home' NOT NULL,
	"bought_at" timestamp with time zone,
	"price" numeric(10, 2),
	"source" "book_source",
	"source_event_id" integer,
	"is_draft" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"status" "reading_status" DEFAULT 'unread' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"rating" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" serial PRIMARY KEY NOT NULL,
	"short_name" varchar(255) NOT NULL,
	"full_name" varchar(500) NOT NULL,
	"status" "series_status" DEFAULT 'ongoing' NOT NULL,
	"type" "series_type" NOT NULL,
	"publisher" varchar(255),
	"total_volumes" integer,
	"watchlist" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series_tags" (
	"series_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "series_tags_series_id_tag_id_pk" PRIMARY KEY("series_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_source_event_id_bookfairs_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."bookfairs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading" ADD CONSTRAINT "reading_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_tags" ADD CONSTRAINT "series_tags_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_tags" ADD CONSTRAINT "series_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;