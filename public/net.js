const net = {
  async send(obj) {
    return fetch("./", {
      method: "POST",
      body: JSON.stringify(obj),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json();
    });
  },
  pollMinInterval: 500,
  pollIntervalMultiplier: 1.5,
  pollMaxInterval: 15000,
  pollReqTimeout: 30000,
  async poll(obj) {
    let sched = new Date().getTime();
    let delay = 0;
    for (;;) {
      const time = new Date().getTime();
      if (time < sched)
        await new Promise((resolve) => setTimeout(resolve, sched - time));
      sched = new Date().getTime() + delay;
      delay = Math.min(
        this.pollMaxInterval,
        Math.min(this.pollMinInterval, delay * this.pollIntervalMultiplier),
      );

      const abort = new AbortController();
      const h = setTimeout(() => {
        abort.abort();
      }, this.pollReqTimeout);

      const r = await fetch("./", {
        method: "POST",
        body: JSON.stringify(obj),
        headers: {
          "Content-Type": "application/json",
        },
        signal: abort.signal,
      })
        .catch((e) => {
          console.warn(e);
          return null;
        })
        .finally(() => {
          clearTimeout(h);
        });

      if (null) continue;
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);

      return r.json();
    }
  },
};

class Conn {
  #uuid;

  constructor() {
    this.#uuid = crypto.randomUUID();
  }

  async move(data) {
    await this.send({ move: data });
  }

  async nextMove() {
    return this.poll(Command.NEXT_MOVE);
  }

  async send(obj) {
    return net.send({ id: this.#uuid, value: obj });
  }

  async poll(obj) {
    for (;;) {
      const res = await net.send({ id: this.#uuid, value: obj });
      if (res.ok) return res.value;
      if (res === Poll.TIMEOUT) continue;
      if (res === Poll.DISCONNECTED) return res;
      throw new Error(`poll error: ${JSON.stringify(res)}`);
    }
  }
}
