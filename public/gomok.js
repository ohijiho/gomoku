class Gomok extends EventTarget {
  #board;
  #height;
  #width;
  #rule;
  #turn;
  #turnMap;
  #winner;

  #boardFn(r, c) {
    if (r < 0 || r >= this.#height || c < 0 || c > this.#width)
      return Gomok.Stone.BORDER;
    return this.#board[r][c];
  }

  #boundBoardFn;

  constructor(opts) {
    super();

    const { rule, turnMap, width, height } = {
      ...Gomok.defaultOpts,
      ...(opts ?? {}),
    };
    this.#boundBoardFn = this.#boardFn.bind(this);
    this.#board = [...Array(height).keys()].map(() =>
      [...Array(width).keys()].map(() => Gomok.Stone.EMPTY),
    );
    this.#height = height;
    this.#width = width;
    this.#rule = rule;
    this.#turnMap = { ...turnMap };
    this.#turn = turnMap[0];
    this.#winner = undefined;

    this.moves = [];
  }

  get width() {
    return this.#width;
  }

  get height() {
    return this.#height;
  }

  get board() {
    return this.#boundBoardFn;
  }

  get turn() {
    return this.#turn;
  }

  #testStone(stone) {
    return stone ?? this.#turn === this.#turn;
  }

  testRule(r, c, stone) {
    if (
      !(
        typeof r === "number" &&
        typeof c === "number" &&
        Number.isSafeInteger(r) &&
        Number.isSafeInteger(c)
      )
    )
      throw new Error(`invalid position: (${r}, ${c})`);

    if (!this.#testStone(stone)) return Gomok.RuleStatus.FORBIDDEN;

    if (this.#winner) return Gomok.RuleStatus.FORBIDDEN;

    if (this.board(r, c)) return Gomok.RuleStatus.FORBIDDEN;

    return this.#rule(this.board, this.#turn, r, c);
  }

  move(r, c, stone) {
    const status = this.testRule(r, c, stone);
    stone = this.#turn;

    if (status === Gomok.RuleStatus.FORBIDDEN) return;

    this.#board[r][c] = this.#turn;

    if (status === Gomok.RuleStatus.WINS) this.#winner = this.#turn;
    else this.#turn = this.nextTurn;

    this.moves.push([r, c]);

    this.dispatchEvent(new GomokMoveEvent(r, c, stone, this));
    if (this.#winner) this.dispatchEvent(new GomokWinnerEvent(this));
    this.dispatchEvent(new GomokUpdateEvent([[r, c]]));
  }

  giveUp(stone) {
    if (this.winner) return;

    if (!this.#testStone(stone)) return;
    stone = this.#turn;

    this.#winner = this.nextTurn;

    this.moves.push("giveUp");

    this.dispatchEvent(new GomokGiveUpEvent(this));
    this.dispatchEvent(new GomokWinnerEvent(this));
    this.dispatchEvent(new GomokUpdateEvent([]));
  }

  pass(stone) {
    if (this.winner) return;

    if (!this.#testStone(stone)) return;
    stone = this.#turn;

    this.#turn = this.nextTurn;

    this.moves.push("pass");

    this.dispatchEvent(new GomokPassEvent(stone, this));
    this.dispatchEvent(new GomokUpdateEvent([]));
  }

  get nextTurn() {
    return this.#turnMap[this.#turn];
  }

  get winner() {
    return this.#winner;
  }

  static Stone = {
    BLACK: "Black",
    WHITE: "White",
    BORDER: Symbol("Border"),
    EMPTY: 0,
  };

  static RuleStatus = {
    ALLOWED: 0,
    WINS: 1,
    FORBIDDEN: -1,
  };
}

class GomokMoveEvent extends Event {
  constructor(r, c, stone, gomok) {
    super("move");
    this.r = r;
    this.c = c;
    this.stone = stone;
    this.nextTurn = gomok.turn;
    this.win = gomok.winner === stone;
  }
}

class GomokPassEvent extends Event {
  constructor(stone, gomok) {
    super("pass");
    this.stone = stone;
    this.nextTurn = gomok.turn;
  }
}

class GomokGiveUpEvent extends Event {
  constructor(gomok) {
    super("giveup");
    this.stone = gomok.turn;
    this.winner = gomok.winner;
  }
}

class GomokWinnerEvent extends Event {
  constructor(gomok) {
    super("winner");
    this.winner = gomok.winner;
  }
}

class GomokUpdateEvent extends Event {
  constructor(moves) {
    super("update");
    this.moves = moves;
  }
}

(() => {
  const renjuRule = (board, stone, r, c) => {
    switch (stone) {
      case Gomok.Stone.BLACK:
        if (renju.testBlackForbidden(board, stone, [r, c]))
          return Gomok.RuleStatus.FORBIDDEN;
        if (renju.testBlackWins(board, stone, [r, c]))
          return Gomok.RuleStatus.WINS;
        return Gomok.RuleStatus.ALLOWED;
      case Gomok.Stone.WHITE:
        if (renju.testWhiteWins(board, stone, [r, c]))
          return Gomok.RuleStatus.WINS;
        return Gomok.RuleStatus.ALLOWED;
    }
    throw new Error(`invalid stone: ${stone}`);
  };

  const defaultOpts = {
    rule: renjuRule,
    turnMap: {
      0: Gomok.Stone.BLACK,
      [Gomok.Stone.BLACK]: Gomok.Stone.WHITE,
      [Gomok.Stone.WHITE]: Gomok.Stone.BLACK,
    },
    width: 15,
    height: 15,
  };

  Gomok.renjuRule = renjuRule;
  Gomok.defaultOpts = defaultOpts;
})();
