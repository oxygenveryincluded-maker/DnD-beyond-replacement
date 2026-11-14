import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { SUPABASE_URL } from './src/lib/config.ts';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	// Production deploys live under /DnD-beyond-replacement/. Default to that so a
	// plain `npm run build` is always deployable-correct; BUILD_BASE overrides it.
	const subpath = (env.BUILD_BASE ? env.BUILD_BASE : mode === 'production' ? 'DnD-beyond-replacement' : '').replace(/^\/|\/$/g, '');
	const base = (subpath ? `/${subpath}` : '') as '' | `/${string}`;
	return {
		plugins: [
			tailwindcss(),
			sveltekit({
				adapter: adapter({ fallback: 'index.html' }),
				paths: { base },
				// Strict CSP. All pages are prerendered, so SvelteKit can hash its
				// inline bootstrap script (no 'unsafe-inline' for scripts, no eval).
				// GitHub Pages cannot send headers, so this lands as a <meta> tag.
				csp: {
					mode: 'hash',
					directives: {
						'default-src': ['self'],
						'script-src': ['self'],
						'style-src': ['self', 'unsafe-inline'],
						'img-src': ['self', 'data:'],
						'font-src': ['self'],
						'connect-src': [
							'self',
							SUPABASE_URL as `https://${string}.${string}`,
							SUPABASE_URL.replace(/^https:/, 'wss:') as `wss://${string}.${string}`
						],
						'manifest-src': ['self'],
						'media-src': ['none'],
						'object-src': ['none'],
						'frame-src': ['none'],
						'worker-src': ['self'],
						'base-uri': ['self'],
						'form-action': ['self'],
						'upgrade-insecure-requests': true
					}
				},
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				}
			})
		]
	};
});