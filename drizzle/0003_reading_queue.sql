CREATE TABLE "reading_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"position" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_queue_book_id_unique" UNIQUE("book_id")
);
--> statement-breakpoint
ALTER TABLE "reading_queue" ADD CONSTRAINT "reading_queue_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;