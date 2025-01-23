class MultiPlayerGomoku {
  #conn;
  #game;
  #stone;
  #turnSignal;
  #mutex;
  #pingHandle;
  pingInterval = 30e3;

  constructor(game, registerMetadata) {
    this.#conn = new Conn();
    this.#game = game;
    this.registerMetadata = registerMetadata;
    this.#mutex = new Mutex();
    this.#turnSignal = new Signal();
    this.lastStatus = "";
  }

  #loopRunning;
  async loop() {
    if (this.#loopRunning) throw new Error("loop already started");
    this.#loopRunning = true;

    this.#game.addEventListener("update", () => {
      this.#turnSignal.notify();
      this.updateMessage();
    });

    const end = new Promise((resolve) => {
      this.#game.addEventListener("winner", async () => {
        await this.disconnect();
        resolve();
      });
    });

    try {
      await this.#register(this.registerMetadata);

      this.lastStatus = `waiting for <a href="?matchingKey=${this.registerMetadata.matchingKey}">matching</a>`;
      this.updateMessage();

      setInterval(() => {
        this.#ping();
      }, this.pingInterval);

      const matchResult = await this.#match();
      if (!matchResult.ok) {
        if (matchResult === Poll.DISCONNECTED) return;
        throw new Error(`match failed: ${JSON.stringify(matchResult)}`);
      }

      this.opponentInfo = matchResult.info;
      this.updateMessage();
      const seed = matchResult.seed;
      if (!Number.isSafeInteger(seed))
        throw new Error("invalid seed from server");
      if (matchResult.number !== 0 && matchResult.number !== 1)
        throw new Error("invalid number from server");

      this.lastStatus = "found opponent";
      this.updateMessage();

      const handshakeResult = await this.#handshake();
      if (handshakeResult !== "ok") {
        if (handshakeResult === Poll.DISCONNECTED) return;
        throw new Error(`handshake failed: ${JSON.stringify(handshakeResult)}`);
      }

      this.lastStatus = "handshake done";
      this.updateMessage();

      const stones = [Gomoku.Stone.BLACK, Gomoku.Stone.WHITE];

      const stoneNumber = (seed & 1) ^ matchResult.number;
      this.#stone = stones[stoneNumber];
      this.updateMessage();

      console.log(`You are ${this.#stone}`);

      this.#turnSignal.notify();

      for (;;) {
        if (this.#game.turn === this.#stone) {
          await Promise.race([this.#turnSignal.wait(), end]);
          if (this.#game.winner) break;
        }

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
            this.#game.testRule(res[0], res[1]) === Gomoku.RuleStatus.FORBIDDEN
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
      if (typeof this.#pingHandle !== "undefined")
        clearInterval(this.#pingHandle);
      await this.disconnect();

      this.lastStatus = "disconnected";
      this.updateMessage();
    }

    await end;
  }

  async move(r, c) {
    await this.#mutex.lock();
    try {
      if (
        this.#game.testRule(r, c, this.#stone) === Gomoku.RuleStatus.FORBIDDEN
      )
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

  async #register(meta) {
    await this.#conn.send({ register: meta });
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

  async #ping() {
    await this.#conn.send(Command.PING);
  }

  get stone() {
    return this.#stone;
  }

  get message() {
    return `
      <div>Opponent: ${JSON.stringify(this.opponentInfo)}</div>
      <div>Your Stone: ${this.#stone}</div>
      <div>Turn: ${this.#game.turn}</div>
      <div>Winner: ${this.#game.winner}</div>
      <div>${this.lastStatus}</div>
    `;
  }

  updateMessage() {
    if (this.messageContainer) this.messageContainer.innerHTML = this.message;
  }
}
