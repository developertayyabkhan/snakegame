const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');

const startGameBtn = document.getElementById('startGameBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const menuBtn = document.getElementById('menuBtn');
const showLeaderboardBtn = document.getElementById('showLeaderboardBtn');
const howToPlayBtn = document.getElementById('howToPlayBtn');

const scoreDisplay = document.getElementById('scoreDisplay');
const lengthDisplay = document.getElementById('lengthDisplay');
const bestScore = document.getElementById('bestScore');
const difficultyLabel = document.getElementById('difficultyLabel');
const statusLabel = document.getElementById('statusLabel');
const soundToggle = document.getElementById('soundToggle');
const wallToggle = document.getElementById('wallToggle');
const gridToggle = document.getElementById('gridToggle');
const leaderboardList = document.getElementById('leaderboardList');

const boardSize = 24;
const cellSize = canvas.width / boardSize;

const difficulties = {
  easy: { label: 'Easy', speed: 150, points: 10 },
  medium: { label: 'Medium', speed: 110, points: 15 },
  hard: { label: 'Hard', speed: 75, points: 20 },
};

const gameState = {
  selectedDifficulty: 'medium',
  snake: [],
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  food: null,
  score: 0,
  running: false,
  paused: false,
  isGameOver: false,
  lastTime: 0,
  tickInterval: 110,
  best: Number(localStorage.getItem('snake-best-score') || 0),
  leaderboard: JSON.parse(localStorage.getItem('snake-leaderboard') || '[]'),
  settings: {
    sound: true,
    wallCollision: true,
    showGrid: false,
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function playTone() {
  if (!gameState.settings.sound) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const context = new AudioCtx();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 440;
  gainNode.gain.value = 0.03;

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.06);
  setTimeout(() => context.close(), 80);
}

function showMenu() {
  menuScreen.classList.add('active');
  gameScreen.classList.remove('active');
  gameOverlay.classList.remove('active');
  gameState.running = false;
  gameState.paused = false;
  statusLabel.textContent = 'Menu';
}

function showGame() {
  menuScreen.classList.remove('active');
  gameScreen.classList.add('active');
  statusLabel.textContent = gameState.paused ? 'Paused' : 'Playing';
}

function updateBestScore() {
  bestScore.textContent = String(gameState.best);
  localStorage.setItem('snake-best-score', String(gameState.best));
}

function updateLeaderboard() {
  const entries = [...gameState.leaderboard]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!entries.length) {
    leaderboardList.innerHTML = `
      <div class="leaderboard-entry">
        <span class="leaderboard-rank">#1</span>
        <span>No scores yet</span>
        <span class="leaderboard-score">0</span>
      </div>
    `;
    return;
  }

  leaderboardList.innerHTML = entries
    .map(
      (entry, index) => `
        <div class="leaderboard-entry">
          <span class="leaderboard-rank">#${index + 1}</span>
          <span>${entry.name}</span>
          <span class="leaderboard-score">${entry.score}</span>
        </div>
      `
    )
    .join('');
}

function saveLeaderboard() {
  localStorage.setItem('snake-leaderboard', JSON.stringify(gameState.leaderboard));
  updateLeaderboard();
}

function addScoreToLeaderboard() {
  const name = 'Player 1';
  gameState.leaderboard.push({ name, score: gameState.score });
  gameState.leaderboard = gameState.leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  saveLeaderboard();
}

function selectDifficulty(level) {
  const cards = document.querySelectorAll('.difficulty-card');
  cards.forEach((card) => {
    card.classList.toggle('active', card.dataset.difficulty === level);
  });

  gameState.selectedDifficulty = level;
  gameState.tickInterval = difficulties[level].speed;
  difficultyLabel.textContent = difficulties[level].label;
}

function createSnake() {
  const middle = Math.floor(boardSize / 2);
  return [
    { x: middle, y: middle },
    { x: middle - 1, y: middle },
    { x: middle - 2, y: middle },
  ];
}

function randomFoodPosition() {
  let position = null;
  do {
    position = {
      x: Math.floor(Math.random() * boardSize),
      y: Math.floor(Math.random() * boardSize),
    };
  } while (gameState.snake.some((segment) => segment.x === position.x && segment.y === position.y));

  return position;
}

function resetGame() {
  gameState.snake = createSnake();
  gameState.direction = { x: 1, y: 0 };
  gameState.nextDirection = { x: 1, y: 0 };
  gameState.food = randomFoodPosition();
  gameState.score = 0;
  gameState.running = true;
  gameState.paused = false;
  gameState.isGameOver = false;
  gameState.lastTime = 0;

  scoreDisplay.textContent = '0';
  lengthDisplay.textContent = String(gameState.snake.length);
  statusLabel.textContent = 'Playing';
  overlayTitle.textContent = 'Game Over';
  overlayMessage.textContent = 'Your score: 0';
  gameOverlay.classList.remove('active');

  showGame();
  draw();
}

function startGame() {
  resetGame();
  requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  if (!gameState.running) return;

  if (!gameState.lastTime) {
    gameState.lastTime = timestamp;
  }

  const delta = timestamp - gameState.lastTime;

  if (delta >= gameState.tickInterval) {
    gameState.lastTime = timestamp;
    updateGame();
  }

  if (gameState.running) {
    requestAnimationFrame(gameLoop);
  }
}

function updateGame() {
  if (gameState.paused || gameState.isGameOver) return;

  gameState.direction = { ...gameState.nextDirection };
  const head = { x: gameState.snake[0].x + gameState.direction.x, y: gameState.snake[0].y + gameState.direction.y };

  if (!gameState.settings.wallCollision) {
    head.x = (head.x + boardSize) % boardSize;
    head.y = (head.y + boardSize) % boardSize;
  }

  const hitWall =
    gameState.settings.wallCollision &&
    (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize);

  const willSelfHit = gameState.snake.some((segment, index) => {
    if (index === 0) return false;
    return segment.x === head.x && segment.y === head.y;
  });

  if (hitWall || willSelfHit) {
    endGame();
    return;
  }

  gameState.snake.unshift(head);

  if (head.x === gameState.food.x && head.y === gameState.food.y) {
    gameState.score += difficulties[gameState.selectedDifficulty].points;
    scoreDisplay.textContent = String(gameState.score);
    lengthDisplay.textContent = String(gameState.snake.length);
    if (gameState.score > gameState.best) {
      gameState.best = gameState.score;
      updateBestScore();
    }
    gameState.food = randomFoodPosition();
    playTone();
  } else {
    gameState.snake.pop();
  }

  draw();
}

function endGame() {
  gameState.running = false;
  gameState.isGameOver = true;
  overlayTitle.textContent = 'Game Over';
  overlayMessage.textContent = `Your score: ${gameState.score}`;
  gameOverlay.classList.add('active');
  statusLabel.textContent = 'Game Over';
  addScoreToLeaderboard();
  updateBestScore();
  draw();
}

function togglePause() {
  if (!gameState.running) return;
  gameState.paused = !gameState.paused;
  statusLabel.textContent = gameState.paused ? 'Paused' : 'Playing';
  if (gameState.paused) {
    pauseBtn.textContent = 'Resume';
    overlayTitle.textContent = 'Paused';
    overlayMessage.textContent = 'Press resume to continue.';
    gameOverlay.classList.add('active');
  } else {
    pauseBtn.textContent = 'Pause';
    gameOverlay.classList.remove('active');
    requestAnimationFrame(gameLoop);
  }
}

function changeDirection(next) {
  const isOpposite =
    next.x === -gameState.direction.x && next.y === -gameState.direction.y;

  if (!isOpposite) {
    gameState.nextDirection = next;
  }
}

function drawGrid() {
  if (!gameState.settings.showGrid) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= boardSize; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize, 0);
    ctx.lineTo(x * cellSize, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= boardSize; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize);
    ctx.lineTo(canvas.width, y * cellSize);
    ctx.stroke();
  }
}

