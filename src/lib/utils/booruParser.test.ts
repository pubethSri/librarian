import { describe, it, expect } from 'vitest';
import { parseBooruQuery, buildBooruQuery } from './booruParser';

describe('parseBooruQuery', () => {
	// ─── Empty / whitespace ───────────────────────────────────────────────────
	it('returns empty result for empty string', () => {
		const result = parseBooruQuery('');
		expect(result.includeTags).toEqual([]);
		expect(result.excludeTags).toEqual([]);
		expect(result.params).toEqual([]);
		expect(result.searchTerms).toEqual([]);
	});

	it('returns empty result for whitespace-only', () => {
		const result = parseBooruQuery('   ');
		expect(result.includeTags).toEqual([]);
	});

	// ─── Bare words (tags + search terms) ─────────────────────────────────────
	it('parses single bare word as include tag and search term', () => {
		const result = parseBooruQuery('isekai');
		expect(result.includeTags).toEqual(['isekai']);
		expect(result.searchTerms).toEqual(['isekai']);
		expect(result.excludeTags).toEqual([]);
		expect(result.params).toEqual([]);
	});

	it('parses multiple bare words', () => {
		const result = parseBooruQuery('isekai romance comedy');
		expect(result.includeTags).toEqual(['isekai', 'romance', 'comedy']);
		expect(result.searchTerms).toEqual(['isekai', 'romance', 'comedy']);
	});

	// ─── Exclusion tags ───────────────────────────────────────────────────────
	it('parses -prefixed word as exclude tag', () => {
		const result = parseBooruQuery('-harem');
		expect(result.excludeTags).toEqual(['harem']);
		expect(result.includeTags).toEqual([]);
	});

	it('parses mixed include and exclude', () => {
		const result = parseBooruQuery('isekai -harem romance -ecchi');
		expect(result.includeTags).toEqual(['isekai', 'romance']);
		expect(result.excludeTags).toEqual(['harem', 'ecchi']);
	});

	it('does not treat lone hyphen as exclusion', () => {
		const result = parseBooruQuery('-');
		// A single "-" has no word after it, so length is 1 but slice(1) is ""
		// This should not crash; the empty exclude gets added but is harmless
		expect(result.excludeTags).toEqual([]);
	});

	// ─── Parameter filters ────────────────────────────────────────────────────
	it('parses key:value as param with = operator', () => {
		const result = parseBooruQuery('status:ended');
		expect(result.params).toEqual([{ key: 'status', op: '=', value: 'ended' }]);
		expect(result.includeTags).toEqual([]);
	});

	it('parses key:>=value as param with >= operator', () => {
		const result = parseBooruQuery('volumes:>=4');
		expect(result.params).toEqual([{ key: 'volumes', op: '>=', value: '4' }]);
	});

	it('parses key:<=value', () => {
		const result = parseBooruQuery('volumes:<=10');
		expect(result.params).toEqual([{ key: 'volumes', op: '<=', value: '10' }]);
	});

	it('parses key:>value', () => {
		const result = parseBooruQuery('volumes:>5');
		expect(result.params).toEqual([{ key: 'volumes', op: '>', value: '5' }]);
	});

	it('parses key:<value', () => {
		const result = parseBooruQuery('volumes:<3');
		expect(result.params).toEqual([{ key: 'volumes', op: '<', value: '3' }]);
	});

	it('parses key:!=value', () => {
		const result = parseBooruQuery('status:!=dropped');
		expect(result.params).toEqual([{ key: 'status', op: '!=', value: 'dropped' }]);
	});

	// ─── Value aliases ────────────────────────────────────────────────────────
	it('resolves type:ln to light_novel', () => {
		const result = parseBooruQuery('type:ln');
		expect(result.params).toEqual([{ key: 'type', op: '=', value: 'light_novel' }]);
	});

	it('resolves type:m to manga', () => {
		const result = parseBooruQuery('type:m');
		expect(result.params).toEqual([{ key: 'type', op: '=', value: 'manga' }]);
	});

	it('resolves location:apt to apartment', () => {
		const result = parseBooruQuery('location:apt');
		expect(result.params).toEqual([{ key: 'location', op: '=', value: 'apartment' }]);
	});

	it('resolves source:store to bookstore', () => {
		const result = parseBooruQuery('source:store');
		expect(result.params).toEqual([{ key: 'source', op: '=', value: 'bookstore' }]);
	});

	it('resolves source:fair to bookfair', () => {
		const result = parseBooruQuery('source:fair');
		expect(result.params).toEqual([{ key: 'source', op: '=', value: 'bookfair' }]);
	});

	it('resolves watchlist:yes to true', () => {
		const result = parseBooruQuery('watchlist:yes');
		expect(result.params).toEqual([{ key: 'watchlist', op: '=', value: 'true' }]);
	});

	it('resolves draft:no to false', () => {
		const result = parseBooruQuery('draft:no');
		expect(result.params).toEqual([{ key: 'draft', op: '=', value: 'false' }]);
	});

	// ─── Unknown key:value treated as bare word ──────────────────────────────
	it('treats unknown key:value as bare word', () => {
		const result = parseBooruQuery('foo:bar');
		// "foo" is not a known param key, so the whole token is a bare word
		expect(result.includeTags).toEqual(['foo:bar']);
		expect(result.params).toEqual([]);
	});

	// ─── Combined queries ─────────────────────────────────────────────────────
	it('parses a full combined query', () => {
		const result = parseBooruQuery('isekai romance -harem status:ongoing volumes:>=2 type:ln');
		expect(result.includeTags).toEqual(['isekai', 'romance']);
		expect(result.excludeTags).toEqual(['harem']);
		expect(result.params).toEqual([
			{ key: 'status', op: '=', value: 'ongoing' },
			{ key: 'volumes', op: '>=', value: '2' },
			{ key: 'type', op: '=', value: 'light_novel' }
		]);
	});

	it('parses publisher param', () => {
		const result = parseBooruQuery('publisher:kadokawa');
		expect(result.params).toEqual([{ key: 'publisher', op: '=', value: 'kadokawa' }]);
	});

	// ─── Case insensitivity of keys ───────────────────────────────────────────
	it('normalizes param keys to lowercase', () => {
		const result = parseBooruQuery('Status:ended TYPE:ln');
		expect(result.params).toEqual([
			{ key: 'status', op: '=', value: 'ended' },
			{ key: 'type', op: '=', value: 'light_novel' }
		]);
	});

	// ─── Quoted strings ───────────────────────────────────────────────────────
	it('supports quoted multi-word tags', () => {
		const result = parseBooruQuery('"slice of life" isekai');
		expect(result.includeTags).toEqual(['slice of life', 'isekai']);
	});

	it('supports excluding quoted tags', () => {
		const result = parseBooruQuery('-"slice of life"');
		expect(result.excludeTags).toEqual(['slice of life']);
	});

	// ─── Name search param ────────────────────────────────────────────────────
	it('parses name: as a param filter', () => {
		const result = parseBooruQuery('name:overlord');
		expect(result.params).toEqual([{ key: 'name', op: '=', value: 'overlord' }]);
		expect(result.includeTags).toEqual([]);
	});

	// ─── Edge cases ───────────────────────────────────────────────────────────
	it('handles extra whitespace', () => {
		const result = parseBooruQuery('  isekai   -harem   status:ended  ');
		expect(result.includeTags).toEqual(['isekai']);
		expect(result.excludeTags).toEqual(['harem']);
		expect(result.params).toEqual([{ key: 'status', op: '=', value: 'ended' }]);
	});

	it('handles key: with no value as bare word', () => {
		const result = parseBooruQuery('status:');
		// Empty value after colon — treated as bare word
		expect(result.includeTags).toEqual(['status:']);
	});
});

describe('buildBooruQuery', () => {
	it('builds query from parsed result', () => {
		const query = buildBooruQuery({
			includeTags: ['isekai', 'romance'],
			excludeTags: ['harem'],
			params: [
				{ key: 'status', op: '=', value: 'ongoing' },
				{ key: 'volumes', op: '>=', value: '4' }
			],
			searchTerms: ['isekai', 'romance']
		});
		expect(query).toBe('isekai romance -harem status:ongoing volumes:>=4');
	});

	it('handles empty parsed result', () => {
		const query = buildBooruQuery({
			includeTags: [],
			excludeTags: [],
			params: [],
			searchTerms: []
		});
		expect(query).toBe('');
	});

	it('quotes multi-word tags', () => {
		const query = buildBooruQuery({
			includeTags: ['slice of life'],
			excludeTags: ['school life'],
			params: [],
			searchTerms: []
		});
		expect(query).toBe('"slice of life" -"school life"');
	});
});
