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
  const [gameState, setGameState] = useState('init')
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [selectedCells, setSelectedCells] = useState([])
  const [validSelections, setValidSelections] = useState([])
  const [currentInvalidSelection, setCurrentInvalidSelection] = useState(null)
  const [hasWildcard, setHasWildcard] = useState(true)
  const [skipPenalty, setSkipPenalty] = useState(false)
  const [wildcardMatches, setWildcardMatches] = useState([])
  const [showSkipAnimation, setShowSkipAnimation] = useState(false)
  
  // Multiplayer specific states
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [players, setPlayers] = useState([])
  const [isHost, setIsHost] = useState(false)
  const [gameData, setGameData] = useState(null)
  const [maxAvailablePlayers, setMaxAvailablePlayers] = useState(16)
  const [usedPlayers, setUsedPlayers] = useState([])

  const toast = useToast()
  const correctSound = new Audio('/sounds/correct.mp3')
  const wrongSound = new Audio('/sounds/wrong.mp3')
  const wildcardSound = new Audio('/sounds/wildcard.mp3')

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
        setGameData(data.gameData)
        setCurrentPlayer(data.currentPlayer)
        setGameState('playing')
        setMaxAvailablePlayers(data.gameData.players.length)
        toast({
          title: "Game Started!",
          status: "success",
        })
      })

      channel.bind('cell-selected', (data) => {
        if (data.isValid) {
          correctSound.play()
          setValidSelections(prev => [...prev, data.categoryId])
        } else {
          wrongSound.play()
          setCurrentInvalidSelection(data.categoryId)
          setTimeout(() => setCurrentInvalidSelection(null), 800)
        }
        
        setSelectedCells(data.playerState.selectedCells)
        setCurrentPlayer(data.playerState.currentPlayer)
        setMaxAvailablePlayers(data.playerState.maxAvailablePlayers)
        setUsedPlayers(data.playerState.usedPlayers)
      })

      channel.bind('wildcard-used', (data) => {
        wildcardSound.play()
        setWildcardMatches(data.wildcardMatches)
        setHasWildcard(false)
      })

      channel.bind('turn-skipped', (data) => {
        setShowSkipAnimation(true)
        setTimeout(() => setShowSkipAnimation(false), 800)
        setCurrentPlayer(data.nextPlayer)
        if (data.isPenalty) {
          setSkipPenalty(true)
          setTimeout(() => setSkipPenalty(false), 1000)
        }
      })

      return () => {
        channel.unbind_all()
        pusher.unsubscribe(`room-${roomId}`)
      }
    }
  }, [roomId])

  const handleCellSelect = async (categoryId) => {
    if (!currentPlayer || currentPlayer.name !== playerName) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/cell-select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerName, categoryId })
      })
      
      if (!response.ok) throw new Error('Failed to process selection')
      
    } catch (error) {
      console.error('Error selecting cell:', error)
      toast({
        title: "Error",
        description: "Failed to process selection",
        status: "error",
      })
    }
  }

  const handleWildcardUse = async () => {
    if (!hasWildcard || !currentPlayer || currentPlayer.name !== playerName) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/use-wildcard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerName })
      })
      
      if (!response.ok) throw new Error('Failed to use wildcard')
      
    } catch (error) {
      console.error('Error using wildcard:', error)
      toast({
        title: "Error",
        description: "Failed to use wildcard",
        status: "error",
      })
    }
  }

  const handleSkip = async () => {
    if (!currentPlayer || currentPlayer.name !== playerName) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/skip-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerName })
      })
      
      if (!response.ok) throw new Error('Failed to skip turn')
      
    } catch (error) {
      console.error('Error skipping turn:', error)
      toast({
        title: "Error",
        description: "Failed to skip turn",
        status: "error",
      })
    }
  }

  const handleTimeUp = () => {
    handleSkip()
  }

  const handleModeSelect = async (isTimed) => {
    try {
      setGameMode(isTimed ? 'timed' : 'classic');
      
      const response = await fetch(`${API_BASE_URL}/api/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName,
          gameMode: isTimed ? 'timed' : 'classic'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start game');
      }

      // Game will be started via Pusher event 'game-started'
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Error",
        description: "Failed to start game",
        status: "error"
      });
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName) {
      toast({
        title: "Error",
        description: "Please enter your name",
        status: "error",
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName })
      });

      if (!response.ok) throw new Error('Failed to create room');
      
      const data = await response.json();
      setRoomId(data.roomId);
      setIsHost(true);
      setPlayers([{ name: playerName, isHost: true }]);
      setGameState('waiting');
      
      toast({
        title: "Room Created!",
        description: `Room ID: ${data.roomId}`,
        status: "success",
      });
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room",
        status: "error",
      });
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName || !roomId) {
      toast({
        title: "Error",
        description: "Please enter your name and room ID",
        status: "error",
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, roomId })
      });

      if (!response.ok) throw new Error('Failed to join room');
      
      setGameState('waiting');
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room",
        status: "error",
      });
    }
  };

  return (
    <Box minH="100vh" color="white" pb={8} mt={10}>
      {gameState === 'init' && (
        <Container maxW="container.md" pt={8}>
          <VStack spacing={8}>
            <Heading>Multiplayer Bingo</Heading>
            <Input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <HStack spacing={4} w="full">
              <Button 
                colorScheme="green" 
                onClick={handleCreateRoom}
                flex={1}
              >
                Create Room
              </Button>
              <Text>OR</Text>
              <VStack flex={1} spacing={4}>
                <Input
                  placeholder="Enter room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
                <Button 
                  colorScheme="blue" 
                  w="full"
                  onClick={handleJoinRoom}
                >
                  Join Room
                </Button>
              </VStack>
            </HStack>
          </VStack>
        </Container>
      )}

      {gameState === 'waiting' && (
        <Container maxW="container.md" pt={8}>
          <VStack spacing={6}>
            <Heading size="lg">Waiting Room</Heading>
            <Text>Room ID: {roomId}</Text>
            <Box w="full">
              <VStack align="stretch" spacing={2}>
                {players.map((player, index) => (
                  <HStack
                    key={index}
                    bg="whiteAlpha.100"
                    p={3}
                    borderRadius="md"
                    justify="space-between"
                  >
                    <Text>{player.name}</Text>
                    {player.isHost && <Badge colorScheme="yellow">Host</Badge>}
                  </HStack>
                ))}
              </VStack>
            </Box>
            {isHost && players.length >= 2 && (
              <MpGameModeSelect onModeSelect={handleModeSelect} />
            )}
          </VStack>
        </Container>
      )}

      {gameState === 'playing' && (
        <Container maxW="container.xl" pt={8}>
          <VStack spacing={6}>
            {/* Player scores */}
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

            {/* Current player info */}
            {currentPlayer && (
              <Box 
                w="full"
                maxW="400px"
                p={4} 
                bg="linear-gradient(135deg,rgb(48, 86, 210) 0%,rgb(11, 52, 166) 100%)"
                borderRadius="xl"
                boxShadow="0 4px 12px rgba(0, 0, 0, 0.3)"
                border="1px solid rgba(255, 255, 255, 0.1)"
              >
                <HStack justify="center" spacing={3} align="center">
                  <Text 
                    fontSize="2xl" 
                    fontWeight="bold"
                    color="white"
                    textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
                  >
                    {currentPlayer.g} {currentPlayer.f}
                  </Text>
                  {gameMode === 'timed' && currentPlayer.name === playerName && (
                    <MpTimer seconds={timeRemaining} onTimeUp={handleTimeUp} />
                  )}
                </HStack>
              </Box>
            )}

            {/* Game controls */}
            {currentPlayer?.name === playerName && (
              <MpGameControls
                hasWildcard={hasWildcard}
                onWildcardUse={handleWildcardUse}
                onSkip={handleSkip}
                isSkipPenalty={skipPenalty}
              />
            )}

            {/* Bingo board */}
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

            {/* Used players counter */}
            <Box
              p={3}
              bg="rgba(0, 0, 0, 0.4)"
              borderRadius="lg"
            >
              <Text
                fontSize="lg"
                fontWeight="semibold"
                color="white"
                textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
              >
                Players Used: {usedPlayers.length} / {maxAvailablePlayers}
              </Text>
            </Box>
          </VStack>
        </Container>
      )}
    </Box>
  )
}

export default MultiplayerBingoGame 