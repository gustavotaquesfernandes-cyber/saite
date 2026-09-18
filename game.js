const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

const keys = {};
const road = { x: 250, width: 400, y: 0, height: canvas.height };
const laneCount = 3;
let obstacles = [];
let particles = [];
let lastTimestamp = 0;
let spawnTimer = 0;
let score = 0;
let bestScore = Number(localStorage.getItem('car-game-best') || 0);
let gameRunning = false;
let gameOver = false;

bestScoreEl.textContent = String(bestScore);

function createPlayer() {
  return {
    x: road.x + road.width / 2,
    y: canvas.height - 120,
    width: 44,
    height: 88,
    speed: 0,
    maxSpeed: 11,
    acceleration: 0.22,
    braking: 0.32,
    friction: 0.09,
    turnSpeed: 5.2,
    rotation: 0,
  };
}

let player = createPlayer();

function resetGame() {
  obstacles = [];
  particles = [];
  score = 0;
  player = createPlayer();
  spawnTimer = 0.8;
  gameOver = false;
  gameRunning = true;
  scoreEl.textContent = '0';
}

function gameOverState() {
  gameRunning = false;
  gameOver = true;
  bestScore = Math.max(bestScore, Math.floor(score));
  localStorage.setItem('car-game-best', String(bestScore));
  bestScoreEl.textContent = String(bestScore);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function spawnObstacle() {
  const laneWidth = road.width / laneCount;
  const lane = Math.floor(Math.random() * laneCount);
  const x = road.x + laneWidth * lane + laneWidth / 2;
  const width = 48;
  const height = 92;

  obstacles.push({
    x,
    y: -height - 30,
    width,
    height,
    speed: 4 + Math.random() * 3.5 + player.speed * 0.55,
  });
}

function createParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 25 + Math.random() * 20,
      color,
      radius: 2 + Math.random() * 4,
    });
  }
}

function update(dt) {
  if (!gameRunning) {
    return;
  }

  const accelerate = keys.ArrowUp || keys.KeyW;
  const brake = keys.ArrowDown || keys.KeyS;
  const left = keys.ArrowLeft || keys.KeyA;
  const right = keys.ArrowRight || keys.KeyD;

  if (accelerate) {
    player.speed += player.acceleration;
  }

  if (brake) {
    player.speed -= player.braking;
  }

  if (!accelerate && !brake) {
    player.speed -= player.friction * (player.speed > 0 ? 1 : -1);
  }

  player.speed = clamp(player.speed, 0, player.maxSpeed);

  if (left) {
    player.x -= (player.turnSpeed + player.speed * 0.18) * dt * 60;
    player.rotation = -0.22;
  } else if (right) {
    player.x += (player.turnSpeed + player.speed * 0.18) * dt * 60;
    player.rotation = 0.22;
  } else {
    player.rotation *= 0.9;
  }

  player.x = clamp(player.x, road.x + 24, road.x + road.width - 24);

  score += player.speed * 0.6 * dt * 60;
  scoreEl.textContent = String(Math.floor(score));

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = 0.9 - Math.min(score / 120, 0.45);
  }

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    obstacle.y += (player.speed * 1.5 + obstacle.speed) * dt * 60;

    if (obstacle.y > canvas.height + obstacle.height) {
      obstacles.splice(i, 1);
      continue;
    }

    if (rectsIntersect(player, obstacle)) {
      createParticles(player.x, player.y, '#ff5d73', 26);
      gameOverState();
      return;
    }
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.x += particle.vx * dt * 60;
    particle.y += particle.vy * dt * 60;
    particle.life -= dt * 60;
    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function rectsIntersect(a, b) {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
}

function drawBackground() {
  ctx.fillStyle = '#142132';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1d2d3d';
  ctx.fillRect(road.x - 28, 0, 28, canvas.height);
  ctx.fillRect(road.x + road.width, 0, 28, canvas.height);

  ctx.fillStyle = '#43464d';
  ctx.fillRect(road.x, 0, road.width, canvas.height);

  ctx.strokeStyle = '#f4f4f5';
  ctx.lineWidth = 4;
  ctx.setLineDash([28, 28]);
  ctx.beginPath();
  ctx.moveTo(road.x + road.width / 3, 0);
  ctx.lineTo(road.x + road.width / 3, canvas.height);
  ctx.moveTo(road.x + (road.width * 2) / 3, 0);
  ctx.lineTo(road.x + (road.width * 2) / 3, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#d7dbe2';
  for (let i = 0; i < 12; i += 1) {
    const offset = (i * 120 + (score * 2.2) % 120) % (canvas.height + 100);
    ctx.fillRect(road.x + road.width / 2 - 4, offset - 60, 8, 52);
  }
}

function drawCar(x, y, width, height, color, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.fillStyle = color;
  ctx.fillRect(-width / 2, -height / 2, width, height);

  ctx.fillStyle = '#dfe7f0';
  ctx.fillRect(-width / 2 + 8, -height / 2 + 12, width - 16, height * 0.38);

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-width / 2 + 6, -height / 2 + 6, 10, 18);
  ctx.fillRect(width / 2 - 16, -height / 2 + 6, 10, 18);
  ctx.fillRect(-width / 2 + 6, height / 2 - 24, 10, 18);
  ctx.fillRect(width / 2 - 16, height / 2 - 24, 10, 18);

  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life / 40);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGameOverBanner() {
  if (!gameOver) {
    return;
  }

  ctx.fillStyle = 'rgba(3, 8, 12, 0.56)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f8fbff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 54px Arial';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);

  ctx.font = '26px Arial';
  ctx.fillStyle = '#9ec5ff';
  ctx.fillText(`Pontuação: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 30);
  ctx.fillText('Aperte Reiniciar para jogar de novo', canvas.width / 2, canvas.height / 2 + 70);
}

function draw() {
  drawBackground();

  for (const obstacle of obstacles) {
    drawCar(obstacle.x, obstacle.y, obstacle.width, obstacle.height, '#ff7a59');
  }

  drawCar(player.x, player.y, player.width, player.height, '#4dd0ff', player.rotation);
  drawParticles();

  if (!gameRunning && !gameOver) {
    ctx.fillStyle = 'rgba(3, 8, 12, 0.40)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f8fbff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('Pronto para dirigir?', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '22px Arial';
    ctx.fillStyle = '#9ec5ff';
    ctx.fillText('Clique em Iniciar para começar', canvas.width / 2, canvas.height / 2 + 25);
  }

  drawGameOverBanner();
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000 || 0.016, 0.032);
  lastTimestamp = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Space') {
    if (!gameRunning && !gameOver) {
      resetGame();
    }
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

startBtn.addEventListener('click', () => {
  resetGame();
});

restartBtn.addEventListener('click', () => {
  resetGame();
});

resetGame();
gameRunning = false;
scoreEl.textContent = '0';
requestAnimationFrame(loop);
