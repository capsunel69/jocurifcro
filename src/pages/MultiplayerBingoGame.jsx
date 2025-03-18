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
  Center,
  Progress
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
  const [usedPlayers, setUsedPlayers] = useState([])
  const [hasWildcard, setHasWildcard] = useState(true)
  const [skipPenalty, setSkipPenalty] = useState(false)
  const [wildcardMatches, setWildcardMatches] = useState([])
  const [maxAvailablePlayers, setMaxAvailablePlayers] = useState(40)
  const [categories, setCategories] = useState([])
  const [roomId, setRoomId] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [players, setPlayers] = useState([])
  const toast = useToast()
  const [showSkipAnimation, setShowSkipAnimation] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isInteractionDisabled, setIsInteractionDisabled] = useState(false)
  const [playerScores, setPlayerScores] = useState({})
  const [finishedPlayers, setFinishedPlayers] = useState([])
  const [isHost, setIsHost] = useState(false)
  const [allPlayersFinished, setAllPlayersFinished] = useState(false)
  const [hasFinished, setHasFinished] = useState(false)

  const correctSound = new Audio('/sfx/correct_answer.mp3')
  correctSound.volume = 0.15
  
  const wrongSound = new Audio('/sfx/wrong_answer.mp3')
  wrongSound.volume = 0.15
  
  const wildcardSound = new Audio('/sfx/wildcard.mp3')
  wildcardSound.volume = 0.15

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rid = params.get('roomId')
    const pname = params.get('playerName')
    
    if (rid && pname) {
      setRoomId(rid)
      setPlayerName(pname)
    }
  }, [])

  useEffect(() => {
    if (roomId) {
      const channel = pusher.subscribe(`room-${roomId}`)
      
      channel.bind('game-started', (data) => {
        console.log('Game started data:', data)
        if (data.gameData) {
          setCategories(data.gameData.categories || [])
          setCurrentPlayer(data.gameData.currentPlayer)
          setMaxAvailablePlayers(data.gameData.maxPlayers)
          setUsedPlayers([])
          setGameState('playing')
        }
      })

      channel.bind('cell-selected', (data) => {
        console.log('Cell selected event received:', {
          playerName: data.playerName,
          isValid: data.isValid,
          categoryId: data.categoryId,
          totalValidSelections: data.totalValidSelections
        });

        if (data.isValid) {
          // Use server's total for the score
          if (data.totalValidSelections !== undefined) {
            setPlayerScores(prev => ({
              ...prev,
              [data.playerName]: data.totalValidSelections
            }));
            console.log(`Updated score for ${data.playerName} to ${data.totalValidSelections}`);
          }

          if (data.playerName === playerName) {
            correctSound.play();
            setValidSelections(prev => [...prev, data.categoryId]);
            setSelectedCells(data.playerState.selectedCells || [])
            setCurrentPlayer(data.playerState.currentPlayer)
            setUsedPlayers(prev => {
              const newUsedPlayers = [...prev, data.playerState.lastUsedPlayer]
              if (newUsedPlayers.length >= maxAvailablePlayers) {
                console.log('Game over triggered by valid selection')
                setIsGameOver(true)
                setGameState('finished')
                handleGameOver()
              }
              return newUsedPlayers
            })
          }
        }

        if (data.playerName === playerName) {
          if (data.isValid) {
            correctSound.play()
            setSelectedCells(data.playerState.selectedCells || [])
            setCurrentPlayer(data.playerState.currentPlayer)
            setUsedPlayers(prev => {
              const newUsedPlayers = [...prev, data.playerState.lastUsedPlayer]
              if (newUsedPlayers.length >= maxAvailablePlayers) {
                console.log('Game over triggered by valid selection')
                setIsGameOver(true)
                setGameState('finished')
                handleGameOver()
              }
              return newUsedPlayers
            })
          } else {
            wrongSound.play()
            setIsInteractionDisabled(true)
            setCurrentInvalidSelection(data.categoryId)
            setMaxAvailablePlayers(prev => Math.max(prev - 2, usedPlayers.length + 1))
            setUsedPlayers(prev => {
              const newUsedPlayers = [...prev, data.playerState.lastUsedPlayer]
              if (newUsedPlayers.length >= maxAvailablePlayers - 2) {
                console.log('Game over triggered by invalid selection')
                setIsGameOver(true)
                setGameState('finished')
                handleGameOver()
              }
              return newUsedPlayers
            })
            setCurrentPlayer(data.playerState.currentPlayer)
            
            setTimeout(() => {
              setCurrentInvalidSelection(null)
              setIsInteractionDisabled(false)
            }, 800)
          }
        }
      })

      channel.bind('wildcard-used', (data) => {
        console.log('Wildcard used event received:', {
          playerName: data.playerName,
          wildcardMatches: data.wildcardMatches,
          totalValidSelections: data.totalValidSelections
        });

        // Use server's total for the score
        if (data.totalValidSelections !== undefined) {
          setPlayerScores(prev => ({
            ...prev,
            [data.playerName]: data.totalValidSelections
          }));
          console.log(`Updated score for ${data.playerName} to ${data.totalValidSelections}`);
        }

        if (data.playerName === playerName) {
          if (data.wildcardMatches && data.wildcardMatches.length > 0) {
            wildcardSound.play();
            setWildcardMatches(data.wildcardMatches);
            setValidSelections(prev => [...prev, ...data.wildcardMatches]);
          } else {
            toast({
              title: "No Matches Found",
              description: "There are no matching categories for this player.",
              status: "info",
              duration: 3000,
              isClosable: true,
            });
          }
          
          setHasWildcard(false);
          setIsInteractionDisabled(false);
        }
      })

      channel.bind('turn-skipped', (data) => {
        if (data.playerName === playerName) {
          setIsInteractionDisabled(true)
          setShowSkipAnimation(true)
          setCurrentPlayer(data.nextPlayer)
          setUsedPlayers(prev => {
            const newUsedPlayers = [...prev, data.skippedPlayerId]
            setMaxAvailablePlayers(Math.max(maxAvailablePlayers - 1, newUsedPlayers.length + 1))
            // Check if game should end after skip
            if (newUsedPlayers.length >= maxAvailablePlayers - 1) {
              console.log('Game over triggered by skip')
              setIsGameOver(true)
              setGameState('finished')
              handleGameOver()
            }
            return newUsedPlayers
          })
          setTimeout(() => {
            setShowSkipAnimation(false)
            setIsInteractionDisabled(false)
          }, 1000)
        }
      })

      channel.bind('player-finished', (data) => {
        console.log('Player finished event received:', data)
        
        // Set the score from the server once and for all
        if (data.finalScore !== undefined) {
          setPlayerScores(prev => {
            // Only update if the score is different
            if (prev[data.playerName] !== data.finalScore) {
              console.log(`Setting final score for ${data.playerName} to ${data.finalScore}`)
              return {
                ...prev,
                [data.playerName]: data.finalScore
              }
            }
            return prev
          })
        }
        
        // Add to finished players list
        setFinishedPlayers(prev => {
          if (!prev.includes(data.playerName)) {
            return [...prev, data.playerName]
          }
          return prev
        })
      })

      channel.bind('game-reset', (data) => {
        // Reset game state for all players
        setGameState('waiting')
        setIsGameOver(false)
        setValidSelections([])
        setSelectedCells([])
        setUsedPlayers([])
        setHasWildcard(true)
        setWildcardMatches([])
        setPlayerScores({})
        setFinishedPlayers([])
        setAllPlayersFinished(false)
      })

      return () => {
        pusher.unsubscribe(`room-${roomId}`)
      }
    }
  }, [roomId, playerName, maxAvailablePlayers])

  useEffect(() => {
    // Check if all players have finished
    if (players.length > 0 && finishedPlayers.length === players.length) {
      setAllPlayersFinished(true)
    }
  }, [players, finishedPlayers])

  const handleModeSelect = async (isTimed) => {
    setGameMode(isTimed ? 'timed' : 'classic')
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName,
          gameMode: isTimed ? 'timed' : 'classic'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start game')
      }
    } catch (error) {
      console.error('Error starting game:', error)
      toast({
        title: "Error",
        description: "Failed to start game",
        status: "error",
      })
    }
  }

  const handleCellSelect = async (categoryId) => {
    if (isInteractionDisabled || isGameOver) return

    if (usedPlayers.length >= maxAvailablePlayers) {
      toast({
        title: "Game Over",
        description: "You've used all available players!",
        status: "info",
      })
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/cell-select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId, 
          playerName, 
          categoryId,
          currentPlayerId: currentPlayer?.id,
          usedPlayers,
          maxAvailablePlayers
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process selection')
      }
    } catch (error) {
      console.error('Error selecting cell:', error)
      toast({
        title: "Error",
        description: error.message,
        status: "error",
      })
    }
  }

  const handleWildcardUse = async () => {
    if (isInteractionDisabled || isGameOver || !hasWildcard) {
      console.log('Wildcard blocked:', { isInteractionDisabled, isGameOver, hasWildcard })
      return
    }
    
    try {
      console.log('Attempting to use wildcard:', {
        roomId,
        playerName,
        currentPlayerId: currentPlayer?.id,
        categoriesCount: categories.length
      })
      
      setIsInteractionDisabled(true)
      
      const response = await fetch(`${API_BASE_URL}/api/use-wildcard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId, 
          playerName,
          currentPlayerId: currentPlayer?.id,
          categories: categories
        })
      })
      
      const data = await response.json()
      console.log('Wildcard response:', data)
      
      if (!response.ok) {
        setIsInteractionDisabled(false)
        throw new Error(data.error || 'Failed to use wildcard')
      }
      
      // Check if there are any matches
      if (data.wildcardMatches && data.wildcardMatches.length === 0) {
        console.log('No wildcard matches found')
        setIsInteractionDisabled(false)
        toast({
          title: "No Matches Found",
          description: "There are no categories that match the current player. Your wildcard is still available!",
          status: "info",
          duration: 3000,
          isClosable: true,
        })
        return
      }
      
      console.log('Wildcard used successfully:', data.wildcardMatches)
      wildcardSound.play()
      setWildcardMatches(data.wildcardMatches || [])
      setHasWildcard(false)
      
    } catch (error) {
      console.error('Error using wildcard:', error)
      toast({
        title: "Error",
        description: error.message,
        status: "error",
      })
    } finally {
      console.log('Resetting interaction state')
      setIsInteractionDisabled(false)
    }
  }

  const handleSkip = async () => {
    if (isInteractionDisabled || isGameOver) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/skip-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId, 
          playerName,
          currentPlayerId: currentPlayer?.id,
          usedPlayers: usedPlayers
        })
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
      setPlayers([{ name: playerName, isHost: true }]);
      setIsHost(true);
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

  useEffect(() => {
    if (roomId) {
      const channel = pusher.subscribe(`room-${roomId}`);
      
      channel.bind('player-joined', (data) => {
        setPlayers(data.players);
        toast({
          title: "Player joined",
          description: `${data.playerName} has joined the game!`,
          status: "info",
        });
      });

      return () => {
        pusher.unsubscribe(`room-${roomId}`);
      };
    }
  }, [roomId]);

  // Debug logging
  console.log('Current game state:', gameState)
  console.log('Categories:', categories)
  console.log('Current player:', currentPlayer)

  // Function to notify other players when game is over
  const handleGameOver = async () => {
    console.log('Handling game over...')
    if (hasFinished) {
      console.log('Already finished, ignoring duplicate call')
      return
    }
    
    try {
      setHasFinished(true)
      const response = await fetch(`${API_BASE_URL}/api/player-finished`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to send game over notification')
      }
    } catch (error) {
      console.error('Error notifying game over:', error)
      // Don't reset hasFinished on error to prevent retries
    }
  }

  // Debug logs
  useEffect(() => {
    console.log('Game state:', {
      isGameOver,
      usedPlayers: usedPlayers.length,
      maxAvailablePlayers,
      playerScores,
      finishedPlayers
    })
  }, [isGameOver, usedPlayers, maxAvailablePlayers, playerScores, finishedPlayers])

  // Add debug logging for state changes
  useEffect(() => {
    console.log('Debug state:', {
      isGameOver,
      usedPlayers: usedPlayers.length,
      maxAvailablePlayers,
      gameState
    })
  }, [isGameOver, usedPlayers, maxAvailablePlayers, gameState])

  // Separate effect to handle game over conditions
  useEffect(() => {
    if (usedPlayers.length >= maxAvailablePlayers && gameState === 'playing') {
      console.log('Game over condition met:', {
        usedPlayers: usedPlayers.length,
        maxAvailablePlayers
      })
      setIsGameOver(true)
      setGameState('finished')
      handleGameOver()
    }
  }, [usedPlayers.length, maxAvailablePlayers, gameState])

  const handlePlayAgain = async () => {
    try {
      // Reset game state
      setGameState('waiting')
      setIsGameOver(false)
      setValidSelections([])
      setSelectedCells([])
      setUsedPlayers([])
      setHasWildcard(true)
      setWildcardMatches([])
      setPlayerScores({})
      setFinishedPlayers([])
      setAllPlayersFinished(false)
      
      // Notify other players that host started new game
      await fetch(`${API_BASE_URL}/api/reset-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId,
          playerName 
        })
      })
    } catch (error) {
      console.error('Error resetting game:', error)
      toast({
        title: "Error",
        description: "Failed to start new game",
        status: "error",
      })
    }
  }

  if (gameState === 'init') {
    return (
      <Box
        minH="100vh"
        backgroundImage="url('/images/bg-pattern-dark.png')"
        backgroundSize="cover"
        py={8}
      >
        <Container maxW="container.md">
          <VStack spacing={8}>
            <Heading 
              color="white" 
              size="2xl"
              textShadow="0 2px 4px rgba(0,0,0,0.3)"
            >
              Multiplayer Bingo
            </Heading>
            
            {/* Room creation/joining */}
            <Box
              bg="rgba(0, 0, 0, 0.4)"
              p={8}
              borderRadius="xl"
              backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.1)"
              w="full"
              maxW="400px"
            >
              <VStack spacing={6}>
                <Input
                  placeholder="Your Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  bg="rgba(255, 255, 255, 0.1)"
                  color="white"
                  border="1px solid rgba(255,255,255,0.2)"
                  _placeholder={{ color: 'gray.300' }}
                  _hover={{ bg: 'rgba(255, 255, 255, 0.15)' }}
                  _focus={{ 
                    bg: 'rgba(255, 255, 255, 0.15)',
                    borderColor: 'blue.400'
                  }}
                />
                
                <Button
                  colorScheme="blue"
                  w="full"
                  onClick={handleCreateRoom}
                  size="lg"
                  bg="linear-gradient(135deg, #3182ce 0%, #2c5282 100%)"
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(49, 130, 206, 0.4)'
                  }}
                >
                  Create Room
                </Button>
                
                <Text 
                  color="gray.300"
                  fontSize="lg"
                  fontWeight="bold"
                >
                  OR
                </Text>
                
                <Input
                  placeholder="Room ID"
                  value={roomId || ''}
                  onChange={(e) => setRoomId(e.target.value)}
                  bg="rgba(255, 255, 255, 0.1)"
                  color="white"
                  border="1px solid rgba(255,255,255,0.2)"
                  _placeholder={{ color: 'gray.300' }}
                  _hover={{ bg: 'rgba(255, 255, 255, 0.15)' }}
                  _focus={{ 
                    bg: 'rgba(255, 255, 255, 0.15)',
                    borderColor: 'green.400'
                  }}
                />
                
                <Button
                  colorScheme="green"
                  w="full"
                  onClick={handleJoinRoom}
                  size="lg"
                  bg="linear-gradient(135deg, #38a169 0%, #276749 100%)"
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(56, 161, 105, 0.4)'
                  }}
                >
                  Join Room
                </Button>
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (gameState === 'waiting') {
    return (
      <Box
        minH="100vh"
        backgroundImage="url('/images/bg-pattern-dark.png')"
        backgroundSize="cover"
        py={8}
      >
        <Container maxW="container.md">
          <VStack spacing={8}>
            <Heading 
              color="white" 
              size="2xl"
              textShadow="0 2px 4px rgba(0,0,0,0.3)"
            >
              Waiting Room
            </Heading>
            
            <Box
              bg="rgba(0, 0, 0, 0.4)"
              p={8}
              borderRadius="xl"
              backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.1)"
              w="full"
              maxW="400px"
            >
              <VStack spacing={6}>
                <Text 
                  color="white"
                  fontSize="xl"
                  fontWeight="bold"
                >
                  Room ID: {roomId}
                </Text>
                
                <Text 
                  color="gray.300"
                  fontSize="lg"
                  fontWeight="bold"
                >
                  Players:
                </Text>
                
                <VStack spacing={3} w="full">
                  {players.map((player, index) => (
                    <HStack 
                      key={index} 
                      w="full" 
                      justify="space-between"
                      bg="rgba(255, 255, 255, 0.1)"
                      p={3}
                      borderRadius="md"
                    >
                      <Text color="white">{player.name}</Text>
                      {player.isHost && (
                        <Badge colorScheme="green">Host</Badge>
                      )}
                    </HStack>
                  ))}
                </VStack>
                
                {players.find(p => p.name === playerName)?.isHost && (
                  <Box w="full" pt={4}>
                    <MpGameModeSelect onModeSelect={handleModeSelect} />
                  </Box>
                )}
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (gameState === 'playing') {
    return (
      <Box
        minH="100vh"
        backgroundImage="url('/images/bg-pattern-dark.png')"
        backgroundSize="cover"
        py={8}
      >
        <Container maxW="container.lg">
          <VStack spacing={6}>
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
                    {currentPlayer.f} {currentPlayer.g}
                  </Text>
                  {gameMode === 'timed' && (
                    <MpTimer seconds={timeRemaining} onTimeUp={handleTimeUp} />
                  )}
                </HStack>
              </Box>
            )}

            {/* Game controls */}
            <MpGameControls
              hasWildcard={hasWildcard}
              onWildcardUse={handleWildcardUse}
              onSkip={handleSkip}
              isSkipPenalty={skipPenalty}
              isDisabled={isInteractionDisabled}
            />

            {/* Bingo board */}
            {categories && categories.length > 0 && (
              <Box w="full" maxW="800px" mx="auto">
                <MpBingoBoard
                  categories={categories}
                  selectedCells={selectedCells}
                  onCellSelect={handleCellSelect}
                  validSelections={validSelections}
                  currentInvalidSelection={currentInvalidSelection}
                  wildcardMatches={wildcardMatches}
                  showSkip={showSkipAnimation}
                  isDisabled={isInteractionDisabled}
                  currentPlayer={currentPlayer}
                />
              </Box>
            )}

            {/* Used players counter */}
            <Box
              p={3}
              bg="rgba(0, 0, 0, 0.4)"
              borderRadius="lg"
              backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.1)"
            >
              <Text
                fontSize="lg"
                fontWeight="semibold"
                color="white"
                textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
              >
                Players Used: {usedPlayers?.length || 0} / {maxAvailablePlayers}
              </Text>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  // Render game over screen immediately when isGameOver is true
  if (isGameOver || gameState === 'finished') {
    console.log('Rendering game over screen with:', {
      validSelections: validSelections.length,
      playerScores,
      finishedPlayers,
      gameState,
      players
    })
    
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="rgba(0, 0, 0, 0.9)"
        backdropFilter="blur(8px)"
        zIndex={1000}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Container maxW="container.md">
          <VStack spacing={8} align="stretch">
            <Heading
              color="white"
              size="2xl"
              textAlign="center"
              textShadow="0 2px 4px rgba(0,0,0,0.3)"
            >
              Game Over!
            </Heading>

            {/* Player's score */}
            <Box
              bg="rgba(255, 255, 255, 0.1)"
              p={6}
              borderRadius="xl"
              border="1px solid rgba(255,255,255,0.2)"
            >
              <VStack spacing={3}>
                <Text color="white" fontSize="xl">
                  Your Score: {playerScores[playerName] || 0} matches
                </Text>
                <Progress
                  value={(playerScores[playerName] || 0) / categories.length * 100}
                  w="full"
                  colorScheme="blue"
                  borderRadius="full"
                />
              </VStack>
            </Box>

            {/* Leaderboard */}
            <Box
              bg="rgba(255, 255, 255, 0.1)"
              p={6}
              borderRadius="xl"
              border="1px solid rgba(255,255,255,0.2)"
            >
              <VStack spacing={4} align="stretch">
                <Heading size="md" color="white">
                  Room Leaderboard
                </Heading>
                {players.map((player) => (
                  <HStack
                    key={player.name}
                    justify="space-between"
                    bg={player.name === playerName ? "rgba(66, 153, 225, 0.3)" : "rgba(255, 255, 255, 0.05)"}
                    p={3}
                    borderRadius="md"
                  >
                    <Text color="white">
                      {player.name} {player.name === playerName && "(You)"}
                    </Text>
                    <HStack spacing={3}>
                      <Text color="white">{playerScores[player.name] || 0} matches</Text>
                      {finishedPlayers.includes(player.name) ? (
                        <Badge colorScheme="green">Finished</Badge>
                      ) : (
                        <Badge colorScheme="yellow">Playing</Badge>
                      )}
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            </Box>

            {/* Players still in game */}
            {players.length > finishedPlayers.length && (
              <Text
                color="gray.400"
                fontSize="lg"
                textAlign="center"
              >
                {players.length - finishedPlayers.length} players still playing...
              </Text>
            )}

            {/* Actions */}
            <HStack justify="center" spacing={4}>
              {isHost && allPlayersFinished && (
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handlePlayAgain}
                  bg="linear-gradient(135deg, #3182ce 0%, #2c5282 100%)"
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(49, 130, 206, 0.4)'
                  }}
                >
                  Start New Game
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/'}
                borderColor="rgba(255,255,255,0.2)"
                color="white"
                _hover={{
                  bg: 'rgba(255,255,255,0.1)'
                }}
              >
                Exit to Menu
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>
    )
  }

  // Fallback UI in case no state matches
  return (
    <Box
      minH="100vh"
      backgroundImage="url('/images/bg-pattern-dark.png')"
      backgroundSize="cover"
      py={8}
    >
      <Container maxW="container.md">
        <VStack spacing={4}>
          <Heading color="white">Loading...</Heading>
        </VStack>
      </Container>
    </Box>
  );
}

export default MultiplayerBingoGame 