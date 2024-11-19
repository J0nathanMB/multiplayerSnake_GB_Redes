const io = require('socket.io')({
  cors: {
    origin: '*', // Permite qualquer origem
    methods: ['GET', 'POST'], // Métodos permitidos
  },
});
const cors = require('cors'); // Middleware CORS
const express = require('express'); // Requerido para o uso do cors
const { initGame, gameLoop, getUpdatedVelocity } = require('./game');
const { FRAME_RATE } = require('./constants');
const { makeid } = require('./utils');

const app = express();
app.use(cors()); // Aplica o middleware CORS
app.get('/', (req, res) => res.send('Server is running!')); // Rota básica para teste

const state = {};
const clientRooms = {};

io.on('connection', (client) => {
  client.on('keydown', handleKeydown);
  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);

  function handleJoinGame(roomName) {
    const room = io.sockets.adapter.rooms.get(roomName);

    let numClients = room ? room.size : 0;

    if (numClients === 0) {
      client.emit('unknownCode');
      return;
    } else if (numClients > 1) {
      client.emit('tooManyPlayers');
      return;
    }

    clientRooms[client.id] = roomName;
    client.join(roomName);
    client.number = 2;
    client.emit('init', 2);

    startGameInterval(roomName);
  }

  function handleNewGame() {
    let roomName = makeid(5);
    clientRooms[client.id] = roomName;
    client.emit('gameCode', roomName);

    state[roomName] = initGame();

    client.join(roomName);
    client.number = 1;
    client.emit('init', 1);
  }

  function handleKeydown(keyCode) {
    const roomName = clientRooms[client.id];
    if (!roomName) {
      return;
    }
    try {
      keyCode = parseInt(keyCode);
    } catch (e) {
      console.error(e);
      return;
    }

    const vel = getUpdatedVelocity(keyCode);

    if (vel) {
      state[roomName].players[client.number - 1].vel = vel;
    }
  }
});

function startGameInterval(roomName) {
  const intervalId = setInterval(() => {
    const winner = gameLoop(state[roomName]);

    if (!winner) {
      emitGameState(roomName, state[roomName]);
    } else {
      emitGameOver(roomName, winner);
      state[roomName] = null;
      clearInterval(intervalId);
    }
  }, 1000 / FRAME_RATE);
}

function emitGameState(room, gameState) {
  io.to(room).emit('gameState', JSON.stringify(gameState));
}

function emitGameOver(room, winner) {
  io.to(room).emit('gameOver', JSON.stringify({ winner }));
}

const PORT = process.env.PORT || 3000;
io.listen(PORT, () => console.log(`Server running on port ${PORT}`));
