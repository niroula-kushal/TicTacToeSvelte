<script>
	import GameCell from './GameCell.svelte';
export let gameMatrix, onCellSelect;
</script>
<table>
	{#each gameMatrix as row, rowIndex}
		<tr>
				{#each row as col, colIndex}
					<GameCell {rowIndex} {colIndex} currentStatus={col} {onCellSelect} />
				{/each}
		</tr>
	{/each}	
</table>
