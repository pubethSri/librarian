// ─── Booru-style Search Parser ──────────────────────────────────────────────
// Parses structured search queries like:
//   "isekai romance -harem status:ended volumes:>=4 type:ln"
//
// Grammar:
//   token         = param_token | exclude_token | include_token
//   param_token   = key ":" operator? value
//   exclude_token = "-" word
//   include_token = word
//
//   key      = known param name (status, type, volumes, publisher, etc.)
//   operator = ">=" | "<=" | "!=" | ">" | "<" | "=" (default if omitted)
//   value    = non-whitespace string
//   word     = non-whitespace string (treated as tag name)

/** A parsed parameter filter */
export type ParsedParam = {
	key: string;
	op: string;  // '=', '!=', '>', '<', '>=', '<='
	value: string;
};

/** Result of parsing a booru query string */
export type ParsedBooruQuery = {
	/** Tags to include (bare words) */
	includeTags: string[];
	/** Tags to exclude (prefixed with -) */
	excludeTags: string[];
	/** Parameter filters (key:value pairs) */
	params: ParsedParam[];
	/** Bare words that could also be name search terms */
	searchTerms: string[];
};

/** Known parameter keys that map to data columns */
const KNOWN_PARAM_KEYS = new Set([
	'status',
	'type',
	'volumes',
	'publisher',
	'watchlist',
	'location',
	'source',
	'draft',
	'name'
]);

/** Value aliases — shorthand → canonical value */
const VALUE_ALIASES: Record<string, Record<string, string>> = {
	type: {
		ln: 'light_novel',
		lightnovel: 'light_novel',
		light_novel: 'light_novel',
		m: 'manga',
		manga: 'manga'
	},
	status: {
		ongoing: 'ongoing',
		ended: 'ended',
		dropped: 'dropped'
	},
	location: {
		home: 'home',
		apartment: 'apartment',
		apt: 'apartment'
	},
	source: {
		bookstore: 'bookstore',
		bookfair: 'bookfair',
		online: 'online',
		store: 'bookstore',
		fair: 'bookfair'
	},
	watchlist: {
		true: 'true',
		false: 'false',
		yes: 'true',
		no: 'false'
	},
	draft: {
		true: 'true',
		false: 'false',
		yes: 'true',
		no: 'false'
	}
};

/** Regex to extract operator prefix from a value string */
const OP_REGEX = /^(>=|<=|!=|>|<|=)?(.+)$/;

/**
 * Parse a booru-style query string into structured filter data.
 *
 * @example
 * parseBooruQuery("isekai -harem status:ended volumes:>=4 type:ln")
 * // → {
 * //     includeTags: ["isekai"],
 * //     excludeTags: ["harem"],
 * //     params: [
 * //       { key: "status", op: "=", value: "ended" },
 * //       { key: "volumes", op: ">=", value: "4" },
 * //       { key: "type", op: "=", value: "light_novel" }
 * //     ],
 * //     searchTerms: ["isekai"]
 * //   }
 */
export function parseBooruQuery(input: string): ParsedBooruQuery {
	const result: ParsedBooruQuery = {
		includeTags: [],
		excludeTags: [],
		params: [],
		searchTerms: []
	};

	if (!input || !input.trim()) return result;

	const tokens = tokenize(input);

	for (const token of tokens) {
		// Check for param syntax: key:value
		const colonIndex = token.indexOf(':');
		if (colonIndex > 0) {
			const key = token.slice(0, colonIndex).toLowerCase();
			const rawValue = token.slice(colonIndex + 1);

			if (KNOWN_PARAM_KEYS.has(key) && rawValue) {
				const match = OP_REGEX.exec(rawValue);
				if (match) {
					const op = match[1] || '=';
					let value = match[2];

					// Resolve aliases
					const aliases = VALUE_ALIASES[key];
					if (aliases && aliases[value.toLowerCase()]) {
						value = aliases[value.toLowerCase()];
					}

					result.params.push({ key, op, value });
				}
				continue;
			}
		}

		// Check for exclusion: -word
		if (token.startsWith('-') && token.length > 1) {
			result.excludeTags.push(token.slice(1));
			continue;
		}

		// Bare word → both a tag include and a search term
		result.includeTags.push(token);
		result.searchTerms.push(token);
	}

	return result;
}

/**
 * Tokenize input string, respecting quoted strings.
 * "hello world" becomes a single token, unquoted spaces split tokens.
 */
function tokenize(input: string): string[] {
	const tokens: string[] = [];
	let current = '';
	let inQuote = false;
	let quoteChar = '';

	for (let i = 0; i < input.length; i++) {
		const ch = input[i];

		if (inQuote) {
			if (ch === quoteChar) {
				inQuote = false;
				// Don't include the quote char in the token
			} else {
				current += ch;
			}
		} else if (ch === '"' || ch === "'") {
			inQuote = true;
			quoteChar = ch;
		} else if (ch === ' ' || ch === '\t') {
			if (current) {
				tokens.push(current);
				current = '';
			}
		} else {
			current += ch;
		}
	}

	if (current) {
		tokens.push(current);
	}

	return tokens;
}

/**
 * Reconstruct a booru query string from a parsed result.
 * Useful for syncing tag chips → search bar text.
 */
export function buildBooruQuery(parsed: ParsedBooruQuery): string {
	const parts: string[] = [];

	for (const tag of parsed.includeTags) {
		parts.push(tag.includes(' ') ? `"${tag}"` : tag);
	}

	for (const tag of parsed.excludeTags) {
		parts.push(`-${tag.includes(' ') ? `"${tag}"` : tag}`);
	}

	for (const param of parsed.params) {
		const op = param.op === '=' ? '' : param.op;
		parts.push(`${param.key}:${op}${param.value}`);
	}

	return parts.join(' ');
}
