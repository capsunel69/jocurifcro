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

const allowedOrigins = [
  'http://localhost:5173',
  'http://192.168.0.54:5173',
  'https://fotbal-comedie.ro',
  'https://joblessai.ro',
  'http://joblessai.ro'  // add HTTP version too
];

const app = express();
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    
    if(allowedOrigins.indexOf(origin) === -1){
      console.log('Origin rejected:', origin); // Add logging
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
    return callback(null, true);
  },
  credentials: true
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

// Add tracking for finished players
const finishedPlayers = new Set();

// Remove the webhook setup and replace with connection tracking
const activeConnections = new Map();
const disconnectedPlayers = new Set();

// Add this function to handle connection status
function updatePlayerConnection(roomId, playerName, isConnected) {
  const key = `${roomId}-${playerName}`;
  
  if (isConnected) {
    console.log(`Player ${playerName} connected in room ${roomId}`);
    activeConnections.set(key, Date.now());
    disconnectedPlayers.delete(key);
  } else {
    console.log(`Player ${playerName} disconnected in room ${roomId}`);
    activeConnections.delete(key);
    disconnectedPlayers.add(key);
    
    // Clean up after a delay
    setTimeout(() => {
      if (disconnectedPlayers.has(key)) {
        console.log(`Cleaning up disconnected player ${playerName}`);
        cleanupPlayer(roomId, playerName);
        disconnectedPlayers.delete(key);
      }
    }, 5000);
  }
}

