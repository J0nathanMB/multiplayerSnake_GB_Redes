const BG_COLOUR = '#231f20';
const SNAKE_COLOUR = '#c2c2c2';
const FOOD_COLOUR = '#e66916';

// const socket = io('http://localhost:3000');

const socket = io("https://multiplayersnake-gb-redes.onrender.com", {
  withCredentials: true,    // Suporte a cookies e credenciais
});

socket.on("connect", () => {
  console.log(`Conectado ao servidor: ${socket.id}`);
});

socket.on("disconnect", () => {
  console.log("Desconectado do servidor.");
});

socket.emit("test");

socket.on('init', handleInit);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);
socket.on('gameCode', handleGameCode);
socket.on('unknownCode', handleUnknownCode);
socket.on('tooManyPlayers', handleTooManyPlayers);
socket.on('returnToMenu', handleReturnToMenu); // Novo evento para retornar ao menu

const gameScreen = document.getElementById('gameScreen');
const initialScreen = document.getElementById('initialScreen');
const newGameBtn = document.getElementById('newGameButton');
const joinGameBtn = document.getElementById('joinGameButton');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');

newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);

let canvas, ctx;
let playerNumber;
let gameActive = false;

function newGame() {
  socket.emit('newGame');
  init();
}

function joinGame() {
  const code = gameCodeInput.value;
  socket.emit('joinGame', code);
  init();
}

function init() {
  reset(); // Garante que tudo esteja limpo antes de começar
  initialScreen.style.display = "none";
  gameScreen.style.display = "block";

  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  canvas.width = canvas.height = 600;

  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  document.addEventListener('keydown', keydown);
  gameActive = true;
}

function keydown(e) {
  if (!gameActive) return; // Evita eventos enquanto o jogo está inativo
  socket.emit('keydown', e.keyCode);
}

function paintGame(state) {
  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const food = state.food;
  const gridsize = state.gridsize;
  const size = canvas.width / gridsize;

  ctx.fillStyle = FOOD_COLOUR;
  ctx.fillRect(food.x * size, food.y * size, size, size);

  paintPlayer(state.players[0], size, SNAKE_COLOUR);
  if (state.players[1]) {
    paintPlayer(state.players[1], size, 'red');
  }
}

function paintPlayer(playerState, size, colour) {
  if (!playerState || !playerState.snake) return;
  
  const snake = playerState.snake;
  ctx.fillStyle = colour;
  for (let cell of snake) {
    ctx.fillRect(cell.x * size, cell.y * size, size, size);
  }
}

function handleInit(number) {
  playerNumber = number;
}

function handleGameState(gameState) {
  if (!gameActive) return;
  
  gameState = JSON.parse(gameState);
  requestAnimationFrame(() => paintGame(gameState));
}

function handleGameOver(data) {
  if (!gameActive) return;

  data = JSON.parse(data);
  gameActive = false;

  if (data.winner === playerNumber) {
    alert('You Win!');
  } else {
    alert('You Lose :(');
  }

  reset(); // Retorna ao menu após o jogo acabar
}

function handleGameCode(gameCode) {
  gameCodeDisplay.innerText = gameCode;
}

function handleUnknownCode() {
  reset();
  alert('Unknown Game Code');
}

function handleTooManyPlayers() {
  reset();
  alert('This game is already in progress');
}

function handleReturnToMenu() {
  reset();
  alert('Game Over! Returning to menu.');
}

function reset() {
  playerNumber = null;
  gameCodeInput.value = '';
  initialScreen.style.display = "block";
  gameScreen.style.display = "none";

  // Limpar canvas
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Remover eventos
  document.removeEventListener('keydown', keydown);
  gameActive = false;
}
