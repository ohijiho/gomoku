const game = new Gomok();

const stones = { [Gomok.Stone.EMPTY]: "" };

function clickCell(r, c) {
  game.move(r, c);
}

game.addEventListener("update", (e) => {
  console.log(e);

  const winner = game.winner;
  if (winner) {
    statusDiv.innerHTML = `<h1 style="text-align: center; margin: 0;">Winner: ${winner}</h1>`;
  }

  e.moves.forEach(([r, c]) => {
    const stone = game.board(r, c);
    console.log(r, c, stone);

    cells[r][c].innerHTML = stones[stone];
  });
});

const cells = [...Array(game.height).keys()].map((r) =>
  [...Array(game.width).keys()].map((c) => {
    const node = document.createElement("div");
    node.addEventListener("click", () => {
      clickCell(r, c);
    });
    return node;
  }),
);

const statusDiv = document.createElement("div");

addEventListener("load", () => {
  const size = 50;
  const container = document.getElementById("game_container");
  const board = document.createElement("div");
  board.style.background = "yellow";
  board.style.margin = "0 auto";
  board.style.width = `${size * game.width}px`;
  board.style.height = `${size * game.height}px`;

  const bg = (() => {
    const tblContainer = document.createElement("div");
    tblContainer.style.paddingLeft = `${Math.floor(size / 2)}px`;
    tblContainer.style.paddingTop = `${Math.floor(size / 2)}px`;
    const tbl = document.createElement("div");
    tbl.style.background = "black";
    tbl.style.height = `${size * (game.height - 1) - 1}px`;
    tbl.style.width = `${size * (game.width - 1) - 1}px`;
    tbl.style.padding = "1px";
    for (let i = 0; i < game.height - 1; i++) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.height = `${size - 1}px`;
      if (i) row.style.marginTop = "1px";
      for (let j = 0; j < game.width - 1; j++) {
        const cell = document.createElement("div");
        cell.style.background = board.style.background;
        cell.style.height = row.style.height;
        cell.style.width = `${size - 1}px`;
        if (j) cell.style.marginLeft = "1px";
        row.appendChild(cell);
      }
      tbl.appendChild(row);
    }
    tblContainer.appendChild(tbl);
    return tblContainer;
  })();

  bg.style.position = "absolute";
  board.appendChild(bg);

  const fg = document.createElement("div");
  cells.forEach((row, r) =>
    row.forEach((node, c) => {
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      node.style.position = "absolute";
      node.style.left = `${c * size}px`;
      node.style.top = `${r * size}px`;
      fg.appendChild(node);
    }),
  );

  fg.style.position = "absolute";
  board.appendChild(fg);

  statusDiv.style.height = "100px";

  container.appendChild(statusDiv);
  container.appendChild(board);

  function stoneHTML(background) {
    return `<div style="
        border-radius: ${size / 2}px;
        width: ${size}px;
        height: ${size}px;
        background: ${background};
    " ></div>`;
  }
  stones[Gomok.Stone.BLACK] = stoneHTML("black");
  stones[Gomok.Stone.WHITE] = stoneHTML("white");
});