function drawFood() {
  ctx.fillStyle = '#ff5f7a';
  const centerX = gameState.food.x * cellSize + cellSize / 2;
  const centerY = gameState.food.y * cellSize + cellSize / 2;

  ctx.beginPath();
  ctx.arc(centerX, centerY, cellSize * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnake() {
  gameState.snake.forEach((segment, index) => {
    const x = segment.x * cellSize;
    const y = segment.y * cellSize;

    ctx.fillStyle = index === 0 ? '#7fe7c4' : '#38b87a';
    ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

    if (index === 0) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + cellSize * 0.3, y + cellSize * 0.3, 4, 4);
      ctx.fillRect(x + cellSize * 0.6, y + cellSize * 0.3, 4, 4);
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0a0e27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  if (gameState.food) drawFood();
  drawSnake();
}

function setupControls() {
  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (key === 'arrowup' || key === 'w') changeDirection({ x: 0, y: -1 });
    if (key === 'arrowdown' || key === 's') changeDirection({ x: 0, y: 1 });
    if (key === 'arrowleft' || key === 'a') changeDirection({ x: -1, y: 0 });
    if (key === 'arrowright' || key === 'd') changeDirection({ x: 1, y: 0 });

    if (key === ' ') {
      event.preventDefault();
      togglePause();
    }
  });

  startGameBtn.addEventListener('click', startGame);
  resumeBtn.addEventListener('click', () => {
    if (gameState.isGameOver || !gameState.running) {
      startGame();
    } else {
      gameState.paused = false;
      pauseBtn.textContent = 'Pause';
      gameOverlay.classList.remove('active');
      statusLabel.textContent = 'Playing';
      requestAnimationFrame(gameLoop);
    }
  });

  restartBtn.addEventListener('click', () => startGame());
  menuBtn.addEventListener('click', () => showMenu());
  pauseBtn.addEventListener('click', togglePause);
  showLeaderboardBtn.addEventListener('click', () => {
    showMenu();
    updateLeaderboard();
  });
  howToPlayBtn.addEventListener('click', () => {
    alert('Use the arrow keys or WASD to move. Eat the red food, grow your snake, and avoid crashing into walls or yourself.');
  });

  soundToggle.addEventListener('change', () => {
    gameState.settings.sound = soundToggle.checked;
  });

  wallToggle.addEventListener('change', () => {
    gameState.settings.wallCollision = wallToggle.checked;
  });

  gridToggle.addEventListener('change', () => {
    gameState.settings.showGrid = gridToggle.checked;
    draw();
  });

  document.querySelectorAll('.difficulty-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectDifficulty(card.dataset.difficulty);
    });
  });
}

function init() {
  selectDifficulty('medium');
  updateBestScore();
  updateLeaderboard();
  setupControls();
  resetGame();
  showMenu();
  draw();
}

init();
