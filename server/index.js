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

  try {
    // Get random game card
    const gameCard = getRandomCard();
    
    // Get first random soccer player from the card's players
    const firstPlayer = gameCard.gameData.players[Math.floor(Math.random() * gameCard.gameData.players.length)];
    
    // Initialize game state (shared between all players)
    room.currentGame = {
      card: gameCard,
      categories: formatCategories(gameCard.gameData.remit),
      currentPlayer: firstPlayer,
      gameMode,
      maxAvailablePlayers: gameCard.gameData.players.length,
      // Track state per user
      playerStates: new Map(room.players.map(p => [p.name, {
        selectedCells: [],
        validSelections: [],
        usedPlayers: [],
        hasWildcard: true,
        score: 0
      }]))
    };

    // Notify all players with complete game data
    await pusher.trigger(`room-${roomId}`, 'game-started', {
      gameData: {
        categories: room.currentGame.categories,
        players: gameCard.gameData.players,
        currentCard: gameCard.id,
        gameMode: gameMode,
        currentPlayer: firstPlayer,
        maxPlayers: gameCard.gameData.players.length
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
  const { roomId, playerName, categoryId, currentPlayerId, usedPlayers, maxAvailablePlayers } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room || !room.currentGame) {
    return res.status(404).json({ error: 'Game not found' });
  }

  try {
    const playerState = room.currentGame.playerStates.get(playerName) || {
      selectedCells: [],
      validSelections: [],
      usedPlayers: [],
      maxAvailablePlayers: room.currentGame.card.gameData.players.length
    };

    const category = room.currentGame.categories[categoryId].originalData;
    const currentPlayer = room.currentGame.card.gameData.players.find(p => p.id === currentPlayerId);
    
    const isValidSelection = currentPlayer.v.some(achievementId => 
      category.some(requirement => requirement.id === achievementId)
    );

    // Get remaining players (excluding current and used players)
    const remainingPlayers = room.currentGame.card.gameData.players.filter(
      p => !usedPlayers.includes(p.id) && p.id !== currentPlayerId
    );
    
    if (remainingPlayers.length === 0) {
      return res.status(400).json({ error: 'No more players available' });
    }

    // Get next random player
    const nextPlayer = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];

    if (isValidSelection) {
      await pusher.trigger(`room-${roomId}`, 'cell-selected', {
        playerName,
        categoryId,
        isValid: true,
        playerState: {
          selectedCells: [...playerState.selectedCells, categoryId],
          validSelections: [...playerState.validSelections, categoryId],
          currentPlayer: nextPlayer,
          lastUsedPlayer: currentPlayerId,
          maxAvailablePlayers: maxAvailablePlayers
        }
      });
    } else {
      // For wrong answers, add current player to used and move to next
      await pusher.trigger(`room-${roomId}`, 'cell-selected', {
        playerName,
        categoryId,
        isValid: false,
        playerState: {
          currentPlayer: nextPlayer,
          lastUsedPlayer: currentPlayerId,
          maxAvailablePlayers: Math.max(maxAvailablePlayers - 2, usedPlayers.length + 1)
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing selection:', error);
    res.status(500).json({ error: 'Failed to process selection' });
  }
});

app.post('/api/use-wildcard', async (req, res) => {
  const { roomId, playerName, currentPlayerId, categories } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room || !room.currentGame) {
    return res.status(404).json({ error: 'Game not found' });
  }

  try {
    const playerState = room.currentGame.playerStates.get(playerName);
    const currentPlayer = room.currentGame.card.gameData.players.find(p => p.id === currentPlayerId);
    
    // Find all categories that match the current player
    const wildcardMatches = categories
      .map((cat, index) => ({ cat, index }))
      .filter(({ cat }) => 
        currentPlayer.v.some(achievementId => 
          cat.originalData.some(requirement => requirement.id === achievementId)
        )
      )
      .map(({ index }) => index);

    await pusher.trigger(`room-${roomId}`, 'wildcard-used', {
      playerName,
      wildcardMatches
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to use wildcard' });
  }
});

app.post('/api/skip-turn', async (req, res) => {
  const { roomId, playerName, currentPlayerId, usedPlayers } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room || !room.currentGame) {
    return res.status(404).json({ error: 'Game not found' });
  }

  try {
    // Get remaining players (excluding current and used players)
    const remainingPlayers = room.currentGame.card.gameData.players.filter(
      p => !usedPlayers.includes(p.id) && p.id !== currentPlayerId
    );
    
    if (remainingPlayers.length === 0) {
      return res.status(400).json({ error: 'No more players available' });
    }

    // Get next random player
    const nextPlayer = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];

    await pusher.trigger(`room-${roomId}`, 'turn-skipped', {
      playerName,
      nextPlayer,
      skippedPlayerId: currentPlayerId // Send the skipped player ID
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error skipping turn:', error);
    res.status(500).json({ error: 'Failed to skip turn' });
  }
});

// Helper function to get next player
function getNextPlayer(players, currentPlayerName) {
  const currentIndex = players.findIndex(p => p.name === currentPlayerName);
  const nextIndex = (currentIndex + 1) % players.length;
  return players[nextIndex];
}

app.post('/api/player-finished', async (req, res) => {
  const { roomId, playerName, score } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  try {
    await pusher.trigger(`room-${roomId}`, 'player-finished', {
      playerName,
      score
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling player finished:', error);
    res.status(500).json({ error: 'Failed to process player finished' });
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
}); 