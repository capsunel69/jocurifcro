import { Container, VStack, Heading, useToast, Button, Text, HStack, Box, Stack, Grid, Menu, MenuButton, MenuList, MenuItem, Image } from '@chakra-ui/react'
import { useState, useEffect, useRef } from 'react'
import { MdRefresh, MdShuffle } from 'react-icons/md'
import BingoBoard from '../components/BingoBoard'
import GameControls from '../components/GameControls'
import GameModeSelect from '../components/GameModeSelect'
import Timer from '../components/Timer'
import { keyframes } from '@emotion/react'
import { ChevronDownIcon } from '@chakra-ui/icons'

const shakeAnimation = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
`

function BingoGame() {
  const [gameMode, setGameMode] = useState(null) // null, 'classic', or 'timed'
  const [timeRemaining, setTimeRemaining] = useState(10)
  const [gameState, setGameState] = useState('start')
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [selectedCells, setSelectedCells] = useState([])
  const [validSelections, setValidSelections] = useState([])
  const [currentInvalidSelection, setCurrentInvalidSelection] = useState(null)
  const [usedPlayers, setUsedPlayers] = useState([])
  const [hasWildcard, setHasWildcard] = useState(true)
  const [skipPenalty, setSkipPenalty] = useState(false)
  const [wildcardMatches, setWildcardMatches] = useState([])
  const [currentCard, setCurrentCard] = useState(null)
  const [availableCards, setAvailableCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [maxAvailablePlayers, setMaxAvailablePlayers] = useState(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [showSkipAnimation, setShowSkipAnimation] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const toast = useToast()
  const menuListRef = useRef(null)

  // Add these lines after your existing state declarations
  const correctSound = new Audio('/sfx/correct_answer.mp3')
  correctSound.volume = 0.15
  
  const wrongSound = new Audio('/sfx/wrong_answer.mp3')
  wrongSound.volume = 0.15
  
  const wildcardSound = new Audio('/sfx/wildcard.mp3')
  wildcardSound.volume = 0.15

  // Update this useEffect to use the correct path
  useEffect(() => {
    const loadCards = async () => {
      try {
        const cardModules = import.meta.glob('../data/*.json')
        const loadedCards = await Promise.all(
          Object.keys(cardModules).map(async (path) => {
            const module = await cardModules[path]()
            // Extract the ID from the filename (e.g., "../data/543.json" -> "543")
            const id = path.match(/\/(\d+)\.json$/)?.[1] || 'Unknown'
            return {
              ...module.default || module,
              id: id
            }
          })
        )
        
        // Add some debug logging
        console.log('Loaded cards:', loadedCards)
        
        if (loadedCards.length === 0) {
          console.error('No cards were loaded')
          showToast({
            title: "Error",
            description: "No game cards found",
            status: "error",
          })
          return
        }
        
        setAvailableCards(loadedCards)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading cards:', error)
        showToast({
          title: "Error",
          description: "Failed to load game cards",
          status: "error",
        })
        setIsLoading(false)
      }
    }

    loadCards()
  }, [])

  // Add this useEffect after your other useEffects
  useEffect(() => {
    let timerInterval
    if (gameState === 'playing' && gameMode === 'timed' && timeRemaining > 0) {
      timerInterval = setInterval(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timerInterval)
  }, [gameState, gameMode, timeRemaining])

  // Add this useEffect after your other useEffects
  useEffect(() => {
    if (menuListRef.current && currentCard && isMenuOpen) {
      const currentCardElement = menuListRef.current.querySelector(`[data-card-id="${currentCard.id}"]`)
      if (currentCardElement) {
        const menuListHeight = menuListRef.current.clientHeight
        const cardHeight = currentCardElement.offsetHeight
        const cardOffset = currentCardElement.offsetTop
        const scrollPosition = cardOffset - (menuListHeight / 2) + (cardHeight / 2)
        
        menuListRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        })
      }
    }
  }, [currentCard, isMenuOpen])

  // Modify getRandomCard to handle the new structure
  const getRandomCard = () => {
    if (availableCards.length === 0) return null
    if (availableCards.length === 1) return availableCards[0]

    const otherCards = availableCards.filter(card => card !== currentCard)
    return otherCards[Math.floor(Math.random() * otherCards.length)]
  }

  // Add this function before it's used
  const formatCategories = (remitData) => {
    if (!remitData || !Array.isArray(remitData)) {
      console.error('Invalid remit data:', remitData)
      return []
    }

    return remitData.map(categoryGroup => ({
      title: categoryGroup.map(item => item.displayName).join(' + '),
      description: categoryGroup.map(item => item.name).join(' + '),
      originalData: categoryGroup
    }))
  }

  // Initialize categories from the new format
  const categories = currentCard ? formatCategories(currentCard.gameData.remit) : []

  const getRandomPlayer = (usedPlayerIds = [], players = currentCard?.gameData.players) => {
    if (!players) {
      console.log('No players data available')
      return null
    }
    
    // Only consider players within the maxAvailablePlayers limit
    const availablePlayers = players
      .slice(0, maxAvailablePlayers)
      .filter(player => !usedPlayerIds.includes(player.id))

    if (availablePlayers.length === 0 || usedPlayerIds.length >= maxAvailablePlayers) {
      return null
    }
    
    const selectedPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)]
    console.log('Selected player:', selectedPlayer)
    return selectedPlayer
  }

  const handleModeSelect = async (isTimed, useCurrentCard = false, specificCard = null) => {
    const mode = isTimed ? 'timed' : 'classic'
    const initialTime = 10
    
    // Get the game card based on the parameters
    let gameCard
    if (specificCard) {
      gameCard = specificCard
    } else if (useCurrentCard) {
      gameCard = currentCard
    } else {
      gameCard = getRandomCard()
    }

    if (!gameCard) {
      showToast({
        title: "Error",
        description: "No game card available",
        status: "error",
      })
      return
    }
    
    // Initialize all game state at once
    const totalPlayers = gameCard.gameData.players.length
    const firstPlayer = gameCard.gameData.players[Math.floor(Math.random() * totalPlayers)]
    
    if (!firstPlayer) {
      showToast({
        title: "Error",
        description: "No players available to start the game",
        status: "error",
      })
      return
    }

    // Set all state at once
    setCurrentCard(gameCard)
    setGameMode(mode)
    setTimeRemaining(initialTime)
    setMaxAvailablePlayers(totalPlayers)
    setGameState('playing')
    setCurrentPlayer(firstPlayer)
    setSelectedCells([])
    setValidSelections([])
    setCurrentInvalidSelection(null)
    // setUsedPlayers([firstPlayer.id]) this sets first player as used player <=> first player is 1 not 0
    setUsedPlayers([]) // first player is  0
    setHasWildcard(true)
    setWildcardMatches([])
    setSkipPenalty(false)
    setWrongAttempts(0)
  }

  const showToast = (options) => {
    toast.closeAll()
    
    toast({
      position: "bottom",
      duration: 2000,
      isClosable: true,
      ...options,
    })
  }

  const handleCellSelect = (categoryId) => {
    if (!currentPlayer) return
    
    const category = categories[categoryId].originalData
    
    console.log('Checking player:', currentPlayer.f, 'with achievements:', currentPlayer.v)
    console.log('Against category requirements:', category.map(req => req.id))
    
    // For categories with multiple requirements, player must match ALL requirements
    const isValidSelection = category.every(requirement => {
      const hasRequirement = currentPlayer.v.includes(requirement.id)
      console.log(`Checking requirement ${requirement.id} (${requirement.displayName}):`, hasRequirement)
      return hasRequirement
    })

    console.log('Final validation result:', isValidSelection)

    if (isValidSelection) {
      correctSound.play().catch(e => console.log('Audio play failed:', e))
      setSelectedCells([...selectedCells, categoryId])
      setValidSelections([...validSelections, categoryId])
      
      if (selectedCells.length + 1 >= categories.length) {
        endGame(true)
        return
      }

      if (gameMode === 'timed') {
        setTimeRemaining(10)
      }
      moveToNextPlayer()
    } else {
      wrongSound.play().catch(e => console.log('Audio play failed:', e))
      setCurrentInvalidSelection(categoryId)
      setWrongAttempts(prev => prev + 1)
      setMaxAvailablePlayers(prev => Math.max(prev - 1, usedPlayers.length + 1))
      
      setTimeout(() => {
        setCurrentInvalidSelection(null)
        moveToNextPlayer()
      }, 800)

      if (gameMode === 'timed') {
        setTimeRemaining(10)
      }
    }
  }

  const moveToNextPlayer = () => {
    setCurrentInvalidSelection(null)
    
    const newUsedPlayers = [...usedPlayers, currentPlayer.id]
    setUsedPlayers(newUsedPlayers)

    const nextPlayer = getRandomPlayer(newUsedPlayers)
    
    if (!nextPlayer) {
      endGame(false)
    } else {
      setCurrentPlayer(nextPlayer)
    }
  }

  const handleWildcard = () => {
    if (!currentPlayer || !hasWildcard) return
    
    // Get all valid categories for the current player
    const validCategories = categories.reduce((acc, category, index) => {
      // Skip categories that are already selected
      if (selectedCells.includes(index)) return acc
      
      // Check if ALL requirements in the category are met by the player
      const isValid = category.originalData.every(requirement => {
        // For each requirement in the category, check if the player has at least one matching achievement
        return currentPlayer.v.some(achievementId => requirement.id === achievementId)
      })
      
      if (isValid) acc.push(index)
      return acc
    }, [])

    if (validCategories.length === 0) {
      showToast({
        title: "No valid categories",
        description: "This player doesn't match any remaining categories",
        status: "warning",
      })
      return
    }

    wildcardSound.play().catch(e => console.log('Audio play failed:', e))
    
    // Update states with only new matches
    const newValidSelections = [...validSelections, ...validCategories]
    const newWildcardMatches = [...wildcardMatches, ...validCategories]
    const newSelectedCells = [...selectedCells, ...validCategories]
    
    setValidSelections(newValidSelections)
    setWildcardMatches(newWildcardMatches)
    setSelectedCells(newSelectedCells)
    setHasWildcard(false)
    
    if (newSelectedCells.length >= categories.length) {
      endGame(true)
      return
    }
    
    // Reset timer for timed mode after wildcard use
    if (gameMode === 'timed') {
      setTimeRemaining(10)
    }
    moveToNextPlayer()
  }

  const endGame = (isWin) => {
    setGameState('end')
    showToast({
      title: isWin ? "Congratulations!" : "Game Over!",
      description: isWin 
        ? "You've completed all categories!"
        : `No more players available. You matched ${validSelections.length} of 16 categories with ${usedPlayers.length} of ${maxAvailablePlayers} players.`,
      status: isWin ? "success" : "info",
      duration: 4000,
    })
  }

  const handleSkip = () => {
    if (skipPenalty) {
      setSkipPenalty(false)
      return
    }

    setShowSkipAnimation(true)
    // Reset timer if in timed mode
    if (gameMode === 'timed') {
      setTimeRemaining(10)
    }
    
    setTimeout(() => {
      moveToNextPlayer()
      setShowSkipAnimation(false)
    }, 800)
  }

  const handleTimeUp = () => {
    if (gameMode === 'timed') {
      setShowSkipAnimation(true)
      // Don't reduce players here since it will be handled in moveToNextPlayer
      
      setTimeout(() => {
        moveToNextPlayer()
        setTimeRemaining(10)
        setShowSkipAnimation(false)
      }, 800)
    }
  }

  const containerStyles = {
    minH: "100vh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    p: 4,
    w: "100%",
    maxW: "100%",
    margin: 0,
    mt: 16
  }

  // Add loading state handling to your render logic
  if (isLoading) {
    return (
      <Box {...containerStyles}>
        <Container maxW="container.lg" py={8} mx="auto">
          <VStack spacing={8} align="center" w="full">
            <Heading as="h1" size="xl" textAlign="center">Loading...</Heading>
          </VStack>
        </Container>
      </Box>
    )
  }

  if (gameState === 'start') {
    return (
      <Box {...containerStyles}>
        <Container maxW="container.lg" py={8} mx="auto">
          <VStack spacing={5} align="center" w="full">
            <Heading as="h1" size="xl" textAlign="center">Football Bingo</Heading>
            <GameModeSelect onModeSelect={handleModeSelect} />
            <VStack 
              spacing={2} 
              align="start" 
              w="full" 
              maxW="800px"
              p={4}
              bg="whiteAlpha.100"
              borderRadius="md"
            >
              <Text fontSize="md" fontWeight="bold">Cum se joaca:</Text>
              
              <Grid 
                templateColumns={['1fr', '1fr', '1fr 1fr']} 
                gap={6} 
                w="full"
                fontSize="sm"
              >
                {/* Left Column */}
                <VStack align="start" spacing={4}>
                  <Box>
                    <Text fontWeight="semibold">1. Alege intre doua moduri de joc:</Text>
                    <Text pl={4}>• Modul Clasic: Fara limita de timp pentru fiecare decizie</Text>
                    <Text pl={4}>• Modul Contra-Timp: Ai 10 secunde sa faci o alegere, altfel pierzi jucatorul</Text>
                  </Box>

                  <Box>
                    <Text fontWeight="semibold">2. Pentru fiecare jucator afisat:</Text>
                    <Text pl={4}>• Trebuie sa alegi o categorie in care crezi ca se incadreaza</Text>
                    <Text pl={4}>• Daca alegerea e corecta, patratelul ramane selectat si primesti alt jucator</Text>
                    <Text pl={4}>• Daca gresesti, pierzi 1 jucator din numarul maxim disponibil</Text>
                    <Text pl={4}>• Categoria "played with" pentru colegi se refera strict la club, nu echipa nationala.</Text>
                  </Box>
                </VStack>

                {/* Right Column */}
                <VStack align="start" spacing={4}>
                  <Box>
                    <Text fontWeight="semibold">3. Ai la dispozitie:</Text>
                    <Text pl={4}>• Un wild card (steaua galbena) - foloseste-l cand crezi ca un jucator se potriveste in mai multe categorii</Text>
                    <Text pl={4}>• Optiunea de skip - dar vei pierde un jucator din numarul maxim disponibil</Text>
                  </Box>

                  <Box>
                    <Text fontWeight="semibold">4. Jocul se termina cand:</Text>
                    <Text pl={4}>• Completezi toate cele 16 casute (victorie!)</Text>
                    <Text pl={4}>• Nu mai ai jucatori disponibili (infrangere)</Text>
                  </Box>

                  <Text fontStyle="italic" color="yellow.200">
                    Sfat: Foloseste wild card-ul strategic pentru jucatorii cu multe realizari!
                  </Text>
                </VStack>
              </Grid>
            </VStack>
          </VStack>
        </Container>
      </Box>
    )
  }

  if (gameState === 'end') {
    return (
      <Box {...containerStyles}>
        <Container maxW="container.lg" py={8} mx="auto">
          <VStack spacing={8} align="center" w="full">
            <Heading as="h1" size="xl" textAlign="center">Game Over!</Heading>
            <Text fontSize="2xl" fontWeight="bold">Final Score: {validSelections.length} of 16</Text>
            <VStack spacing={4}>
              <Text>Categories Matched: {validSelections.length} of 16</Text>
              <Text>Wrong Attempts: {wrongAttempts}</Text>
              <Text>Players Used: {usedPlayers.length}</Text>
              {validSelections.length >= 16 && (
                <Text color="green.500" fontWeight="bold">
                  Congratulations! You've completed all categories!
                </Text>
              )}
            </VStack>
            <VStack spacing={4}>
              <Button colorScheme="brand" size="lg" onClick={() => handleModeSelect(gameMode === 'timed', true)}>
                Play Same Card
              </Button>
              <Button colorScheme="blue" size="lg" onClick={() => handleModeSelect(gameMode === 'timed', false)}>
                Play Random Card
              </Button>
            </VStack>
            
            <VStack spacing={4} mt={8}>
              <Text textAlign="center">Nu uita ca avem un newsletter zilnic, aboneaza-te bagand mailul mai jos.</Text>
              {!iframeLoaded && (
                <Box 
                  w="100%" 
                  h="72px" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  bg="whiteAlpha.100"
                  borderRadius="md"
                >
                  <Text>Se încarcă...</Text>
                </Box>
              )}
              <Box 
                as="div"
                w="100%" 
                h="72px"
                position="relative"
                overflow="visible"
                style={{ 
                  display: iframeLoaded ? 'block' : 'none',
                  touchAction: 'auto'
                }}
              >
                <iframe 
                  id="myIframe" 
                  src="https://embeds.beehiiv.com/4f46f0f5-c3e3-4a05-a85a-2c1a2eba5d8e?slim=true"
                  data-test-id="beehiiv-embed" 
                  width="100%" 
                  height="72" 
                  frameBorder="0" 
                  scrolling="no"
                  style={{
                    margin: 0,
                    padding: 0,
                    border: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'auto',
                    zIndex: 999,
                    touchAction: 'auto',
                    WebkitOverflowScrolling: 'touch'
                  }}
                  onLoad={() => setIframeLoaded(true)}
                />
              </Box>
            </VStack>
          </VStack>
        </Container>
      </Box>
    )
  }

  if (gameState === 'playing') {
    return (
      <Box {...containerStyles}>
        <Container maxW="container.lg" py={8} mx="auto">
          <VStack spacing={4} w="full" align="center">
            <HStack 
              justify="space-between" 
              w="full" 
              flexDir={['column', 'row']} 
              spacing={[4, 8]}
              align="center"
            >
              <VStack align={['center', 'flex-start']} spacing={0}>
                <Heading as="h1" size={['lg', 'xl']}>Football Bingo</Heading>
                <Button
                  size="xs"
                  variant="link"
                  color="gray.400"
                  p={1}
                  borderRadius="md"
                  _hover={{ color: "white" }}
                  onClick={() => {
                    setGameMode(null)
                    setGameState('start')
                  }}
                >
                  ← Change Mode
                </Button>
              </VStack>
              <VStack spacing={0} align={['center', 'end']}>
                <Box
                  p={3}
                  bg="rgba(0, 0, 0, 0.4)"
                  borderRadius="lg"
                  animation={wrongAttempts > 0 ? `${shakeAnimation} 0.5s ease` : 'none'}
                >
                  <Text
                    fontSize="lg"
                    fontWeight="semibold"
                    color="white"
                    textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
                  >
                    Players Used: <Text as="span" color="brand.400">{usedPlayers.length}</Text>
                    <Text as="span" color="gray.400"> / {maxAvailablePlayers}</Text>
                  </Text>
                </Box>
                <Menu 
                  onOpen={() => {
                    // Force a re-render to ensure menu is fully mounted
                    requestAnimationFrame(() => {
                      if (menuListRef.current && currentCard) {
                        const currentCardElement = menuListRef.current.querySelector(`[data-card-id="${currentCard.id}"]`)
                        if (currentCardElement) {
                          const menuListHeight = menuListRef.current.clientHeight
                          const cardHeight = currentCardElement.offsetHeight
                          const cardOffset = currentCardElement.offsetTop
                          const scrollPosition = cardOffset - (menuListHeight / 2) + (cardHeight / 2)
                          
                          menuListRef.current.scrollTo({
                            top: scrollPosition,
                            behavior: 'instant'
                          })
                        }
                      }
                    })
                  }}
                >
                  <MenuButton
                    as={Button}
                    size="xs"
                    variant="ghost"
                    rightIcon={<ChevronDownIcon />}
                    color="gray.400"
                    _hover={{ color: "white" }}
                    _active={{ bg: "transparent" }}
                  >
                    Card #{currentCard?.id || 'Unknown'}
                  </MenuButton>
                  <MenuList 
                    maxH="300px" 
                    overflowY="auto"
                    bg="gray.800"
                    borderColor="whiteAlpha.200"
                    boxShadow="lg"
                    ref={menuListRef}
                    css={{
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'rgba(0, 0, 0, 0.1)',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: 'rgba(255, 255, 255, 0.3)',
                      },
                    }}
                  >
                    {availableCards
                      .sort((a, b) => a.id - b.id)
                      .map(card => (
                        <MenuItem
                          key={card.id}
                          data-card-id={card.id}
                          onClick={() => handleModeSelect(gameMode === 'timed', false, card)}
                          color={card.id === currentCard?.id ? "brand.400" : "gray.100"}
                          bg={card.id === currentCard?.id ? "whiteAlpha.100" : "transparent"}
                          fontWeight={card.id === currentCard?.id ? "bold" : "normal"}
                          _hover={{
                            bg: "whiteAlpha.200"
                          }}
                          _focus={{
                            bg: "whiteAlpha.200"
                          }}
                          position="relative"
                          _after={card.id === currentCard?.id ? {
                            content: '""',
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: "3px",
                            bg: "brand.400",
                            borderRadius: "sm"
                          } : undefined}
                        >
                          Card #{card.id}
                        </MenuItem>
                      ))}
                  </MenuList>
                </Menu>
              </VStack>
            </HStack>
            
            <VStack w="full" maxW="400px" mx="auto" spacing={4}>
              <Box 
                w="full"
                p={4} 
                bg="linear-gradient(135deg,rgb(48, 86, 210) 0%,rgb(11, 52, 166) 100%)"
                borderRadius="xl"
                boxShadow="0 4px 12px rgba(0, 0, 0, 0.3)"
                border="1px solid rgba(255, 255, 255, 0.1)"
              >
                <VStack spacing={3}>
                  {currentPlayer && (
                    <Box
                      w="80px"
                      h="80px"
                      borderRadius="full"
                      overflow="hidden"
                      border="2px solid white"
                      boxShadow="0 2px 8px rgba(0, 0, 0, 0.3)"
                    >
                      <Image
                        src={`https://cryptobully.s3.eu-north-1.amazonaws.com/bingo-players-imgs/${currentPlayer.id}.jpg`}
                        alt={`${currentPlayer.g} ${currentPlayer.f}`}
                        width="100%"
                        height="100%"
                        objectFit="cover"
                        objectPosition="top center"
                        onError={(e) => {
                          // If image fails to load, use placeholder.jpg
                          e.target.src = `https://cryptobully.s3.eu-north-1.amazonaws.com/bingo-players-imgs/placeholder.jpg`;
                        }}
                      />
                    </Box>
                  )}
                  <HStack justify="center" spacing={3} align="center">
                    <Text 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      textAlign="center"
                      color="white"
                      textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
                    >
                      {currentPlayer ? `${currentPlayer.g} ${currentPlayer.f}` : 'No player selected'}
                    </Text>
                    {gameMode === 'timed' && (
                      <Timer seconds={timeRemaining} onTimeUp={handleTimeUp} />
                    )}
                  </HStack>
                </VStack>
              </Box>

              <GameControls 
                hasWildcard={hasWildcard}
                onWildcardUse={handleWildcard}
                onSkip={handleSkip}
                isSkipPenalty={skipPenalty}
                isDisabled={showSkipAnimation || currentInvalidSelection !== null}
              />
            </VStack>

            <Box w="full" maxW="800px" mx="auto">
              <BingoBoard 
                selectedCells={selectedCells} 
                onCellSelect={handleCellSelect}
                validSelections={validSelections}
                currentInvalidSelection={currentInvalidSelection}
                categories={categories}
                wildcardMatches={wildcardMatches}
                showSkip={showSkipAnimation}
                currentPlayer={currentPlayer}
              />
            </Box>

            <Stack 
              direction={['column', 'row']} 
              spacing={4}
            >
              <Button
                size="sm"
                leftIcon={<MdRefresh />}
                onClick={() => handleModeSelect(gameMode === 'timed', true)}
                bg="rgba(255, 255, 255, 0.2)"
                color="white"
                _hover={{
                  bg: "rgba(255, 255, 255, 0.3)",
                  transform: "translateY(-2px)"
                }}
                boxShadow="none"
              >
                Restart This Card
              </Button>
              <Button
                size="sm"
                leftIcon={<MdShuffle />}
                onClick={() => handleModeSelect(gameMode === 'timed', false)}
                bg="rgba(255, 255, 255, 0.2)"
                color="white"
                _hover={{
                  bg: "rgba(255, 255, 255, 0.3)",
                  transform: "translateY(-2px)"
                }}
                boxShadow="none"
              >
                Play Random Card
              </Button>
            </Stack>
          </VStack>
        </Container>
      </Box>
    )
  }
}

export default BingoGame
