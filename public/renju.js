const renju = (() => {
  function testBlackWins(board, stone, pos) {
    return testFive(board, stone, pos);
  }

  function testBlackForbidden(board, stone, pos) {
    if (testFive(board, stone, pos)) return false;

    if (testOverline(board, stone, pos)) return true;

    if (testDoubleFour(board, stone, pos)) return true;

    if (testDoubleThree(board, stone, pos)) return true;

    return false;
  }

  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  function testWhiteWins(board, stone, pos) {
    return dirs.some((dir) => unbrokenRowLength(board, stone, pos, dir) >= 5);
  }

  function testFive(board, stone, pos) {
    return dirs.some((dir) => unbrokenRowLength(board, stone, pos, dir) === 5);
  }

  function testOverline(board, stone, pos) {
    return dirs.some((dir) => unbrokenRowLength(board, stone, pos, dir) > 5);
  }

  function testDoubleFour(board, stone, pos) {
    let count = 0;
    for (const dir of dirs) {
      const [a, b, c] = broken3Rows(board, stone, pos, dir);

      if (a === c && b <= 3 && a + b === 5) return true;

      if (a + b === 5 || b + c === 5) {
        if (++count === 2) return true;
      }
    }

    return false;
  }

  function testDoubleThree(board, stone, pos) {
    let count = 0;
    for (const dir of dirs) {
      if (isThree(board, stone, pos, dir)) {
        if (++count === 2) return true;
      }
    }

    return false;
  }

  function isThree(board, stone, pos, dir) {
    const { end1, end2 } = findEnds(board, stone, pos, dir);

    const wboard = (r, c) =>
      r === pos[0] && c === pos[1] ? stone : board(r, c);

    return (
      isOpenFour(wboard, stone, end1, dir) ||
      isOpenFour(wboard, stone, end2, neg(dir))
    );
  }

  function isOpenFour(board, stone, pos, dir) {
    if (board(...pos)) return false;

    const [a, b, c] = broken3Rows(board, stone, pos, dir);

    if (a !== 1 || b !== 4 || c !== 1) return false;

    if (testFive(board, stone, pos)) return false;

    if (testOverline(board, stone, pos)) return false;

    if (testDoubleFour(board, stone, pos)) return false;

    if (testDoubleThree(board, stone, pos)) return false;

    return true;
  }

  function unbrokenRowLength(board, stone, pos, dir) {
    return (
      findEnd(board, stone, pos, dir) + findEnd(board, stone, pos, neg(dir)) - 1
    );
  }

  function broken3Rows(board, stone, pos, dir) {
    const { end1, end2, length } = findEnds(board, stone, pos, dir);

    return [
      nextRow(board, stone, end1, dir),
      length,
      nextRow(board, stone, end2, neg(dir)),
    ];
  }

  function nextRow(board, stone, pos, dir) {
    if (board(...pos)) return 0;
    return findEnd(board, stone, pos, dir);
  }

  function findEnds(board, stone, pos, dir) {
    const i1 = findEnd(board, stone, pos, dir);
    const i2 = findEnd(board, stone, pos, neg(dir));

    return {
      end1: offset(pos, i1, dir),
      end2: offset(pos, i2, neg(dir)),
      length: i1 + i2 - 1,
    };
  }

  function findEnd(board, stone, pos, d) {
    const max = 6;

    for (let i = 1; i < max; i++) {
      if (board(...offset(pos, i, d)) !== stone) return i;
    }

    return max;
  }

  function neg(v) {
    return [-v[0], -v[1]];
  }

  function offset(p, i, d) {
    return [p[0] + i * d[0], p[1] + i * d[1]];
  }

  if (window.testEnabled)
    ((rawTestData) => {
      const stone = "B";
      const testCases = (() => {
        const lines = rawTestData
          .split("\n")
          .map((x) => x.trim())
          .filter((x) => x);
        const data = [];
        const width = 15,
          height = 15;
        for (let i = 0; i < lines.length; i += height + 2) {
          data.push({
            name: `line ${i + 1}-${i + height + 2}`,
            board: lines.slice(i, i + height),
            pos: lines[i + height].split(" ").map((x) => x - 1),
            label: lines[i + height + 1],
          });
        }

        return data.map(({ name, board, pos, label }) => ({
          name,
          board(r, c) {
            if (r < 0 || r >= height || c < 0 || c >= width) return "border";
            const res = board[r][c];
            if (res === "X") return 0;
            return res;
          },
          pos,
          label,
        }));
      })();

      function test(board, pos) {
        if (testFive(board, stone, pos)) return "X";

        if (testOverline(board, stone, pos)) return "6";

        if (testDoubleFour(board, stone, pos)) return "44";

        if (testDoubleThree(board, stone, pos)) return "33";

        return "X";
      }

      for (const { name, board, pos, label } of testCases) {
        const ans = test(board, pos);
        if (ans !== label)
          throw new Error(
            `Test failed (${name}): ${label} expected != ${ans} actual`,
          );
      }

      console.log("renju.js tests passed");
      document.write("passed");
    })(`\
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXBXXXXX
XXXXBXXWWXXXXXX
XXXXXWBBWXXXXXX
XXXXXXWBWWXXXXX
XXXXXXXBXXBXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
10 9
33
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXWBWWWBXXXXX
XXXXXXBBXXXXXXX
XXXXXXWXWWXXXXX
XXXXXXWBBXXXXXX
XXXXXXXBBXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
9 8
44
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXBXXXXXXXXXX
XXXXXWXXXWXXXXX
XXXXBWXXBXXXXXX
XXXXWXBWWXXXXXX
XXXBXBWBWXXXXXX
XXXXWWXBWBXXXXX
XXBBBWBBBWXXXXX
XXBBWWBWBBBXXXX
XBWWXBWXXWXXXXX
XXBWXBBWWWXXXXX
XBWWWWBWBWXXXXX
XWXWXBXBXWXXXXX
XXXBXXXXXBXXXXX
11 5
6
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXWXWXXXX
XXXXBWBBXXXXXXX
XXXXXWXBXXWXXXX
XXXXXXBWXXXXXXX
XXXXXXXBXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
8 9
X
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXWXXXXXXXX
XXXXXXWWBWXXXXX
XXXXXXWBWBXXXXX
XXXXXXXBXBXXXXX
XXXXXXWBXXXXXXX
XXXXXXBXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
8 7
X
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXWXXXXXXXXX
XXXXXBBXXWWXXXX
XXXXXXXXBXXXXXW
XXXXWXBBXXXXWBX
XXXXWXWBWBBWBXX
XXXXXXBXWXWXXXX
XXXXXXXXXBBWXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
7 9
33
XXXXXWXXXXXXXXX
XXXXXBXXXXXXXXX
XXXXXBWXXXXXXXX
XBXXWBWBXXXXXXX
XXWWBBXWBXXXXXX
XXWWBWBWWWBXXXX
XWBBWXXBBWWXXXX
BXBWXXWBWBBBWXX
XWBXXXBWXWBWBXX
XBWXXBBXBBBWXXX
WXWXWWBWWWWBWXX
XXXBXBBWBWWWBXX
XXXXBXWBBWBXBWX
XXXBXXXXXXXXXXX
XXWXXXXXXXXXXXX
10 8
X
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXWXXXWXXX
XXXXXXWBXXXBXXX
XXXXXXWBWXWBXXX
XXXXXXXBWBWBWXX
XXXXXXXBWBWBWXX
XXXXXXXXBXBXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
9 10
X
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
XXXXWXBWBXXXXXX
XXXXWWBBWXXXXXX
XXXXXBXBBWXXXXX
XXXXWBBXXWBXXXX
XXXXBXWWXXXXXXX
XXXBXXXXXXXXXXX
XXWXXXXWXXXXXXX
XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX
9 7
6
`);

  return {
    testBlackWins,
    testBlackForbidden,
    testWhiteWins,
  };
})();
