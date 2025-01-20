const Poll = {
  DISCONNECTED: "disconnected",
  TIMEOUT: "timeout",
};

const Command = {
  MOVE: "move",
  NEXT_MOVE: "nextMove",
  REGISTER: "register",
  MATCH: "match",
  HANDSHAKE: "handshake",
  DISCONNECT: "disconnect",
};

(() => {
  const m = { Poll, Command };
  try {
    module.exports = m;
  } catch (e) {}
  try {
    Object.assign(window, m);
  } catch (e) {}
})();
