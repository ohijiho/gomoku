class Mutex {
  #lock;
  #unlock;

  async lock() {
    while (!tryLock()) await this.#lock;
  }

  tryLock() {
    if (this.#lock) return false;
    this.#lock = new Promise((resolve) => {
      this.#unlock = resolve;
    });
    return true;
  }

  unlock() {
    this.#unlock();
  }
}

class Signal {
  #wait;
  #notify;

  constructor() {
    this.#notify = () => {};
    this.notify();
  }

  async wait() {
    return this.#wait;
  }

  notify() {
    this.#notify();
    this.#wait = new Promise((resolve) => {
      this.#notify = resolve;
    });
  }
}

class Barrier {
  #value;
  #promise;
  #resolve;

  constructor(value) {
    this.#value = value;
    this.#promise = new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }

  async wait() {
    if (--this.#value === 0) this.#resolve();

    return this.#promise;
  }

  unwait() {
    this.#value++;
  }
}

(() => {
  const m = { Mutex, Signal, Barrier };
  try {
    module.exports = m;
  } catch (e) {}
  try {
    Object.assign(window, m);
  } catch (e) {}
})();
