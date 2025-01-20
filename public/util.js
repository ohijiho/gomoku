class List {
  #end;

  constructor() {
    this.#end = { prev: undefined, next: undefined };
    this.#end.prev = this.#end;
    this.#end.next = this.#end;
  }

  get empty() {
    return this.#end.next === this.#end;
  }

  get begin() {
    return this.#end.next;
  }

  get end() {
    return this.#end;
  }

  insert(before, value) {
    const node = {
      value,
      prev: before.prev,
      next: before,
    };
    node.prev.next = node;
    node.next.prev = node;
    return node;
  }

  erase(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  pushBack(value) {
    this.insert(this.#end, value);
  }

  pushFront(value) {
    this.insert(this.#end.next, value);
  }

  splice(node, before) {
    this.erase(node);
    this.prev = before.prev;
    this.next = before;
    node.prev.next = node;
    node.next.prev = node;
  }

  get front() {
    return this.#end.next.value;
  }

  get back() {
    return this.#end.prev.value;
  }

  popFront() {
    this.erase(this.begin);
  }

  popBack() {
    this.erase(this.end.prev);
  }
}

class Mutex {
  #lock;
  #unlock;

  async lock() {
    while (!this.tryLock()) await this.#lock;
  }

  tryLock() {
    if (this.#lock) return false;
    this.#lock = new Promise((resolve) => {
      this.#unlock = resolve;
    });
    return true;
  }

  unlock() {
    this.#lock = null;
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

class ConditionVariable {
  #wait;
  #resolve;

  constructor() {
    this.#wait = new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }

  async wait() {
    return this.#wait;
  }

  resolve() {
    this.#resolve();
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
  const m = { List, Mutex, Signal, ConditionVariable, Barrier };
  try {
    module.exports = m;
  } catch (e) {}
  try {
    Object.assign(window, m);

    if (!crypto.randomUUID)
      crypto.randomUUID = () => {
        const buf = crypto.getRandomValues(new Uint8Array(16));
        const hex = [...buf]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
        return [
          hex.substring(0, 8),
          hex.substring(8, 12),
          hex.substring(12, 16),
          hex.substring(16, 20),
          hex.substring(20, 32),
        ].join("-");
      };
  } catch (e) {}
})();
