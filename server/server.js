const io = require('socket.io')(process.env.PORT || 3000, {
  cors: {
    origin: "https://snakegame-redes-gb.netlify.app", // Permitir todas as origens
    methods: ["GET", "POST"], // Métodos permitidos
    credentials: true, // Permitir cookies, se necessário
  }
});
const { initGame, gameLoop, getUpdatedVelocity } = require('./game');
const { FRAME_RATE } = require('./constants');
const { makeid } = require('./utils');

const state = {};
const clientRooms = {};

io.on('connection', client => {
  console.log(`Client connected: ${client.id}`);

  client.on('keydown', handleKeydown);
  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);
  client.on('disconnect', handleDisconnect);

  function handleJoinGame(roomName) {
    const room = io.sockets.adapter.rooms.get(roomName);

    let numClients = 0;
    if (room) {
      numClients = room.size;
    }

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
    if (!roomName || !state[roomName]) {
      console.error(`Invalid room or state for client: ${client.id}`);
      return;
    }
    try {
      keyCode = parseInt(keyCode);
    } catch (e) {
      console.error(`Invalid keyCode: ${keyCode}`, e);
      return;
    }

    const vel = getUpdatedVelocity(keyCode);

    if (vel) {
      state[roomName].players[client.number - 1].vel = vel;
    }
  }

  function handleDisconnect() {
    const roomName = clientRooms[client.id];
    if (roomName) {
      console.log(`Client disconnected: ${client.id} from room: ${roomName}`);
      delete clientRooms[client.id];
    }
  }
});

function startGameInterval(roomName) {
  const intervalId = setInterval(() => {
    if (!state[roomName]) {
      console.error(`State for room ${roomName} is null. Clearing interval.`);
      clearInterval(intervalId);
      return;
    }

    const winner = gameLoop(state[roomName]);

    if (!winner) {
      emitGameState(roomName, state[roomName]);
    } else {
      emitGameOver(roomName, winner);

      // Limpar o estado e remover os jogadores da sala
      clearInterval(intervalId);
      delete state[roomName];

      const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
      if (clientsInRoom) {
        for (const clientId of clientsInRoom) {
          const client = io.of('/').sockets.get(clientId); // Ajustado para acessar corretamente os sockets
          if (client) {
            client.leave(roomName); // Remove o cliente da sala
            client.emit('returnToMenu'); // Envia evento para resetar o front-end
          }
        }
      }
    }
  }, 1000 / FRAME_RATE);
}

function emitGameState(room, gameState) {
  io.sockets.in(room).emit('gameState', JSON.stringify(gameState));
}

function emitGameOver(room, winner) {
  io.sockets.in(room).emit('gameOver', JSON.stringify({ winner }));
}

console.log(`Server running on port ${process.env.PORT || 3000}`);
