import { useState, useEffect } from 'react';
import { 
  Box, Container, VStack, Button, Input, 
  Heading, Text, useToast, HStack, 
  List, ListItem, FormControl
} from '@chakra-ui/react';
import pusher from '../services/pusher';

const API_BASE_URL = 'http://192.168.0.54:3001';

function MultiplayerBingoGame() {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState('init'); // init, waiting, playing
  const [players, setPlayers] = useState([]);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [answer, setAnswer] = useState('');
  const [isHost, setIsHost] = useState(false); // Add this to track if player is host
  const toast = useToast();

  useEffect(() => {
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

      channel.bind('game-started', (data) => {
        setCurrentProblem(data.problem);
        setGameState('playing');
        toast({
          title: "Game Started!",
          status: "success",
        });
      });

      channel.bind('answer-result', (data) => {
        setPlayers(data.players);
        setCurrentProblem(data.newProblem);
        toast({
          title: `${data.playerName} got it right!`,
          status: "success",
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
      setIsHost(true); // Set as host when creating room
      
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

  const startGame = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId,
          playerName  // Add this to verify host
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start game');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
      });
    }
  };

  const submitAnswer = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName,
          answer: Number(answer)
        })
      });

      if (!response.ok) throw new Error('Failed to submit answer');
      
      const data = await response.json();
      if (!data.correct) {
        toast({
          title: "Wrong answer",
          status: "error",
        });
      }
      setAnswer('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit answer",
        status: "error",
      });
    }
  };

  return (
    <Box py={8}>
      <Container maxW="container.md">
        <VStack spacing={8}>
          <Heading>Multiplayer Math Game</Heading>

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
                <Text mb={2}>Players:</Text>
                <List spacing={2}>
                  {players.map((player, index) => (
                    <ListItem key={index}>
                      {player.name} - Score: {player.score}
                      {isHost && player.name === playerName && " (Host)"}
                    </ListItem>
                  ))}
                </List>
              </Box>

              {isHost && players.length >= 2 && ( // Only show start button to host
                <Button
                  colorScheme="green"
                  w="full"
                  maxW="200px"
                  onClick={startGame}
                >
                  Start Game
                </Button>
              )}
            </VStack>
          )}

          {gameState === 'playing' && (
            <VStack spacing={4} w="full">
              <Text fontSize="xl">Room Code: {roomId}</Text>
              
              <Box w="full" p={4} bg="gray.700" borderRadius="md">
                <Text mb={2}>Players:</Text>
                <List spacing={2}>
                  {players.map((player, index) => (
                    <ListItem key={index}>
                      {player.name} - Score: {player.score}
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box w="full" p={4} bg="blue.700" borderRadius="md">
                <Text fontSize="2xl" textAlign="center" mb={4}>
                  {currentProblem}
                </Text>
                <HStack>
                  <Input
                    placeholder="Your answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    type="number"
                  />
                  <Button onClick={submitAnswer} colorScheme="green">
                    Submit
                  </Button>
                </HStack>
              </Box>
            </VStack>
          )}
        </VStack>
      </Container>
    </Box>
  );
}

export default MultiplayerBingoGame; 