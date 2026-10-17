import nodeAdapter from '@sveltejs/adapter-node';
import vercelAdapter from '@sveltejs/adapter-vercel';

// Vercel sets VERCEL=1 during its build; everywhere else (Docker, the laptop) stays adapter-node
const adapter = process.env.VERCEL
	? // Singapore, next to the Neon database
		vercelAdapter({ regions: ['sin1'] })
	: nodeAdapter();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter,
		typescript: {
			config: (config) => ({
				...config,
				include: [...config.include, '../drizzle.config.ts']
			})
		}
	}
};

export default config;
