class MultiPlayerGomok {
  #conn;
  #game;
  #stone;
  #turnSignal;
  #mutex;

  constructor(game, info) {
    this.#conn = new Conn();
    this.#game = game;
    this.info = info;
    this.#mutex = new Mutex();
    this.#turnSignal = new Signal();
  }

  #loopRunning;
  async loop() {
    if (this.#loopRunning) throw new Error("loop already started");
    this.#loopRunning = true;

    this.#game.addEventListener("update", () => {
      this.#turnSignal.notify();
    });

    const end = new Promise((resolve) => {
      this.#game.addEventListener("winner", async () => {
        await this.disconnect();
        resolve();
      });
    });

    try {
      await this.#register(this.info);

      const matchResult = await this.#match();
      if (!matchResult.ok) {
        if (matchResult === Poll.DISCONNECTED) return;
        throw new Error(`match failed: ${JSON.stringify(matchResult)}`);
      }

      this.opponentInfo = matchResult.info;
      const seed = matchResult.seed;
      if (!Number.isSafeInteger(seed))
        throw new Error("invalid seed from server");
      if (matchResult.number !== 0 && matchResult.number !== 1)
        throw new Error("invalid number from server");

      const handshakeResult = await this.#handshake();
      if (handshakeResult !== "ok") {
        if (handshakeResult === Poll.DISCONNECTED) return;
        throw new Error(`handshake failed: ${JSON.stringify(handshakeResult)}`);
      }

      const stones = [Gomok.Stone.BLACK, Gomok.Stone.WHITE];

      const stoneNumber = (seed & 1) ^ matchResult.number;
      this.#stone = stones[stoneNumber];

      console.log(`You are ${this.#stone}`);

      this.#turnSignal.notify();

      for (;;) {
        while (this.#game.turn === this.#stone) await this.#turnSignal.wait();

        const res = await this.#nextMove();
        if (res === Poll.DISCONNECTED) return;

        if (res === "pass") {
          this.#game.pass();
        } else if (res === "giveUp") {
          this.#game.giveUp();
        } else if (
          Array.isArray(res) &&
          res.length === 2 &&
          res.every((x) => typeof x === "number" && Number.isSafeInteger(x))
        ) {
          if (
            this.#game.testRule(res[0], res[1]) === Gomok.RuleStatus.FORBIDDEN
          )
            throw new Error(`received forbidden move: (${res[0]}, ${res[1]})`);

          this.#game.move(res[0], res[1]);
        } else {
          throw new Error(`received invalid move: ${JSON.stringify(res)}`);
        }

        if (this.#game.winner) break;

        if (this.#game.turn !== this.#stone) throw new Error("BUG");
      }
    } finally {
      await this.disconnect();
    }

    await end;
  }

  async move(r, c) {
    await this.#mutex.lock();
    try {
      if (this.#game.testRule(r, c, this.#stone) === Gomok.RuleStatus.FORBIDDEN)
        return;

      await this.#conn.move([r, c]);

      this.#game.move(r, c);
    } finally {
      this.#mutex.unlock();
    }
  }

  async pass() {
    await this.#mutex.lock();
    try {
      if (this.#stone !== this.#game.turn) return;

      await this.#conn.move("pass");

      this.#game.pass();
    } finally {
      this.#mutex.unlock();
    }
  }

  async giveUp() {
    await this.#mutex.lock();
    try {
      if (this.#stone !== this.#game.turn) return;

      await this.#conn.move("giveUp");

      this.#game.giveUp();
    } finally {
      this.#mutex.unlock();
    }
  }

  async #nextMove() {
    return this.#conn.nextMove();
  }

  async waitForTurn() {
    while (this.#game.turn !== this.#stone) await this.#turnSignal.wait();
  }

  async #register(info) {
    await this.#conn.send({ register: info });
  }

  async disconnect() {
    await this.#conn.send(Command.DISCONNECT);
  }

  async #match() {
    return this.#conn.poll(Command.MATCH);
  }

  async #handshake() {
    return this.#conn.poll(Command.HANDSHAKE);
  }

  get stone() {
    return this.#stone;
  }
}
