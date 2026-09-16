import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

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
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				}
			})
		]
	};
});