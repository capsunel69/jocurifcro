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
  const { roomId, playerName, categoryId } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room || !room.currentGame) {
    return res.status(404).json({ error: 'Game not found' });
  }

  try {
    const playerState = room.currentGame.playerStates.get(playerName);
    const category = room.currentGame.categories[categoryId].originalData;
    
    // Check if current soccer player matches the category
    const isValidSelection = room.currentGame.currentPlayer.v.some(achievementId => 
      category.some(requirement => requirement.id === achievementId)
    );

    if (isValidSelection) {
      playerState.validSelections.push(categoryId);
      playerState.selectedCells.push(categoryId);
      playerState.usedPlayers.push(room.currentGame.currentPlayer.id);
      playerState.score += 1;

      // Get next random soccer player for this player
      const remainingPlayers = room.currentGame.card.gameData.players.filter(
        p => !playerState.usedPlayers.includes(p.id)
      );
      
      const nextPlayer = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];

      // Notify all players about this player's success
      await pusher.trigger(`room-${roomId}`, 'cell-selected', {
        playerName,
        categoryId,
        isValid: true,
        playerState: {
          selectedCells: playerState.selectedCells,
          validSelections: playerState.validSelections,
          currentPlayer: nextPlayer,
          maxAvailablePlayers: room.currentGame.maxAvailablePlayers,
          usedPlayers: playerState.usedPlayers,
          score: playerState.score
        }
      });
    } else {
      // Handle invalid selection - reduce available players for this player
      playerState.maxAvailablePlayers = Math.max(
        room.currentGame.maxAvailablePlayers - 2,
        playerState.usedPlayers.length + 1
      );

      await pusher.trigger(`room-${roomId}`, 'cell-selected', {
        playerName,
        categoryId,
        isValid: false,
        playerState: {
          currentPlayer: room.currentGame.currentPlayer,
          maxAvailablePlayers: playerState.maxAvailablePlayers,
          score: playerState.score
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