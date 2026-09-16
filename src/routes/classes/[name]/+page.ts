import classesData from '$lib/data/classes.json';

export const prerender = true;

export const entries = () => {
	const names = [...new Set((classesData as any[]).map((c) => c.name.toLowerCase()))];
	return names.map((name: string) => ({ name }));
};