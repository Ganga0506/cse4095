(() => {
  "use strict";

  const { overflowSum, nextMoves, isTerminal } = globalThis.ChopsticksGame;
  const { buildDPTable, getBestMove, stateKey } = globalThis.ChopsticksAI;

  const elements = {
    setup: document.querySelector("#game-setup"),
    role: document.querySelector("#player-role"),
    maxDepth: document.querySelector("#max-depth"),
    depthLimit: document.querySelector("#depth-limit"),
    currentStep: document.querySelector("#current-step"),
    remainingMoves: document.querySelector("#remaining-moves"),
    statusMessage: document.querySelector("#status-message"),
    gameStatusHeading: document.querySelector("#game-status-heading"),
    gameResult: document.querySelector("#game-result"),
    boardHeading: document.querySelector("#board-heading"),
    boardPrompt: document.querySelector("#board-prompt"),
    playerAZone: document.querySelector(".player-a"),
    playerBZone: document.querySelector(".player-b"),
    playerARole: document.querySelector("#player-a-role"),
    playerBRole: document.querySelector("#player-b-role"),
    playerATurn: document.querySelector("#player-a-turn"),
    playerBTurn: document.querySelector("#player-b-turn"),
    currentState: document.querySelector("#current-state"),
    computerRole: document.querySelector("#computer-role"),
    optimizationMode: document.querySelector("#optimization-mode"),
    consideredMoves: document.querySelector("#considered-moves"),
    consideredCount: document.querySelector("#considered-count"),
    selectedMove: document.querySelector("#selected-move"),
    predictedOutcome: document.querySelector("#predicted-outcome"),
    redistribution: document.querySelector("#redistribution-controls"),
    redistributionDescription: document.querySelector("#redistribution-description"),
    transferAmount: document.querySelector("#transfer-amount"),
    transferValue: document.querySelector("#transfer-value"),
    transferButton: document.querySelector("#transfer-fingers"),
    hands: [...document.querySelectorAll(".hand-card")],
  };

  let state;
  let maxDepth;
  let dpTable;
  let humanPlayer;
  let computerPlayer;
  let selectedHand = null;
  let gameOver = false;
  let computerTimer = null;
  const thinkingDelay = 650;

  function playerForTurn() {
    return state.h % 2 === 0 ? "a" : "b";
  }

  function isComputerTurn() {
    return !gameOver && playerForTurn() === computerPlayer;
  }

  function arraysEqual(left, right) {
    return left[0] === right[0] && left[1] === right[1];
  }

  function statesEqual(left, right) {
    return stateKey(left) === stateKey(right);
  }

  function cloneState(value) {
    return { a: [...value.a], b: [...value.b], h: value.h };
  }

  function findLegalMove(candidate) {
    return nextMoves(state).find((move) => statesEqual(move, candidate)) || null;
  }

  function handIndex(side) {
    return side === "left" ? 0 : 1;
  }

  function handName(index) {
    return index === 0 ? "left" : "right";
  }

  function formatState(value) {
    return `A [${value.a.join(", ")}] · B [${value.b.join(", ")}] · h = ${value.h}`;
  }

  function describeMove(from, to) {
    const actor = from.h % 2 === 0 ? "a" : "b";
    const target = actor === "a" ? "b" : "a";
    const actorBefore = from[actor];
    const actorAfter = to[actor];
    const targetBefore = from[target];
    const targetAfter = to[target];
    const actorLabel = actor.toUpperCase();
    const targetLabel = target.toUpperCase();

    if (!arraysEqual(targetBefore, targetAfter)) {
      const targetIndex = targetBefore[0] !== targetAfter[0] ? 0 : 1;
      const sourceIndex = [0, 1].find(
        (index) =>
          actorBefore[index] > 0 &&
          overflowSum(actorBefore[index], targetBefore[targetIndex]) === targetAfter[targetIndex]
      );
      const source = sourceIndex === undefined ? "hand" : handName(sourceIndex);
      return `${actorLabel} ${source} → ${targetLabel} ${handName(targetIndex)}`;
    }

    const sourceIndex = actorAfter[0] < actorBefore[0] ? 0 : 1;
    const amount = actorBefore[sourceIndex] - actorAfter[sourceIndex];
    return `Redistribute ${actorLabel} ${handName(sourceIndex)} → ${handName(1 - sourceIndex)} (${amount})`;
  }

  function setPrompt(message, isError = false) {
    elements.boardPrompt.lastChild.textContent = ` ${message}`;
    elements.boardPrompt.classList.toggle("is-error", isError);
  }

  function clearSelection() {
    selectedHand = null;
    elements.hands.forEach((hand) => {
      hand.classList.remove("is-selected", "is-target");
      hand.setAttribute("aria-pressed", "false");
    });
    elements.redistribution.hidden = true;
  }

  function selectHand(side) {
    const index = handIndex(side);
    const count = state[humanPlayer][index];
    if (count === 0) {
      setPrompt("A hand with 0 fingers cannot start a move.", true);
      return;
    }

    selectedHand = side;
    elements.hands.forEach((hand) => {
      hand.classList.toggle(
        "is-selected",
        hand.dataset.player === humanPlayer && hand.dataset.hand === side
      );
      hand.setAttribute("aria-pressed", String(hand.classList.contains("is-selected")));
      hand.classList.toggle("is-target", hand.dataset.player === computerPlayer &&
        state[computerPlayer][handIndex(hand.dataset.hand)] > 0);
    });

    elements.transferAmount.max = String(count);
    elements.transferAmount.value = "1";
    elements.transferValue.value = "1";
    elements.redistributionDescription.textContent = `Move fingers from your ${side} hand to your ${side === "left" ? "right" : "left"} hand.`;
    elements.redistribution.hidden = false;
    setPrompt(`Selected your ${side} hand. Choose an opponent’s hand to attack, or redistribute.`);
  }

  function attemptAttack(targetSide) {
    if (!selectedHand) {
      setPrompt("Select one of your own hands before choosing a target.", true);
      return;
    }

    const sourceIndex = handIndex(selectedHand);
    const targetIndex = handIndex(targetSide);
    const candidate = cloneState(state);
    candidate[computerPlayer][targetIndex] = overflowSum(
      state[humanPlayer][sourceIndex],
      state[computerPlayer][targetIndex]
    );
    candidate.h += 1;

    const legalMove = findLegalMove(candidate);
    if (!legalMove) {
      setPrompt("That attack is not legal. Choose a living target hand.", true);
      return;
    }

    applyMove(legalMove);
  }

  function attemptRedistribution() {
    if (!selectedHand || isComputerTurn() || gameOver) return;

    const sourceIndex = handIndex(selectedHand);
    const targetIndex = 1 - sourceIndex;
    const amount = Number(elements.transferAmount.value);
    const candidate = cloneState(state);
    candidate[humanPlayer][sourceIndex] -= amount;
    candidate[humanPlayer][targetIndex] += amount;
    candidate.h += 1;

    const legalMove = findLegalMove(candidate);
    if (!legalMove) {
      setPrompt("That redistribution is not legal. Adjust the amount and try again.", true);
      return;
    }

    applyMove(legalMove);
  }

  function scoreClass(score) {
    if (score > 0) return "score-win";
    if (score < 0) return "score-loss";
    return "score-tie";
  }

  function updateAnalysis() {
    elements.currentState.value = formatState(state);
    elements.computerRole.textContent = `Player ${computerPlayer.toUpperCase()}`;
    elements.optimizationMode.textContent =
      computerPlayer === "a" ? "Maximizing A’s outcome" : "Minimizing A’s outcome";
    elements.consideredMoves.replaceChildren();

    if (gameOver || state.h >= maxDepth) {
      elements.consideredCount.textContent = "0";
      elements.selectedMove.value = "No move available";
      let finalOutcome = "TIE";
      if (state.a[0] === 0 && state.a[1] === 0) finalOutcome = "LOSS";
      if (state.b[0] === 0 && state.b[1] === 0) finalOutcome = "WIN";
      elements.predictedOutcome.value = finalOutcome;
      elements.predictedOutcome.className = `outcome outcome-${finalOutcome.toLowerCase()}`;
      return;
    }

    const analysis = getBestMove(state, dpTable);
    elements.consideredCount.textContent = String(analysis.evaluatedMoves.length);

    for (const item of analysis.evaluatedMoves) {
      const listItem = document.createElement("li");
      if (analysis.bestMove && statesEqual(item.move, analysis.bestMove)) {
        listItem.classList.add("is-selected");
      }

      const description = document.createElement("span");
      const title = document.createElement("strong");
      const stateText = document.createElement("small");
      const score = document.createElement("data");
      title.textContent = describeMove(state, item.move);
      stateText.textContent = formatState(item.move).replace(` · h = ${item.move.h}`, "");
      score.value = String(item.score);
      score.textContent = item.score > 0 ? "+1" : String(item.score);
      score.className = scoreClass(item.score);
      description.append(title, stateText);
      listItem.append(description, score);
      elements.consideredMoves.append(listItem);
    }

    elements.selectedMove.value = analysis.bestMove
      ? describeMove(state, analysis.bestMove)
      : "No move available";
    elements.predictedOutcome.value = analysis.predictedOutcome;
    elements.predictedOutcome.className = `outcome outcome-${analysis.predictedOutcome.toLowerCase()}`;
  }

  function renderHand(player, side, count) {
    const card = document.querySelector(`#${player}-${side}`);
    const countElement = document.querySelector(`#${player}-${side}-count`);
    countElement.textContent = String(count);
    card.setAttribute("aria-label", `Player ${player.toUpperCase()} ${side} hand, ${count} fingers`);
    card.classList.toggle("is-dead", count === 0);
    [...card.querySelectorAll(".finger-meter i")].forEach((finger, index) => {
      finger.classList.toggle("is-raised", index < count);
    });
  }

  function render() {
    const activePlayer = playerForTurn();
    document.querySelector(".status-banner").classList.toggle("is-thinking", isComputerTurn());
    const humanTurn = !gameOver && activePlayer === humanPlayer;
    renderHand("a", "left", state.a[0]);
    renderHand("a", "right", state.a[1]);
    renderHand("b", "left", state.b[0]);
    renderHand("b", "right", state.b[1]);

    elements.currentStep.textContent = String(state.h);
    elements.depthLimit.textContent = String(maxDepth);
    elements.remainingMoves.textContent = String(Math.max(0, maxDepth - state.h));
    elements.playerAZone.classList.toggle("is-active", !gameOver && activePlayer === "a");
    elements.playerBZone.classList.toggle("is-active", !gameOver && activePlayer === "b");
    elements.playerATurn.textContent = activePlayer === "a" && !gameOver ? "Active turn" : "Waiting";
    elements.playerBTurn.textContent = activePlayer === "b" && !gameOver ? "Active turn" : "Waiting";
    elements.playerARole.textContent = `${humanPlayer === "a" ? "You" : "Computer"} · Maximizing`;
    elements.playerBRole.textContent = `${humanPlayer === "b" ? "You" : "Computer"} · Minimizing`;

    elements.hands.forEach((hand) => {
      const isOwnHand = hand.dataset.player === humanPlayer;
      const isTargetHand = hand.dataset.player === computerPlayer;
      hand.disabled = gameOver || isComputerTurn() || hand.classList.contains("is-dead") || (!isOwnHand && !isTargetHand);
    });

    if (!gameOver) {
      elements.statusMessage.textContent = isComputerTurn()
        ? `Computer is thinking — Player ${activePlayer.toUpperCase()}`
        : `Your turn — Player ${activePlayer.toUpperCase()}`;
      elements.boardHeading.textContent = isComputerTurn() ? "Computer’s move" : "Choose your move";
      if (humanTurn && !selectedHand) {
        setPrompt("Select one of your hands to begin a move.");
      } else if (isComputerTurn()) {
        setPrompt("The computer is evaluating its legal moves.");
      }
    }

    updateAnalysis();
  }

  function finishGame() {
    gameOver = true;
    clearSelection();

    let result = "TIE";
    let detail = "Maximum depth reached";
    const humanLost = state[humanPlayer][0] === 0 && state[humanPlayer][1] === 0;
    const computerLost = state[computerPlayer][0] === 0 && state[computerPlayer][1] === 0;

    if (humanLost && !computerLost) {
      result = "LOSS";
      detail = `Player ${computerPlayer.toUpperCase()} wins`;
    } else if (computerLost && !humanLost) {
      result = "WIN";
      detail = `Player ${humanPlayer.toUpperCase()} wins`;
    }

    elements.gameStatusHeading.textContent = "Game over";
    elements.statusMessage.textContent = `${result} — ${detail}`;
    elements.gameResult.hidden = false;
    elements.gameResult.querySelector("strong").textContent = result;
    elements.gameResult.querySelector("span").textContent = detail;
    elements.boardHeading.textContent = "Game complete";
    setPrompt("Use Restart to play again.");
    render();
  }

  function checkForGameOver() {
    if (isTerminal(state) || state.h >= maxDepth) {
      finishGame();
      return true;
    }
    return false;
  }

  function applyMove(move) {
    const previous = state;
    const computerMoved = isComputerTurn();
    clearSelection();
    state = cloneState(move);
    render();
    if (!checkForGameOver()) scheduleComputerMove();
    if (computerMoved) {
      elements.hands.forEach((hand) => {
        const player = hand.dataset.player;
        const index = handIndex(hand.dataset.hand);
        if (previous[player][index] !== state[player][index]) {
          hand.classList.add("just-moved");
        }
      });
    }
  }

  function scheduleComputerMove() {
    clearTimeout(computerTimer);
    if (!isComputerTurn()) return;

    // Render first so the user can inspect every scored move before the AI acts.
    render();
    computerTimer = setTimeout(() => {
      if (!isComputerTurn()) return;
      const analysis = getBestMove(state, dpTable);
      if (!analysis.bestMove) {
        finishGame();
        return;
      }
      applyMove(analysis.bestMove);
    }, thinkingDelay);
  }

  function restartGame(event) {
    event?.preventDefault();
    clearTimeout(computerTimer);
    elements.hands.forEach((hand) => hand.classList.remove("just-moved"));
    maxDepth = Math.max(0, Number.parseInt(elements.maxDepth.value, 10) || 10);
    elements.maxDepth.value = String(maxDepth);
    humanPlayer = elements.role.value === "human-a" ? "a" : "b";
    computerPlayer = humanPlayer === "a" ? "b" : "a";
    state = { a: [1, 1], b: [1, 1], h: 0 };
    dpTable = buildDPTable(maxDepth);
    gameOver = false;
    selectedHand = null;
    elements.gameResult.hidden = true;
    elements.gameStatusHeading.textContent = "Game in progress";
    clearSelection();
    render();
    scheduleComputerMove();
  }

  elements.setup.addEventListener("submit", restartGame);
  elements.transferAmount.addEventListener("input", () => {
    elements.transferValue.value = elements.transferAmount.value;
  });
  elements.transferButton.addEventListener("click", attemptRedistribution);

  elements.hands.forEach((hand) => {
    hand.addEventListener("animationend", () => hand.classList.remove("just-moved"));
    hand.addEventListener("click", () => {
      if (gameOver || isComputerTurn()) return;
      if (hand.dataset.player === humanPlayer) {
        selectHand(hand.dataset.hand);
      } else {
        attemptAttack(hand.dataset.hand);
      }
    });
  });

  restartGame();
})();
