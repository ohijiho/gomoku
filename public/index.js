const game = new Gomoku();
const multi = new MultiPlayerGomoku(game);

const stones = { [Gomoku.Stone.EMPTY]: "" };
const indicators = {};

let selectedCell = null;
let isTouch = false;

function clickCell(r, c) {
  if (selectedCell && selectedCell[0] === r && selectedCell[1] === c) {
    multi.move(r, c);
  } else {
    if (selectedCell) mouseEnterLeave(selectedCell[0], selectedCell[1], false);
    mouseEnterLeave(r, c, true);
  }
}

function mouseEnterLeave(r, c, enter) {
  if (game.board(r, c)) return;

  if (game.turn !== multi.stone) return;

  const node = cells[r][c];

  if (enter) selectedCell = [r, c];

  if (!enter) {
    node.innerHTML = stones[Gomoku.Stone.EMPTY];
  } else if (game.testRule(r, c) === Gomoku.RuleStatus.FORBIDDEN) {
    node.innerHTML = indicators[Gomoku.RuleStatus.FORBIDDEN];
  } else {
    node.innerHTML = stones[game.turn] + indicators.premove;
  }
}

let lastMove = null;

game.addEventListener("update", (e) => {
  console.log(e);

  let newLastMove = null;

  e.moves.forEach(([r, c]) => {
    const stone = game.board(r, c);
    console.log(r, c, stone);

    cells[r][c].innerHTML = stones[stone];

    newLastMove = [r, c];
  });

  if (newLastMove) {
    if (lastMove) {
      const [r, c] = lastMove;
      cells[r][c].innerHTML = stones[game.board(r, c)];
    }

    const [r, c] = newLastMove;
    cells[r][c].innerHTML = stones[game.board(r, c)] + indicators.lastMove;

    lastMove = newLastMove;
  }
});

const cells = [...Array(game.height).keys()].map((r) =>
  [...Array(game.width).keys()].map((c) => {
    const node = document.createElement("div");
    node.addEventListener("click", () => {
      clickCell(r, c);
    });
    node.addEventListener("mouseenter", () => {
      if (isTouch) return;
      mouseEnterLeave(r, c, true);
    });
    node.addEventListener("mouseleave", () => {
      mouseEnterLeave(r, c, false);
    });
    node.addEventListener("touchstart", () => {
      isTouch = true;
    });
    return node;
  }),
);

const statusDiv = document.createElement("div");
multi.messageContainer = statusDiv;

function initGame() {
  const size = 50;
  const container = document.getElementById("game_container");
  const board = document.createElement("div");
  board.style.background = "#dcb766";
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

  const dots = [
    [7, 7],
    [3, 3],
    [3, 11],
    [11, 3],
    [11, 11],
  ];
  const dotSize = 3;
  dots.forEach(([r, c]) => {
    const dot = document.createElement("div");
    dot.style.background = "black";
    dot.style.width = `${dotSize * 2 + 1}px`;
    dot.style.height = `${dotSize * 2 + 1}px`;
    dot.style.position = "absolute";
    dot.style.top = `${r * size + size * 0.5 - dotSize}px`;
    dot.style.left = `${c * size + size * 0.5 - dotSize}px`;
    dot.style.borderRadius = `${dotSize + 0.5}px`;
    bg.appendChild(dot);
  });

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
      pointer-events: none;
    " ></div>`;
  }
  stones[Gomoku.Stone.BLACK] = stoneHTML("black");
  stones[Gomoku.Stone.WHITE] = stoneHTML("white");
  indicators[Gomoku.RuleStatus.FORBIDDEN] = `<div style="
    height: ${size}px;
    display: flex;
    flex-flow: column;
    justify-content: center;
    pointer-events: none;
  "><div style="
    text-align: center;
    font-size: ${size * 0.75}px;
    vertical-align: middle;
    -webkit-user-select: none; /* Safari */
    -ms-user-select: none; /* IE 10 and IE 11 */
    user-select: none; /* Standard syntax */
  ">&#x274c;</div></div>`;
  const indSize = 5;
  indicators.lastMove = `<div style="
    width: ${indSize * 2 + 1}px;
    height: ${indSize * 2 + 1}px;
    border-radius: ${indSize + 0.5}px;
    background: red;
    position: absolute;
    left: ${size * 0.5 - indSize}px;
    top: ${size * 0.5 - indSize}px;
  "></div>`;
  const premoveWidth = 3;
  indicators.premove = `<div style="
    border-radius: ${size / 2}px;
    width: ${size - premoveWidth * 2}px;
    height: ${size - premoveWidth * 2}px;
    border: ${premoveWidth}px solid lime;
    pointer-events: none;
    position: absolute;
    left: 0;
    top: 0;
  " ></div>`;
}

async function gameLoop() {
  await multi.loop().then(() => {
    console.log("disconnected");
  });
}

addEventListener("load", () => {
  const container = document.getElementById("game_container");

  const query = new URL(location.href).searchParams;
  const matchingKey = query.get("matchingKey");
  const name = query.get("infoName");

  if (matchingKey && name) {
    multi.registerMetadata = { matchingKey, info: { name } };

    initGame();
    gameLoop();
    return;
  }

  if (matchingKey) {
    container.innerHTML = `<form action="">
        <input type="hidden" name="matchingKey" value="${matchingKey}" />
        <label>
          <span>Name: </span>
          <input name="infoName" />
        </label>
        <input type="submit" />
      </form>`;
  } else {
    const privateKey = crypto.randomUUID();
    container.innerHTML = `
      <div><a href="?matchingKey=public"><h1>Public</h1></a></div>
      <div><a href="?matchingKey=${privateKey}"><h1>Private</h1></a></div>
    `;
  }
});
