import express from 'express';
import Pusher from 'pusher';
import cors from 'cors';

const pusher = new Pusher({
  appId: '1940326',
  key: '9646a9522cd23ea11527',
  secret: '2187c9ca929c25b0f11b',
  cluster: 'eu',
  useTLS: true
});

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://192.168.0.54:5173'], // Allow both localhost and IP access
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Store active rooms and their game states
const activeRooms = new Map();

// Generate a random math problem
function generateMathProblem() {
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 20) + 1;
  const operators = ['+', '-', '*'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let answer;
  switch(operator) {
    case '+': answer = num1 + num2; break;
    case '-': answer = num1 - num2; break;
    case '*': answer = num1 * num2; break;
  }
  
  return {
    question: `${num1} ${operator} ${num2}`,
    answer
  };
}

app.post('/api/create-room', async (req, res) => {
  const { roomId, playerName } = req.body;
  
  if (activeRooms.has(roomId)) {
    return res.status(400).json({ error: 'Room already exists' });
  }

  const roomData = {
    players: [{
      name: playerName,
      score: 0,
      isHost: true
    }],
    gameState: 'waiting',
    currentProblem: null
  };
  
  activeRooms.set(roomId, roomData);

  try {
    await pusher.trigger(`room-${roomId}`, 'player-joined', {
      player: playerName,
      players: roomData.players
    });

    res.json({ 
      success: true,
      players: roomData.players
    });
  } catch (error) {
    console.error('Pusher error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.post('/api/join-room', async (req, res) => {
  const { roomId, playerName } = req.body;
  
  if (!activeRooms.has(roomId)) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const room = activeRooms.get(roomId);
  if (room.players.some(p => p.name === playerName)) {
    return res.status(400).json({ error: 'Player name already taken' });
  }

  room.players.push({
    name: playerName,
    score: 0
  });
  activeRooms.set(roomId, room);

  try {
    await pusher.trigger(`room-${roomId}`, 'player-joined', {
      player: playerName,
      players: room.players
    });

    res.json({ 
      success: true,
      players: room.players,
      currentProblem: room.currentProblem
    });
  } catch (error) {
    console.error('Pusher error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

app.post('/api/start-game', async (req, res) => {
  const { roomId, playerName } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Check if the player is the host
  const player = room.players.find(p => p.name === playerName);
  if (!player || !player.isHost) {
    return res.status(403).json({ error: 'Only host can start the game' });
  }

  // Start countdown sequence
  let countdown = 3;
  room.gameState = 'countdown';
  
  try {
    // Initial countdown notification
    await pusher.trigger(`room-${roomId}`, 'game-countdown', {
      count: countdown
    });

    // Set up countdown interval
    const countdownInterval = setInterval(async () => {
      countdown--;
      
      if (countdown > 0) {
        await pusher.trigger(`room-${roomId}`, 'game-countdown', {
          count: countdown
        });
      } else {
        clearInterval(countdownInterval);
        
        // Generate game data
        const gameData = generateBingoCard();
        room.gameState = 'playing';
        room.currentGame = gameData;
        room.currentGame.currentPlayer = room.players[0]; // Set first player
        
        // Start the game
        await pusher.trigger(`room-${roomId}`, 'game-started', {
          gameData,
          currentPlayer: room.currentGame.currentPlayer
        });
      }
    }, 1000);

    res.json({ success: true });
  } catch (error) {
    console.error('Pusher error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Helper function to generate bingo card data
function generateBingoCard() {
  const categories = [
    "Category 1", "Category 2", "Category 3", "Category 4",
    "Category 5", "Category 6", "Category 7", "Category 8",
    "Category 9", "Category 10", "Category 11", "Category 12",
    "Category 13", "Category 14", "Category 15", "Category 16"
  ];

  return {
    categories,
    currentPlayer: null,
    selectedCells: [],
    validSelections: []
  };
}

app.post('/api/submit-answer', async (req, res) => {
  const { roomId, playerName, answer } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room || !room.currentProblem) {
    return res.status(400).json({ error: 'No active game' });
  }

  const isCorrect = Number(answer) === room.currentProblem.answer;
  
  if (isCorrect) {
    // Update player score
    const player = room.players.find(p => p.name === playerName);
    if (player) {
      player.score += 1;
    }

    // Generate new problem
    const newProblem = generateMathProblem();
    room.currentProblem = newProblem;

    try {
      await pusher.trigger(`room-${roomId}`, 'answer-result', {
        playerName,
        correct: true,
        players: room.players,
        newProblem: newProblem.question
      });
    } catch (error) {
      console.error('Pusher error:', error);
    }
  }

  res.json({ 
    success: true,
    correct: isCorrect
  });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
}); 