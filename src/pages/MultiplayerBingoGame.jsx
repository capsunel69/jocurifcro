import { useState, useEffect } from 'react';
import { 
  Box, Container, VStack, Button, Input, 
  Heading, Text, useToast, HStack, 
  List, ListItem
} from '@chakra-ui/react';
import pusher from '../services/pusher';
import BingoBoard from '../components/BingoBoard';

const API_BASE_URL = 'http://192.168.0.54:3001';

function MultiplayerBingoGame() {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState('init'); // init, waiting, playing
  const [players, setPlayers] = useState([]);
  const [gameId, setGameId] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const toast = useToast();

  useEffect(() => {
    // Subscribe to room events when a room is joined
    if (roomId) {
      const channel = pusher.subscribe(`room-${roomId}`);
      
      channel.bind('player-joined', (data) => {
        setPlayers(data.players);
        toast({
          title: "Player joined",
          description: `${data.player} has joined the game!`,
          status: "info",
        });
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
    }
  }, [roomId]);

  const createRoom = async () => {
    if (!playerName) {
      toast({
        title: "Error",
        description: "Please enter your name",
        status: "error",
      });
      return;
    }

    // Generate a random room ID
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: newRoomId,
          playerName
        })
      });

      if (!response.ok) throw new Error('Failed to create room');
      
      const data = await response.json();
      setRoomId(newRoomId);
      setPlayers(data.players);
      setGameState('waiting');
      
      toast({
        title: "Room created!",
        description: `Share this code with friends: ${newRoomId}`,
        status: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        status: "error",
      });
    }
  };

  const joinRoom = async () => {
    if (!playerName || !roomId) {
      toast({
        title: "Error",
        description: "Please enter your name and room code",
        status: "error",
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName
        })
      });

      if (!response.ok) throw new Error('Failed to join room');
      
      const data = await response.json();
      setPlayers(data.players);
      setGameState('waiting');
      
      toast({
        title: "Success!",
        description: "You've joined the room",
        status: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join room. Please check the room code.",
        status: "error",
      });
    }
  };

  return (
    <Box py={8}>
      <Container maxW="container.md">
        <VStack spacing={8}>
          <Heading>Multiplayer Bingo</Heading>

          {gameState === 'init' && (
            <VStack spacing={4} w="full" maxW="400px">
              <Input
                placeholder="Your Name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              
              <VStack w="full" spacing={4}>
                <Button
                  colorScheme="blue"
                  w="full"
                  onClick={createRoom}
                >
                  Create New Room
                </Button>
                
                <Text>- or -</Text>
                
                <Input
                  placeholder="Enter Room Code"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                />
                
                <Button
                  colorScheme="green"
                  w="full"
                  onClick={joinRoom}
                >
                  Join Room
                </Button>
              </VStack>
            </VStack>
          )}

          {gameState === 'waiting' && (
            <VStack spacing={4} w="full">
              <Text fontSize="xl">Room Code: {roomId}</Text>
              
              <Box w="full" p={4} bg="gray.700" borderRadius="md">
                <Text mb={2}>Players in room:</Text>
                <List spacing={2}>
                  {players.map((player, index) => (
                    <ListItem key={index}>{player}</ListItem>
                  ))}
                </List>
              </Box>

              {players.length >= 2 && (
                <Button
                  colorScheme="green"
                  w="full"
                  maxW="200px"
                >
                  Start Game
                </Button>
              )}
            </VStack>
          )}
        </VStack>
      </Container>
    </Box>
  );
}

export default MultiplayerBingoGame; 