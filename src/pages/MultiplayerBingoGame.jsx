import { useState, useEffect } from 'react'
import { 
  Box, 
  Container, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Heading,
  useToast,
  Badge,
  Divider,
  Input,
  Center
} from '@chakra-ui/react'
import { MdRefresh, MdShuffle } from 'react-icons/md'
import MpBingoBoard from '../components/bingoMultiplayer/mpBingoBoard'
import MpGameControls from '../components/bingoMultiplayer/mpGameControls'
import MpTimer from '../components/bingoMultiplayer/mpTimer'
import MpGameModeSelect from '../components/bingoMultiplayer/mpGameModeSelect'
import pusher from '../services/pusher'

const API_BASE_URL = 'http://192.168.0.54:3001'

function MultiplayerBingoGame() {
  const [gameMode, setGameMode] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(10)
  const [gameState, setGameState] = useState('init') // init, waiting, playing, end
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [selectedCells, setSelectedCells] = useState([])
  const [validSelections, setValidSelections] = useState([])
  const [currentInvalidSelection, setCurrentInvalidSelection] = useState(null)
  const [usedPlayers, setUsedPlayers] = useState([])
  const [hasWildcard, setHasWildcard] = useState(true)
  const [skipPenalty, setSkipPenalty] = useState(false)
  const [wildcardMatches, setWildcardMatches] = useState([])
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [showSkipAnimation, setShowSkipAnimation] = useState(false)
  
  // Multiplayer specific states
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [players, setPlayers] = useState([])
  const [isHost, setIsHost] = useState(false)
  const [categories, setCategories] = useState([])
  const [countdown, setCountdown] = useState(null)
  const [gameData, setGameData] = useState(null)

  const toast = useToast()
  const correctSound = new Audio('/sounds/correct.mp3')
  const wrongSound = new Audio('/sounds/wrong.mp3')

  useEffect(() => {
    if (roomId) {
      const channel = pusher.subscribe(`room-${roomId}`)
      
      channel.bind('player-joined', (data) => {
        setPlayers(data.players)
        toast({
          title: "Player joined",
          description: `${data.player} has joined the game!`,
          status: "info",
        })
      })

      channel.bind('game-started', (data) => {
        setCountdown(null);
        setGameData(data.gameData);
        setCurrentPlayer(data.currentPlayer);
        setGameState('playing');
        toast({
          title: "Game Started!",
          status: "success",
        });
        console.log('Game data received:', data.gameData); // Debug log
      })

      channel.bind('cell-selected', (data) => {
        setSelectedCells(data.selectedCells)
        setValidSelections(data.validSelections)
        setCurrentPlayer(data.nextPlayer)
        if (data.isValid) {
          correctSound.play()
        } else {
          wrongSound.play()
        }
      })

      channel.bind('game-countdown', (data) => {
        setCountdown(data.count)
      })

      return () => {
        channel.unbind_all()
        channel.unsubscribe()
      }
    }
  }, [roomId])

  const createRoom = async () => {
    if (!playerName) {
      toast({
        title: "Error",
        description: "Please enter your name",
        status: "error",
      })
      return
    }

    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: newRoomId,
          playerName
        })
      })

      if (!response.ok) throw new Error('Failed to create room')
      
      const data = await response.json()
      setRoomId(newRoomId)
      setPlayers(data.players)
      setGameState('waiting')
      setIsHost(true)
      
      toast({
        title: "Room created!",
        description: `Share this code with friends: ${newRoomId}`,
        status: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create room",
        status: "error",
      })
    }
  }

  const joinRoom = async () => {
    if (!playerName || !roomId) {
      toast({
        title: "Error",
        description: "Please enter your name and room code",
        status: "error",
      })
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName
        })
      })

      if (!response.ok) throw new Error('Failed to join room')
      
      const data = await response.json()
      setPlayers(data.players)
      setGameState('waiting')
      
      toast({
        title: "Success!",
        description: "You've joined the room",
        status: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join room. Please check the room code.",
        status: "error",
      })
    }
  }

  const handleCellSelect = async (categoryId) => {
    if (currentPlayer?.name !== playerName) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/cell-select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName,
          categoryId
        })
      })

      if (!response.ok) throw new Error('Failed to select cell')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to select cell",
        status: "error",
      })
    }
  }

  const handleWildcardUse = async () => {
    if (!hasWildcard || currentPlayer?.name !== playerName) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/use-wildcard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName
        })
      })

      if (!response.ok) throw new Error('Failed to use wildcard')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to use wildcard",
        status: "error",
      })
    }
  }

  const handleSkip = async () => {
    if (currentPlayer?.name !== playerName) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/skip-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName
        })
      })

      if (!response.ok) throw new Error('Failed to skip turn')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to skip turn",
        status: "error",
      })
    }
  }

  const handleTimeUp = async () => {
    if (currentPlayer?.name !== playerName) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/time-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName
        })
      })

      if (!response.ok) throw new Error('Failed to handle time up')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to handle time up",
        status: "error",
      })
    }
  }

  const handleStartGame = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/start-game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          playerName
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start game');
      }

      toast({
        title: "Starting game...",
        status: "info",
      });

    } catch (error) {
      console.error('Failed to start game:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start game",
        status: "error",
      });
    }
  };

  // Render functions based on gameState
  return (
    <Box minH="100vh" p={6}>
      {gameState === 'init' && (
        <Container maxW="container.xl">
          <VStack spacing={8}>
            <Heading>Multiplayer Bingo</Heading>
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
          </VStack>
        </Container>
      )}

      {gameState === 'waiting' && (
        <Container maxW="container.xl">
          <VStack spacing={6} align="center">
            <Heading size="lg" color="white">Waiting Room</Heading>
            
            <Box 
              p={4} 
              bg="whiteAlpha.200" 
              borderRadius="md" 
              textAlign="center"
            >
              <Text fontSize="xl" color="white" mb={2}>
                Room Code: <Text as="span" color="yellow.400" fontWeight="bold">{roomId}</Text>
              </Text>
              <Text fontSize="sm" color="whiteAlpha.700">
                Share this code with your friends to join
              </Text>
            </Box>

            <Box w="full" maxW="400px">
              <Text fontSize="lg" color="white" mb={4}>
                Players:
              </Text>
              <VStack spacing={2} align="stretch">
                {players.map((player, index) => (
                  <HStack
                    key={index}
                    bg="whiteAlpha.100"
                    p={3}
                    borderRadius="md"
                    justify="space-between"
                  >
                    <Text color="white">{player.name}</Text>
                    {player.isHost && (
                      <Badge colorScheme="yellow">Host</Badge>
                    )}
                  </HStack>
                ))}
              </VStack>
            </Box>

            {isHost && players.length >= 2 && (
              <Button
                colorScheme="yellow"
                size="lg"
                onClick={handleStartGame}
                mt={4}
              >
                Start Game
              </Button>
            )}
          </VStack>
        </Container>
      )}

      {gameState === 'countdown' && (
        <Center h="100vh">
          <Text
            fontSize="8xl"
            fontWeight="bold"
            color="yellow.400"
            animation="pulse 1s infinite"
          >
            {countdown}
          </Text>
        </Center>
      )}

      {gameState === 'playing' && (
        <Container maxW="container.xl">
          <VStack spacing={6}>
            <HStack spacing={4} wrap="wrap" justify="center">
              {players.map((player) => (
                <Badge
                  key={player.name}
                  p={2}
                  borderRadius="md"
                  colorScheme={currentPlayer?.name === player.name ? "green" : "gray"}
                >
                  {player.name}: {player.score || 0}
                </Badge>
              ))}
            </HStack>

            {gameData && (
              <Box w="full" maxW="800px" mx="auto">
                <MpBingoBoard
                  categories={gameData.categories}
                  selectedCells={selectedCells}
                  onCellSelect={handleCellSelect}
                  validSelections={validSelections}
                  currentInvalidSelection={currentInvalidSelection}
                  wildcardMatches={wildcardMatches}
                  showSkip={showSkipAnimation}
                />
              </Box>
            )}

            {currentPlayer?.name === playerName && (
              <Box w="full" maxW="500px" mx="auto">
                <MpGameControls
                  hasWildcard={hasWildcard}
                  onWildcardUse={handleWildcardUse}
                  onSkip={handleSkip}
                  isSkipPenalty={skipPenalty}
                />
              </Box>
            )}

            {gameMode === 'timed' && currentPlayer?.name === playerName && (
              <MpTimer seconds={timeRemaining} onTimeUp={handleTimeUp} />
            )}
          </VStack>
        </Container>
      )}
    </Box>
  )
}

export default MultiplayerBingoGame 