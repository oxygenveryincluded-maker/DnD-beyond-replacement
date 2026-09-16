import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	const base = (env.BUILD_BASE ? `/${env.BUILD_BASE.replace(/^\/|\/$/g, '')}` : '') as '' | `/${string}`;
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