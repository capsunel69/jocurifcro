import express from 'express';
import Pusher from 'pusher';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Add this function to load game cards
const gameCards = [];
try {
  // Load all JSON files from the data directory
  const dataDir = join(__dirname, '../src/data');
  
  readdirSync(dataDir).forEach(file => {
    if (file.endsWith('.json')) {
      const cardData = JSON.parse(readFileSync(join(dataDir, file)));
      gameCards.push({
        ...cardData,
        id: file.replace('.json', '')
      });
    }
  });
  console.log(`Loaded ${gameCards.length} game cards`); // Debug log
} catch (error) {
  console.error('Error loading game cards:', error);
}

// Modify the room data structure
const activeRooms = new Map();

// Helper function to get a random card
function getRandomCard() {
  return gameCards[Math.floor(Math.random() * gameCards.length)];
}

// Helper function to format categories
function formatCategories(remitData) {
  if (!remitData || !Array.isArray(remitData)) {
    console.error('Invalid remit data:', remitData);
    return [];
  }

  return remitData.map(categoryGroup => ({
    title: categoryGroup.map(item => item.displayName).join(' + '),
    description: categoryGroup.map(item => item.name).join(' + '),
    originalData: categoryGroup
  }));
}

app.post('/api/create-room', (req, res) => {
  const { playerName } = req.body;
  
  // Generate a random 6-character room ID
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Create the room
  activeRooms.set(roomId, {
    players: [{ name: playerName, isHost: true }],
    gameState: 'waiting',
    currentGame: null
  });
  
  res.json({ roomId });
});

app.post('/api/join-room', async (req, res) => {
  const { roomId, playerName } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.gameState !== 'waiting') {
    return res.status(400).json({ error: 'Game already in progress' });
  }
  
  // Add player to room
  room.players.push({ name: playerName, isHost: false });
  
  // Notify other players
  await pusher.trigger(`room-${roomId}`, 'player-joined', {
    players: room.players,
    player: playerName
  });
  
  res.json({ success: true });
});

app.post('/api/start-game', async (req, res) => {
  const { roomId, playerName, gameMode } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Check if the player is the host
  const player = room.players.find(p => p.name === playerName);
  if (!player || !player.isHost) {
    return res.status(403).json({ error: 'Only host can start the game' });
  }

  try {
    // Get a random card
    const gameCard = getRandomCard();
    if (!gameCard) {
      return res.status(500).json({ error: 'No game cards available' });
    }

    // Initialize game state
    room.gameState = 'playing';
    room.currentGame = {
      card: gameCard,
      gameMode: gameMode,
      categories: formatCategories(gameCard.gameData.remit),
      playerStates: room.players.map(p => ({
        name: p.name,
        score: 0,
        selectedCells: [],
        validSelections: [],
        hasWildcard: true,
        usedPlayers: [],
        maxAvailablePlayers: gameCard.gameData.players.length,
        currentPlayer: gameCard.gameData.players[0]
      }))
    };

    // Notify all players
    await pusher.trigger(`room-${roomId}`, 'game-started', {
      gameData: {
        categories: room.currentGame.categories,
        players: gameCard.gameData.players,
        currentCard: gameCard.id,
        gameMode: gameMode,
        currentPlayer: gameCard.gameData.players[0]
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

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

app.post('/api/cell-select', async (req, res) => {
  const { roomId, playerName, categoryId } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room || !room.currentGame) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const playerState = room.currentGame.playerStates.find(p => p.name === playerName);
  if (!playerState) {
    return res.status(404).json({ error: 'Player not found' });
  }

  try {
    const category = room.currentGame.categories[categoryId].originalData;
    const isValidSelection = playerState.currentPlayer.v.some(achievementId => 
      category.some(requirement => requirement.id === achievementId)
    );

    if (isValidSelection) {
      playerState.selectedCells.push(categoryId);
      playerState.validSelections.push(categoryId);
      playerState.score += 1;

      // Get next player
      const currentPlayerIndex = room.currentGame.card.gameData.players.findIndex(p => p.id === playerState.currentPlayer.id);
      const nextPlayerIndex = (currentPlayerIndex + 1) % room.currentGame.card.gameData.players.length;
      playerState.currentPlayer = room.currentGame.card.gameData.players[nextPlayerIndex];
    } else {
      playerState.maxAvailablePlayers = Math.max(playerState.maxAvailablePlayers - 2, playerState.usedPlayers.length + 1);
    }

    await pusher.trigger(`room-${roomId}`, 'cell-selected', {
      playerName,
      categoryId,
      isValid: isValidSelection,
      playerState
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process selection' });
  }
});

app.post('/api/use-wildcard', async (req, res) => {
  const { roomId, playerName } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  try {
    // Add wildcard logic here
    const wildcardMatches = []; // Add your wildcard matching logic
    
    await pusher.trigger(`room-${roomId}`, 'wildcard-used', {
      wildcardMatches,
      playerName
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to use wildcard' });
  }
});

app.post('/api/skip-turn', async (req, res) => {
  const { roomId, playerName } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  try {
    const nextPlayer = getNextPlayer(room.players, playerName);
    
    await pusher.trigger(`room-${roomId}`, 'turn-skipped', {
      nextPlayer,
      playerName
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to skip turn' });
  }
});

// Helper function to get next player
function getNextPlayer(players, currentPlayerName) {
  const currentIndex = players.findIndex(p => p.name === currentPlayerName);
  const nextIndex = (currentIndex + 1) % players.length;
  return players[nextIndex];
}

app.listen(3001, () => {
  console.log('Server running on port 3001');
}); 