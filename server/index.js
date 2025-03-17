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

// Store active rooms (in memory for now)
const activeRooms = new Map();

app.post('/api/create-room', async (req, res) => {
  const { roomId, playerName } = req.body;
  
  if (activeRooms.has(roomId)) {
    return res.status(400).json({ error: 'Room already exists' });
  }

  const roomData = {
    players: [playerName],
    gameState: 'waiting'
  };
  
  activeRooms.set(roomId, roomData);

  try {
    await pusher.trigger(`room-${roomId}`, 'player-joined', {
      player: playerName,
      players: roomData.players // Send full player list
    });

    res.json({ 
      success: true,
      players: roomData.players // Send back current players
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
  if (room.players.includes(playerName)) {
    return res.status(400).json({ error: 'Player name already taken' });
  }

  room.players.push(playerName);
  activeRooms.set(roomId, room);

  try {
    await pusher.trigger(`room-${roomId}`, 'player-joined', {
      player: playerName,
      players: room.players // Send full player list
    });

    res.json({ 
      success: true,
      players: room.players // Send back current players
    });
  } catch (error) {
    console.error('Pusher error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Handle cell selection
app.post('/api/game/select-cell', (req, res) => {
  const { playerId, cellId, gameId } = req.body;
  
  pusher.trigger('bingo-game', 'cell-selected', {
    playerId,
    cellId,
    gameId
  });
  
  res.json({ success: true });
});

// Add other game event endpoints...

app.listen(3001, () => {
  console.log('Server running on port 3001');
}); 