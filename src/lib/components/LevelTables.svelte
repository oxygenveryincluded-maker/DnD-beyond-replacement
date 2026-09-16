<script lang="ts">
	import { formatTableTags } from '$lib/utils/dnd';

	let { tables = [] }: { tables: { title: string; colLabels: string[]; rows: string[][] }[] } = $props();
</script>

{#if tables.length}
	<h2 class="font-display text-lg font-semibold text-dnd-gold mb-2 mt-6">The {tables.length > 1 ? 'Tables' : 'Table'}</h2>
	<div class="space-y-4">
		{#each tables as table}
			<div class="stat-block">
				{#if table.title}
					<p class="mb-2 text-xs font-semibold text-dnd-gold">{@html formatTableTags(table.title)}</p>
				{/if}
				<div class="overflow-x-auto">
					<table class="w-full text-xs">
						<thead>
							<tr class="border-b border-dnd-border">
								{#each table.colLabels as label, i}
									<th class="px-2 py-1 text-left font-semibold text-dnd-gold {i === 0 ? 'w-8' : ''}">{@html formatTableTags(label)}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each table.rows as row}
								<tr class="border-b border-dnd-border/50">
									{#each row as cell, i}
										<td class="px-2 py-1 {i === 0 ? 'font-semibold text-dnd-gold' : ''}">{@html formatTableTags(cell)}</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/each}
	</div>
{/if}