// Helper function to get a random card
function getRandomCard(room) {
  const availableCards = gameCards.filter(card => !room.usedCards.includes(card.id));
  
  if (availableCards.length === 0) {
    // If all cards have been used, reset the used cards list
    room.usedCards = [];
    return gameCards[Math.floor(Math.random() * gameCards.length)];
  }
  
  return availableCards[Math.floor(Math.random() * availableCards.length)];
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

// Add this helper function near the top of the file
function sanitizeChannelName(channelName) {
  // Replace spaces and special characters with underscores
  return channelName.replace(/[^a-zA-Z0-9-_]/g, '_');
}

app.post('/api/create-room', (req, res) => {
  const { playerName } = req.body;
  
  // Generate a random 6-character room ID
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Create the room
  activeRooms.set(roomId, {
    players: [{ name: playerName, isHost: true }],
    gameState: 'waiting',
    currentGame: null,
    usedCards: []
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
  
  // Check if player name is already taken in this room
  if (room.players.some(p => p.name === playerName)) {
    return res.status(400).json({ error: 'Player name already taken' });
  }

  // Add player limit check
  if (room.players.length >= 5) {
    return res.status(400).json({ error: 'Room is full (maximum 5 players)' });
  }
  
  // Add player to room
  room.players.push({ name: playerName, isHost: false });
  console.log(`Player ${playerName} joined room ${roomId}. Current players:`, room.players.map(p => p.name));
  
  // Track the new connection
  updatePlayerConnection(roomId, playerName, true);
  
  try {
    await pusher.trigger(`room-${roomId}`, 'player-joined', {
      players: room.players,
      playerName,
      timestamp: Date.now()
    });
    
    res.json({ 
      success: true,
      currentPlayers: room.players
    });
  } catch (error) {
    console.error('Error notifying players about new join:', error);
    cleanupPlayer(roomId, playerName);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

app.post('/api/start-game', async (req, res) => {
  const { roomId, playerName, gameMode } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Debug the current state
  console.log(`Starting game in room ${roomId} with ${room.players.length} players`);
  console.log(`Room state: gameState=${room.gameState}, hasCurrentGame=${!!room.currentGame}`);
  
  // Check if there are enough players
  if (room.players.length < 2 || room.players.length > 5) {
    console.log(`Invalid player count: ${room.players.length}`);
    return res.status(400).json({ 
      error: 'Game requires 2-5 players to start' 
    });
  }

  try {
    // Get random game card
    const gameCard = getRandomCard(room);
    
    // Add the card to the used cards list
    room.usedCards.push(gameCard.id);
    
    // Keep only the last 10 used cards
    if (room.usedCards.length > 10) {
      room.usedCards.shift();
    }
    
    // Clear finished players for this room
    for (const key of finishedPlayers.keys()) {
      if (key.startsWith(`${roomId}-`)) {
        finishedPlayers.delete(key);
      }
    }

    // Set game state to playing
    room.gameState = 'playing';

    // Get first random soccer player from the card's players
    const firstPlayer = gameCard.gameData.players[Math.floor(Math.random() * gameCard.gameData.players.length)];
    
    // Initialize fresh game state for all players
    room.currentGame = {
      card: gameCard,
      categories: formatCategories(gameCard.gameData.remit),
      currentPlayer: firstPlayer,
      gameMode,
      maxAvailablePlayers: gameCard.gameData.players.length,
      playerStates: new Map()  // Start with empty player states
    };

    // Initialize fresh state for each player
    room.players.forEach(p => {
      room.currentGame.playerStates.set(p.name, {
        selectedCells: [],
        validSelections: [],
        usedPlayers: [],
        hasWildcard: true,
        score: 0
      });
    });

    console.log(`Game started in room ${roomId} with ${room.players.length} players`);
    console.log('Initial player states:', Object.fromEntries(room.currentGame.playerStates));

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
    // Reset room state on error
    room.gameState = 'waiting';
    room.currentGame = null;
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

function checkCategoryValid(categoryId, playerId, card) {
  try {
    // Get the category from the card
    const category = card.gameData.remit[categoryId];
    if (!category) return false;
    
    // Get the player from the card
    const player = card.gameData.players.find(p => p.id === playerId);
    if (!player) return false;
    
    // Category may be an array of requirements or a single requirement
    const requirements = Array.isArray(category) ? category : [category];
    
    // Check if player satisfies all requirements
    return requirements.every(requirement => 
      // Check if the player's achievements include the requirement's ID
      player.v && player.v.includes(requirement.id)
    );
  } catch (error) {
    console.error('Error checking category validity:', error);
    return false;
  }
}

app.post('/api/cell-select', async (req, res) => {
  const { roomId, playerName, categoryId, currentPlayerId } = req.body;
  
  console.log(`Cell select request from ${playerName} for category ${categoryId} with player ${currentPlayerId}`);
  
  const room = activeRooms.get(roomId);
  
  if (!room || !room.currentGame) {
    console.log(`Room ${roomId} not found or no current game`);
    return res.status(404).json({ error: 'Game not found' });
  }

  try {
    // Get player state
    const playerState = room.currentGame.playerStates.get(playerName) || {
      selectedCells: [],
      validSelections: [],
      usedPlayers: [],
      hasWildcard: true
    };
    
    // Always mark cell as selected regardless of correctness
    if (!playerState.selectedCells.includes(categoryId)) {
      playerState.selectedCells.push(categoryId);
      console.log(`Added category ${categoryId} to selected cells for ${playerName}. Total: ${playerState.selectedCells.length}/16`);
    }
    
    // Add current player to used players
    if (currentPlayerId && !playerState.usedPlayers.includes(currentPlayerId)) {
      playerState.usedPlayers.push(currentPlayerId);
      console.log(`Added player ${currentPlayerId} to used players for ${playerName}. Total: ${playerState.usedPlayers.length}`);
    }
    
    // Check if the selection is actually valid (for scoring purposes)
    const isValid = checkCategoryValid(categoryId, currentPlayerId, room.currentGame.card);
    console.log(`Category ${categoryId} with player ${currentPlayerId} is ${isValid ? 'valid' : 'invalid'}`);
    
    if (isValid && !playerState.validSelections.includes(categoryId)) {
      // Only add to valid selections if it's actually valid
      playerState.validSelections.push(categoryId);
      console.log(`Added category ${categoryId} to valid selections for ${playerName}. Total valid: ${playerState.validSelections.length}`);
    }
    
    // Update player state in room
    room.currentGame.playerStates.set(playerName, playerState);
    
    // Check if all 16 categories have been selected - GAME OVER CONDITION 1
    if (playerState.selectedCells.length >= 16) {
      console.log(`GAME OVER: ${playerName} has selected all 16 categories`);
      
      // Notify about the cell selection first
      await pusher.trigger(`room-${roomId}`, 'cell-selected', {
        playerName,
        categoryId,
        isValid,
        totalValidSelections: playerState.validSelections.length,
        playerState: {
          selectedCells: playerState.selectedCells, 
          validSelections: playerState.validSelections,
          usedPlayers: playerState.usedPlayers,
          lastUsedPlayer: currentPlayerId
        }
      });
      
      // Use sanitized channel name for player-specific events
      const playerChannel = sanitizeChannelName(`room-${roomId}-${playerName}`);
      console.log(`Sending game-over event on channel: ${playerChannel}`);
      
      await pusher.trigger(playerChannel, 'game-over', {
        reason: 'all-categories-selected'
      });
      
      return res.status(200).json({ 
        success: true,
        gameOver: true, 
        reason: 'all-categories-selected'
      });
    }
    
    // Choose next player from those not in usedPlayers - GAME OVER CONDITION 2
    const availablePlayers = room.currentGame.card.gameData.players.filter(
      p => !playerState.usedPlayers.includes(p.id)
    );
    
    // Game over check - no more available players
    if (availablePlayers.length === 0) {
      console.log(`GAME OVER: ${playerName} has used all available players`);
      
      // Notify about the cell selection first
      await pusher.trigger(`room-${roomId}`, 'cell-selected', {
        playerName,
        categoryId,
        isValid,
        totalValidSelections: playerState.validSelections.length,
        playerState: {
          selectedCells: playerState.selectedCells, 
          validSelections: playerState.validSelections,
          usedPlayers: playerState.usedPlayers,
          lastUsedPlayer: currentPlayerId
        }
      });
      
      // Use sanitized channel name for player-specific events
      const playerChannel = sanitizeChannelName(`room-${roomId}-${playerName}`);
      console.log(`Sending game-over event on channel: ${playerChannel}`);
      
      await pusher.trigger(playerChannel, 'game-over', {
        reason: 'no-more-players'
      });
      
      return res.status(200).json({ 
        success: true,
        gameOver: true, 
        reason: 'no-more-players'
      });
    }
    
    // Game continues - select next player
    const nextPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
    console.log(`Game continues for ${playerName}. Next player: ${nextPlayer.id}`);
    
    // Notify all players about the cell selection
    await pusher.trigger(`room-${roomId}`, 'cell-selected', {
      playerName,
      categoryId,
      isValid,
      totalValidSelections: playerState.validSelections.length,
      playerState: {
        selectedCells: playerState.selectedCells,
        validSelections: playerState.validSelections, 
        usedPlayers: playerState.usedPlayers,
        lastUsedPlayer: currentPlayerId,
        currentPlayer: nextPlayer
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling cell selection:', error);
    res.status(500).json({ error: 'Failed to process cell selection' });
  }
});

app.post('/api/use-wildcard', async (req, res) => {
  const { roomId, playerName, currentPlayerId, categories } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room || !room.currentGame) {
    return res.status(404).json({ error: 'Game not found' });
  }

  try {
    // Get player state
    const playerState = room.currentGame.playerStates.get(playerName) || {
      selectedCells: [],
      validSelections: [],
      usedPlayers: [],
      hasWildcard: true
    };
    
    // Check if player still has wildcard
    if (!playerState.hasWildcard) {
      return res.status(400).json({ error: 'Wildcard already used' });
    }
    
    // Find current player in card
    const currentPlayer = room.currentGame.card.gameData.players.find(p => p.id === currentPlayerId);
    
    if (!currentPlayer) {
      return res.status(400).json({ error: 'Current player not found' });
    }
    
    // Find matching categories (may be empty if no matches)
    const matchIndices = [];
    
    for (let i = 0; i < categories.length; i++) {
      // Skip already selected categories
      if (playerState.selectedCells.includes(i)) {
        continue;
      }
      
      const category = categories[i].originalData;
      // Check if current player has achievements that match all requirements
      const isMatch = category.every(requirement => 
        currentPlayer.v && currentPlayer.v.includes(requirement.id)
      );
      
      if (isMatch) {
        matchIndices.push(i);
        
        // Add to selected cells
        if (!playerState.selectedCells.includes(i)) {
          playerState.selectedCells.push(i);
        }
        
        // Add to valid selections
        if (!playerState.validSelections.includes(i)) {
          playerState.validSelections.push(i);
        }
      }
    }
    
    // Mark wildcard as used
    playerState.hasWildcard = false;

    // Add current player to used players list
    if (!playerState.usedPlayers.includes(currentPlayerId)) {
      playerState.usedPlayers.push(currentPlayerId);
    }
    
    // Choose next player from those not in usedPlayers
    const availablePlayers = room.currentGame.card.gameData.players.filter(
      p => !playerState.usedPlayers.includes(p.id)
    );
    
    // Get next random player
    const nextPlayer = availablePlayers.length > 0 
      ? availablePlayers[Math.floor(Math.random() * availablePlayers.length)]
      : null;
    
    // Update player state
    room.currentGame.playerStates.set(playerName, playerState);
    
    // Notify all players about wildcard use and next player
    await pusher.trigger(`room-${roomId}`, 'wildcard-used', {
      playerName,
      wildcardMatches: matchIndices,
      totalValidSelections: playerState.validSelections.length,
      nextPlayer, // Add next player to the event data
      skippedPlayerId: currentPlayerId // Add skipped player ID
    });
    
    // Check if game is over (no more available players)
    if (availablePlayers.length === 0) {
      const playerChannel = sanitizeChannelName(`room-${roomId}-${playerName}`);
      await pusher.trigger(playerChannel, 'game-over', {
        reason: 'no-more-players'
      });
      
      return res.status(200).json({ 
        success: true,
        gameOver: true,
        wildcardMatches: matchIndices
      });
    }
    
    res.json({ 
      success: true, 
      wildcardMatches: matchIndices,
      nextPlayer
    });
  } catch (error) {
    console.error('Error handling wildcard use:', error);
    res.status(500).json({ error: 'Failed to process wildcard' });
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
  const { roomId, playerName } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  try {
    // First verify the player is still in the room
    const playerInRoom = room.players.some(p => p.name === playerName);
    if (!playerInRoom) {
      console.log(`Player ${playerName} not found in room ${roomId}, cleaning up state`);
      // Clean up any lingering state for this player
      const finishedKey = `${roomId}-${playerName}`;
      finishedPlayers.delete(finishedKey);
      if (room.currentGame?.playerStates) {
        room.currentGame.playerStates.delete(playerName);
      }
      return res.status(400).json({ error: 'Player not in room' });
    }

    const finishedKey = `${roomId}-${playerName}`;
    if (finishedPlayers.has(finishedKey)) {
      console.log(`Player ${playerName} already finished, ignoring duplicate request`);
      return res.json({ success: true, alreadyFinished: true });
    }

    finishedPlayers.add(finishedKey);
    const playerState = room.currentGame?.playerStates.get(playerName);
    const finalScore = playerState?.validSelections?.length || 0;
    console.log(`Player ${playerName} finished with ${finalScore} matches`);

    // Check if all remaining players have finished
    const allPlayersFinished = room.players.every(player => {
      const key = `${roomId}-${player.name}`;
      return finishedPlayers.has(key);
    });

    await pusher.trigger(`room-${roomId}`, 'player-finished', {
      playerName,
      finalScore,
      allPlayersFinished
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling player finished:', error);
    res.status(500).json({ error: 'Failed to process player finished' });
  }
});

// Update the getPlayerStatus function
function getPlayerStatus(roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return null;

  const status = {
    totalPlayers: room.players.length,
    finishedPlayers: [],
    unfinishedPlayers: [],
    disconnectedPlayers: []
  };

  room.players.forEach(player => {
    const key = `${roomId}-${player.name}`;
    if (disconnectedPlayers.has(key)) {
      status.disconnectedPlayers.push(player.name);
    } else if (finishedPlayers.has(key)) {
      status.finishedPlayers.push(player.name);
    } else {
      status.unfinishedPlayers.push(player.name);
    }
  });

  return status;
}

// Add these helper functions at the top
function cleanupPlayer(roomId, playerName) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  // Remove from players array
  room.players = room.players.filter(p => p.name !== playerName);
  
  // Clear player state
  if (room.currentGame?.playerStates) {
    room.currentGame.playerStates.delete(playerName);
  }

  // Clear finished state
  const finishedKey = `${roomId}-${playerName}`;
  if (finishedPlayers.has(finishedKey)) {
    console.log(`Clearing finished state for ${playerName}`);
    finishedPlayers.delete(finishedKey);
  }
}

function resetRoom(roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  console.log(`Resetting room ${roomId}`);
  room.gameState = 'waiting';
  room.currentGame = null;

  // Clear all finished states for this room
  for (const key of finishedPlayers.keys()) {
    if (key.startsWith(`${roomId}-`)) {
      finishedPlayers.delete(key);
    }
  }
}

// Update the player-exit endpoint
app.post('/api/player-exit', async (req, res) => {
  const { roomId, playerName } = req.body;
  console.log(`\n=== Player ${playerName} exiting room ${roomId} ===`);

  try {
    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    updatePlayerConnection(roomId, playerName, false);
    
    const isHost = room.players[0]?.name === playerName;
    console.log(`${isHost ? 'Host' : 'Regular'} player ${playerName} is exiting`);

    // Clean up the exiting player
    cleanupPlayer(roomId, playerName);

    if (isHost) {
      console.log('Host is exiting, closing room');
      activeRooms.delete(roomId);
      await pusher.trigger(`room-${roomId}`, 'room-closed', {
        reason: 'Host left',
        timestamp: Date.now()
      });
    } else {
      // If in a game and less than 2 players remain, reset the room
      if (room.gameState === 'playing' && room.players.length < 2) {
        console.log('Resetting game due to insufficient players');
        resetRoom(roomId);
      }

      // Notify remaining players
      await pusher.trigger(`room-${roomId}`, 'player-left', {
        playerName,
        remainingPlayers: room.players,
        gameState: room.gameState,
        timestamp: Date.now()
      });
    }

    console.log('=== Player exit processed successfully ===');
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling player exit:', error);
    res.status(500).json({ error: 'Failed to process player exit' });
  }
});

// Update the reset-game endpoint
app.post('/api/reset-game', async (req, res) => {
  const { roomId } = req.body;
  console.log(`\n=== Attempting to reset game in room ${roomId} ===`);

  try {
    const room = activeRooms.get(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found`);
      return res.status(404).json({ error: 'Room not found' });
    }

    // Clear all game state
    room.gameState = 'waiting';
    room.currentGame = null;

    // Clear all finished states for this room
    for (const key of finishedPlayers.keys()) {
      if (key.startsWith(`${roomId}-`)) {
        finishedPlayers.delete(key);
      }
    }

    // Remove any disconnected players
    room.players = room.players.filter(p => !disconnectedPlayers.has(`${roomId}-${p.name}`));

    console.log('Room state after reset:', {
      gameState: room.gameState,
      playerCount: room.players.length,
      currentGame: room.currentGame
    });

    await pusher.trigger(`room-${roomId}`, 'game-reset', {
      activePlayers: room.players,
      timestamp: Date.now()
    });

    console.log('=== Game reset successful ===');
    res.json({ success: true });
  } catch (error) {
    console.error('Error resetting game:', error);
    res.status(500).json({ error: 'Failed to reset game' });
  }
});

// Add this new endpoint to get player state directly
app.post('/api/get-player-state', async (req, res) => {
  const { roomId, playerName } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room || !room.currentGame) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  try {
    const playerState = room.currentGame.playerStates.get(playerName) || { validSelections: [] };
    console.log(`Sending player state for ${playerName}:`, playerState);
    
    res.json({
      validSelections: playerState.validSelections,
      totalValidSelections: playerState.validSelections.length
    });
  } catch (error) {
    console.error('Error getting player state:', error);
    res.status(500).json({ error: 'Failed to get player state' });
  }
});

// Add new helper function to clean up rooms
function cleanupRoom(roomId) {
  const room = activeRooms.get(roomId);
  if (room) {
    // Clear all finished players for this room
    for (const key of finishedPlayers.keys()) {
      if (key.startsWith(`${roomId}-`)) {
        finishedPlayers.delete(key);
      }
    }
    activeRooms.delete(roomId);
  }
}

// Update the exit-room handler to ensure proper player removal and notifications
app.post('/api/exit-room', async (req, res) => {
  const { roomId, playerName } = req.body;
  console.log(`\n=== Player ${playerName} exiting room ${roomId} ===`);

  try {
    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // First notify the specific player to redirect
    await pusher.trigger(`room-${roomId}-${playerName}`, 'force-redirect', {
      message: 'You have been disconnected from the room',
      timestamp: Date.now()
    });

    // Small delay to ensure the redirect message is received
    await new Promise(resolve => setTimeout(resolve, 100));

    // Then proceed with the normal cleanup...
    updatePlayerConnection(roomId, playerName, false);
    
    const isHost = room.players[0]?.name === playerName;
    console.log(`${isHost ? 'Host' : 'Regular'} player ${playerName} is exiting`);

    // Rest of the existing cleanup code...
    cleanupPlayer(roomId, playerName);

    if (isHost) {
      console.log('Host is exiting, closing room');
      activeRooms.delete(roomId);
      await pusher.trigger(`room-${roomId}`, 'room-closed', {
        reason: 'Host left',
        timestamp: Date.now()
      });
    } else {
      // If in a game and less than 2 players remain, reset the room
      if (room.gameState === 'playing' && room.players.length < 2) {
        console.log('Resetting game due to insufficient players');
        resetRoom(roomId);
      }

      // Notify remaining players
      await pusher.trigger(`room-${roomId}`, 'player-left', {
        playerName,
        remainingPlayers: room.players,
        gameState: room.gameState,
        timestamp: Date.now()
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling player exit:', error);
    res.status(500).json({ error: 'Failed to process player exit' });
  }
});

app.post('/api/skip-player', async (req, res) => {
  const { roomId, playerName, currentPlayerId } = req.body;
  const room = activeRooms.get(roomId);
  
  if (!room || !room.currentGame) {
    return res.status(404).json({ error: 'Game not found' });
  }

  try {
    console.log(`Player ${playerName} is skipping current player: ${currentPlayerId}`);
    
    // Get current player state for this room
    const playerState = room.currentGame.playerStates.get(playerName) || {
      selectedCells: [],
      validSelections: [],
      usedPlayers: [],
      hasWildcard: true
    };

    // Get the current player ID specifically for this user
    const currentPlayerIdToSkip = currentPlayerId || playerState.currentPlayer?.id || room.currentGame.currentPlayer?.id;
    
    if (currentPlayerIdToSkip) {
      // Add the current player to used players list (only for this player)
      if (!playerState.usedPlayers.includes(currentPlayerIdToSkip)) {
        playerState.usedPlayers.push(currentPlayerIdToSkip);
        console.log(`Added player ${currentPlayerIdToSkip} to used players for ${playerName}`);
      }
    }

    // Choose next player who is not in usedPlayers array
    const availablePlayers = room.currentGame.card.gameData.players.filter(
      p => !playerState.usedPlayers.includes(p.id)
    );

    console.log(`Available players after skip: ${availablePlayers.length}`);

    if (availablePlayers.length === 0) {
      // Game over if no more players
      console.log(`Game over triggered by skip for ${playerName} (no more available players)`);
      room.currentGame.playerStates.set(playerName, playerState);
      
      await pusher.trigger(`room-${roomId}-${playerName}`, 'game-over', {
        reason: 'no-more-players'
      });
      return res.status(200).json({ gameOver: true });
    }

    // Select random next player
    const nextPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
    console.log(`Selected next player for ${playerName}: ${nextPlayer.id}`);
    
    // Update player state
    room.currentGame.playerStates.set(playerName, playerState);

    // Notify about the skip
    await pusher.trigger(`room-${roomId}`, 'player-skipped', {
      playerName, // Only this player should react to this event
      skippedPlayerId: currentPlayerIdToSkip,
      playerState: {
        selectedCells: playerState.selectedCells,
        validSelections: playerState.validSelections,
        usedPlayers: playerState.usedPlayers,
        currentPlayer: nextPlayer,
        lastUsedPlayer: currentPlayerIdToSkip
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error skipping player:', error);
    res.status(500).json({ error: 'Failed to skip player' });
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
}); 