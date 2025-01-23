const express = require("express");
const crypto = require("node:crypto");
const { Barrier, Signal, ConditionVariable, List } = require("./public/util");
const { Command, Poll } = require("./public/common");
const app = express();
const port = +(process.env.PORT ?? 3000);

app.use(express.json());

const store = new Map();
const matchingMap = new Map();
const expireList = new List();

const expireDelay = 180e3;

function register(id, { info, matchingKey }) {
  const s = {
    id,
    info,
    hs: undefined,
    peer: null,
    matched: new ConditionVariable(),
    disconnected: new ConditionVariable(),
    established: false,
    move: null,
    sig: new Signal(),
    expiresAt: new Date().getTime() + expireDelay,
    node: undefined,
    matchingKey,
  };

  store.set(id, s);
  expireList.pushBack(s);
  s.node = expireList.end.prev;

  console.log(`registered ${id} ${JSON.stringify(info)}`);

  if (!matchingMap.has(matchingKey)) {
    matchingMap.set(matchingKey, s);
    return;
  }

  const t = matchingMap.get(matchingKey);
  matchingMap.delete(matchingKey);
  match(s, t);
}

function match(s, t) {
  s.peer = t;
  t.peer = s;
  if (false) {
    const seed = crypto
      .hash("sha256", s.id.toString() + t.id.toString(), "bunfer")
      .readUInt32BE(0);
  }
  const seed = Math.floor(Math.random() * 65536);
  s.seed = seed;
  t.seed = seed;
  s.number = 0;
  t.number = 1;
  s.hs = new Barrier(2);
  t.hs = s.hs;

  s.matched.resolve();
  t.matched.resolve();

  console.log(`matched ${s.id} and ${t.id}`);
}

async function poll(req, res, s, promise, cb, timeoutMS) {
  const aborted = new Promise((resolve) => {
    res.on("close", () => {
      resolve();
    });
  });

  let timeoutHandle;
  const timeout = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => {
      resolve();
    }, timeoutMS ?? 60e3);
  });

  try {
    const x = await Promise.race([
      promise.then((x) => ({ ok: true, value: x })),
      aborted.then(() => null),
      timeout.then(() => Poll.TIMEOUT),
      s.disconnected.wait().then(() => Poll.DISCONNECTED),
    ]);

    if (!x) return;

    res.json(x);

    if (x.ok && cb) cb(x.value);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

app.post("/", async (req, res) => {
  const { id, value } = req.body;

  if (!id) {
    res.status(400).end();
    return;
  }

  if (typeof value === "object" && "register" in value) {
    if (store.has(id)) {
      res.status(409).end();
      return;
    }

    register(id, value.register);

    res.json({});
    return;
  }

  const s = store.get(id);
  if (!s) {
    res.status(409).end();
    return;
  }

  s.expiresAt = new Date().getTime() + expireDelay;
  expireList.splice(s.node, expireList.end);

  if (value === Command.MATCH) {
    await poll(
      req,
      res,
      s,
      s.matched.wait().then(() => ({
        ok: true,
        info: s.peer.info,
        seed: s.seed,
        number: s.number,
      })),
    );
  } else if (value === Command.HANDSHAKE) {
    if (!s.hs) {
      res.status(409).end();
      return;
    }
    try {
      await poll(
        req,
        res,
        s,
        s.hs.wait().then(() => "ok"),
        () => {
          s.established = true;
        },
      );
    } finally {
      s.hs.unwait();
    }
  } else if (typeof value === "object" && "move" in value) {
    if (!s.established) {
      res.status(409).end();
      return;
    }

    s.peer.move = null;
    s.move = value.move;
    s.sig.notify();

    res.json({});
  } else if (value === Command.NEXT_MOVE) {
    if (!s.established) {
      res.status(409).end();
      return;
    }

    await poll(
      req,
      res,
      s,
      (async () => {
        while (!s.peer.move) await s.peer.sig.wait();
        return s.peer.move;
      })(),
    );
  } else if (value === Command.DISCONNECT) {
    console.log(`disconnected ${id}`);
    s.disconnected.resolve();
    res.json({});
  } else if (value === Command.PING) {
    res.json({});
  } else {
    res.status(400).end();
  }
});

app.use(express.static("public"));

app.get("/favicon.ico", (req, res) => {
  res.end();
});

app.listen(port, () => {
  console.log(`Listening port: ${port}`);
});

setInterval(() => {
  const t = new Date().getTime();
  while (!expireList.empty && t >= expireList.front.expiresAt) {
    const s = expireList.front;
    expireList.popFront();
    if (s.peer) s.peer.disconnected.resolve();
    store.delete(s.id);
    if (matchingMap.get(s.matchingKey) === s) matchingMap.delete(s.matchingKey);
    console.log(`release ${s.id}`);
  }

  if (store.size || matchingMap.size) {
    console.log(
      `store.size: ${store.size}, matchingMap.size: ${matchingMap.size}`,
    );
  }
}, 60e3);
