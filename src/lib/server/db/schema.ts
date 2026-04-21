import {
	pgTable,
	pgEnum,
	serial,
	integer,
	varchar,
	text,
	boolean,
	numeric,
	timestamp,
	date,
	primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const seriesStatusEnum = pgEnum('series_status', ['ongoing', 'ended', 'dropped']);
export const seriesTypeEnum = pgEnum('series_type', ['light_novel', 'manga']);
export const bookLocationEnum = pgEnum('book_location', ['home', 'apartment']);
export const bookSourceEnum = pgEnum('book_source', ['bookstore', 'bookfair', 'online']);
export const readingStatusEnum = pgEnum('reading_status', ['unread', 'reading', 'read', 'dropped']);

// ─── Series ──────────────────────────────────────────────────────────────────

export const series = pgTable('series', {
	id: serial('id').primaryKey(),
	shortName: varchar('short_name', { length: 255 }).notNull(),
	fullName: varchar('full_name', { length: 500 }).notNull(),
	status: seriesStatusEnum('status').default('ongoing').notNull(),
	type: seriesTypeEnum('type').notNull(),
	publisher: varchar('publisher', { length: 255 }),
	totalVolumes: integer('total_volumes'),
	watchlist: boolean('watchlist').default(false).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const seriesRelations = relations(series, ({ many }) => ({
	books: many(books),
	seriesTags: many(seriesTags)
}));

// ─── Books ───────────────────────────────────────────────────────────────────

export const books = pgTable('books', {
	id: serial('id').primaryKey(),
	seriesId: integer('series_id')
		.references(() => series.id, { onDelete: 'cascade' })
		.notNull(),
	volumeNumber: numeric('volume_number', { precision: 4, scale: 1 }).notNull(),
	location: bookLocationEnum('location').default('home').notNull(),
	boughtAt: timestamp('bought_at', { withTimezone: true }),
	price: numeric('price', { precision: 10, scale: 2 }),
	source: bookSourceEnum('source'),
	sourceEventId: integer('source_event_id').references(() => bookfairs.id, {
		onDelete: 'set null'
	}),
	isDraft: boolean('is_draft').default(false).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const booksRelations = relations(books, ({ one, many }) => ({
	series: one(series, {
		fields: [books.seriesId],
		references: [series.id]
	}),
	sourceEvent: one(bookfairs, {
		fields: [books.sourceEventId],
		references: [bookfairs.id]
	}),
	readings: many(reading)
}));

// ─── Reading ─────────────────────────────────────────────────────────────────

export const reading = pgTable('reading', {
	id: serial('id').primaryKey(),
	bookId: integer('book_id')
		.references(() => books.id, { onDelete: 'cascade' })
		.notNull(),
	status: readingStatusEnum('status').default('unread').notNull(),
	startedAt: timestamp('started_at', { withTimezone: true }),
	finishedAt: timestamp('finished_at', { withTimezone: true }),
	rating: integer('rating'),
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const readingRelations = relations(reading, ({ one }) => ({
	book: one(books, {
		fields: [reading.bookId],
		references: [books.id]
	})
}));

// ─── Bookfairs ───────────────────────────────────────────────────────────────

export const bookfairs = pgTable('bookfairs', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	date: date('date').notNull(),
	location: varchar('location', { length: 255 }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const bookfairsRelations = relations(bookfairs, ({ many }) => ({
	books: many(books)
}));

// ─── Tags ────────────────────────────────────────────────────────────────────

export const tags = pgTable('tags', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull().unique()
});

export const tagsRelations = relations(tags, ({ many }) => ({
	seriesTags: many(seriesTags)
}));

// ─── Series Tags (Junction Table) ────────────────────────────────────────────

export const seriesTags = pgTable(
	'series_tags',
	{
		seriesId: integer('series_id')
			.references(() => series.id, { onDelete: 'cascade' })
			.notNull(),
		tagId: integer('tag_id')
			.references(() => tags.id, { onDelete: 'cascade' })
			.notNull()
	},
	(t) => [primaryKey({ columns: [t.seriesId, t.tagId] })]
);

export const seriesTagsRelations = relations(seriesTags, ({ one }) => ({
	series: one(series, {
		fields: [seriesTags.seriesId],
		references: [series.id]
	}),
	tag: one(tags, {
		fields: [seriesTags.tagId],
		references: [tags.id]
	})
}));
