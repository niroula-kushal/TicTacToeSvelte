<script>
  import GameBoard from "./GameBoard.svelte";
  let gameMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  let gameMoves = [];
  let winner = null;
  let player = 1;
  let gameOver = false;
  const nextPlayer = () => (player == 1 ? 2 : 1);
  const alreadySelected = (rowIndex, colIndex) =>
    gameMatrix[rowIndex][colIndex] !== 0;
  const gameWon = () => {
    winner = player;
    gameOver = true;
  };
  const verifyGame = (rowIndex, colIndex) => {
    const rowConquered = gameMatrix[rowIndex].every(x => x === player);
    if (rowConquered) {
      gameWon();
      return;
    }
    const colConquered = gameMatrix.every(x => x[colIndex] === player);
    if (colConquered) {
      gameWon();
      return;
    }
    if (rowIndex === colIndex) {
      const diagonal = gameMatrix.every(
        (r, idx) => gameMatrix[idx][idx] === player
      );
      if (diagonal) {
        gameWon();
        return;
      }
    }
    const noMoves = gameMatrix.every(row => row.every(x => x !== 0));
    if (noMoves) {
      gameOver = true;
    }
  };

  const recordMove = (rowIndex, colIndex) => {
    gameMoves = [
      ...gameMoves,
      {
        row: rowIndex,
        col: colIndex,
        player: player
      }
    ];
  };

  const selectCell = (rowIndex, colIndex) => {
    if (gameOver) return;
    if (alreadySelected(rowIndex, colIndex)) return;
    gameMatrix[rowIndex][colIndex] = player;
    recordMove(rowIndex, colIndex);
    verifyGame(rowIndex, colIndex);
    player = nextPlayer();
  };

  const restartGame = () => {
    gameMoves = [];
    gameMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    player = 1;
    winner = null;
    gameOver = false;
  };
</script>

<style>
  #app {
    display: flex;
    background: #fff;
    border-radius: 4px;
    padding: 20px;
    transition: all 0.2s;
  }
  #playground {
    flex: 1 auto;
  }
  button {
	padding: 10px;
  	background: rgba(200, 100, 23, .8);
  }
</style>

<div id="app">
  <div id="playground">
    Player {player}'s turn
    <GameBoard {gameMatrix} onCellSelect={selectCell} />
    <br />
    {#if gameOver}
      Game Over.
      {#if winner != null}
        Winner : Player {winner}
      {:else}No more Moves Left.{/if}
      <button on:click={restartGame}>Play Again</button>
    {/if}
  </div>
  <div id="history">
	<ul>
		{#each gameMoves as move}
		<li>
			Player {move.player} chose Row : {move.row} , Col : {move.col}
		</li>
		{/each}
	</ul>
  </div>
</div>
