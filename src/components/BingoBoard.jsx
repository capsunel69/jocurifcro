import { Grid, GridItem, Text, HStack, Image, VStack, useColorModeValue, Box } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { keyframes } from '@emotion/react'

const wrongMessageAnimation = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
  15% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
  85% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
`

const messageAnimation = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
  15% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
  85% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
`

function BingoBoard({ selectedCells, onCellSelect, validSelections = [], currentInvalidSelection = null, categories = [], wildcardMatches = [], showSkip = false, currentPlayer }) {
  const [showWrong, setShowWrong] = useState(false)
  const [showSkipMessage, setShowSkipMessage] = useState(false)
  const [showCheatHighlight, setShowCheatHighlight] = useState(false)

  // Add this new prop to pass up to the parent component
  const isAnimating = showWrong || showSkipMessage

  // Add effect for keyboard listener
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'F6') {
        setShowCheatHighlight(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  useEffect(() => {
    console.log('Checking cell:', currentInvalidSelection, 'Wildcard matches:', wildcardMatches)
  }, [currentInvalidSelection, wildcardMatches])

  useEffect(() => {
    if (currentInvalidSelection !== null) {
      setShowWrong(true)
    }
  }, [currentInvalidSelection])

  useEffect(() => {
    if (showSkip) {
      setShowSkipMessage(true)
    }
  }, [showSkip])

  const handleAnimationEnd = () => {
    setShowWrong(false)
    setShowSkipMessage(false)
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
      const newSelectedCells = [...selectedCells, categoryId]
      setSelectedCells(newSelectedCells)
      setValidSelections([...validSelections, categoryId])
      
      if (newSelectedCells.length >= categories.length) {
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

  // Update the isPotentialMatch function as well
  const isPotentialMatch = (categoryId) => {
    if (!currentPlayer || !categories[categoryId]) return false
    
    const category = categories[categoryId].originalData
    
    return category.every(requirement => 
      currentPlayer.v.includes(requirement.id)
    )
  }

  const getCellBackground = (categoryId, index) => {
    console.log('Checking cell:', categoryId, 'Wildcard matches:', wildcardMatches) // Debug log
    
    // First priority: check if it's a wildcard match
    if (wildcardMatches.includes(categoryId)) {
      console.log('Cell is wildcard match:', categoryId) // Debug log
      return '#FFD700' // Gold color
    }
    // Second priority: check if it's a regular match
    if (validSelections.includes(categoryId)) {
      return '#22c55e' // Green color
    }
    if (categoryId === currentInvalidSelection) return '#ef4444'
    if (selectedCells.includes(categoryId)) return 'brand.100'
    // Show purple background for potential matches when cheat mode is active
    if (showCheatHighlight && isPotentialMatch(categoryId)) {
      return '#9333ea' // Purple color
    }
    
    // Modern chess board pattern
    const row = Math.floor(index / 4)
    const col = index % 4
    return (row + col) % 2 === 0 
      ? '#0f172a'  // Darker square
      : '#1e293b'  // Lighter square
  }

  const getCellBoxShadow = (categoryId) => {
    // Match the glow effect with the background color logic
    if (wildcardMatches.includes(categoryId)) {
      return '0 0 20px rgba(255, 215, 0, 0.5)' // Gold glow
    }
    if (validSelections.includes(categoryId)) {
      return '0 0 20px rgba(0, 184, 148, 0.5)' // Green glow
    }
    if (categoryId === currentInvalidSelection) return '0 0 20px rgba(225, 112, 85, 0.5)'
    return '0 4px 12px rgba(0, 0, 0, 0.2)'
  }

  const isCellDisabled = (categoryId) => {
    return validSelections.includes(categoryId)
  }

  const formatCategoryText = (category) => {
    if (!category || !category.originalData) return 'Loading...'
    
    // Handle multiple items in the category
    const items = Array.isArray(category.originalData) ? category.originalData : [category.originalData]
    
    // Format text based on the first item's type (assuming all items in a group have the same type)
    const firstItem = items[0]
    
    switch (firstItem.type) {
      case 1: // Country
        return items.map(item => item.displayName).join(' + ')
      
      case 2: // Soccer club
        return items.map(item => item.displayName).join(' + ')
      
      case 3: // League with start date
        return firstItem.dataFrom 
          ? `Played in ${firstItem.displayName} (${firstItem.dataFrom}+)`
          : `Played in ${firstItem.displayName}`
      
      case 4: // Coach/Manager
        return `Managed by ${firstItem.displayName}`
      
      case 5: // Colleague
        return `Played with ${firstItem.displayName}`
      
      case 6: // Competition winner
        return firstItem.dataFrom 
          ? `${firstItem.displayName} Winner (${firstItem.dataFrom}+)`
          : `${firstItem.displayName} Winner`
      
      default:
        return items.map(item => item.displayName).join(' + ')
    }
  }

  const getCategoryImage = (category) => {
    if (!category || !category.originalData) return null
    
    // Handle multiple items in the category
    const images = category.originalData.map(item => `/images/${item.id}.webp`)
    
    return images
  }

  return (
    <Box position="relative" data-animating={isAnimating}>
      <Grid
        templateColumns="repeat(4, 1fr)"
        gap={1}
        w="100%"
        maxW="550px"
        mx="auto"
        pointerEvents={(showWrong || showSkipMessage) ? 'none' : 'auto'}
      >
        {categories.map((category, index) => (
          <GridItem
            key={index}
            onClick={() => !isCellDisabled(index) && onCellSelect(index)}
            cursor={isCellDisabled(index) ? 'default' : 'pointer'}
            p={2}
            bg={getCellBackground(index, index)}
            transition="all 0.3s ease"
            borderRadius="md"
            boxShadow={getCellBoxShadow(index)}
            position="relative"
            _hover={{
              transform: !isCellDisabled(index) && 'translateY(-2px)',
              bg: isCellDisabled(index) 
                ? getCellBackground(index, index) 
                : 'rgba(255, 255, 255, 0.1)'
            }}
            _before={{
              content: '""',
              display: 'block',
              paddingTop: '100%'
            }}
          >
            <VStack 
              spacing={1}
              justify="center" 
              align="center"
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              p={0.5}
            >
              {/* Update the Image section to handle multiple images */}
              {category.originalData.length > 1 ? (
                <Grid
                  templateColumns="repeat(2, 1fr)"
                  gap={0}
                  w="85%"
                  justifyItems="center"
                >
                  {category.originalData.map((item, idx) => (
                    <Image
                      key={idx}
                      src={`/images/${item.id}.webp`}
                      alt={`Category ${index + 1} Image ${idx + 1}`}
                      boxSize={{ base: "30px", sm: "35px", md: "40px" }}
                      objectFit="contain"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                      fallback={null}
                    />
                  ))}
                </Grid>
              ) : (
                <Image
                  src={getCategoryImage(category)[0]}
                  alt={`Category ${index + 1}`}
                  boxSize={{ base: "35px", sm: "40px", md: "50px" }}
                  objectFit="contain"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                  fallback={null}
                />
              )}
              <Box 
                w="100%" 
                px={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
                minH={{ base: "35px", sm: "40px", md: "45px" }}
              >
                <Text 
                  fontWeight="600"
                  fontSize={{ base: "3xs", sm: "xs", md: "sm" }}
                  color="white"
                  textAlign="center"
                  lineHeight="1"
                  w="100%"
                  textTransform="uppercase"
                  textShadow="0 2px 4px rgba(0,0,0,0.2)"
                  noOfLines={4}
                >
                  {formatCategoryText(category)}
                </Text>
              </Box>
            </VStack>
          </GridItem>
        ))}
      </Grid>

      {showWrong && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={10}
          textAlign="center"
          animation={`${messageAnimation} 0.8s ease-in-out forwards`}
          bg="rgba(0, 0, 0, 0.85)"
          px={6}
          py={3}
          borderRadius="xl"
          border="2px solid #ef4444"
          boxShadow="0 0 30px rgba(239, 68, 68, 0.5)"
          onAnimationEnd={handleAnimationEnd}
        >
          <VStack spacing={0}>
            <Text
              fontSize="5xl"
              fontWeight="900"
              color="red.500"
              textShadow="2px 2px 4px rgba(0,0,0,0.5)"
              letterSpacing="wider"
              textTransform="uppercase"
              lineHeight="1"
            >
              Wrong!
            </Text>
            <Text
              fontSize="lg"
              fontWeight="600"
              color="red.500"
              textShadow="1px 1px 2px rgba(0,0,0,0.5)"
            >
              -1 Player
            </Text>
          </VStack>
        </Box>
      )}

      {showSkipMessage && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={10}
          textAlign="center"
          animation={`${messageAnimation} 0.8s ease-in-out forwards`}
          bg="rgba(0, 0, 0, 0.85)"
          px={6}
          py={3}
          borderRadius="xl"
          border="2px solid #ECC94B"
          boxShadow="0 0 30px rgba(236, 201, 75, 0.5)"
          onAnimationEnd={handleAnimationEnd}
        >
          <VStack spacing={0}>
            <Text
              fontSize="5xl"
              fontWeight="900"
              color="yellow.400"
              textShadow="2px 2px 4px rgba(0,0,0,0.5)"
              letterSpacing="wider"
              textTransform="uppercase"
              lineHeight="1"
            >
              Skip!
            </Text>
            <Text
              fontSize="lg"
              fontWeight="600"
              color="yellow.400"
              textShadow="1px 1px 2px rgba(0,0,0,0.5)"
            >
              Next Player
            </Text>
          </VStack>
        </Box>
      )}
    </Box>
  )
}

export default BingoBoard
