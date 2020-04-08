<script>
export let rowIndex, colIndex, currentStatus, onCellSelect;
	const handleClick = () => {
		onCellSelect(rowIndex, colIndex);
	};
</script>
<style>
.red {
  background: red;
}
td {
  height: 30px;
  width: 30px;
  border: 2px solid blue;
}
.green {
  background: green;
}
</style>

<td class="{currentStatus == 1 ? 'red' : currentStatus == 2 ? 'green' : ''}" on:click={handleClick}>

</td>