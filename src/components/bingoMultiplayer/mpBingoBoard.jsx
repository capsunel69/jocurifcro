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

function mpBingoBoard({ selectedCells, onCellSelect, validSelections = [], currentInvalidSelection = null, categories = [], wildcardMatches = [], showSkip = false, isDisabled, currentPlayer }) {
  const [showWrong, setShowWrong] = useState(false)
  const [showSkipMessage, setShowSkipMessage] = useState(false)
  const [showCheatHighlight, setShowCheatHighlight] = useState(false)

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

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'F6') {
        setShowCheatHighlight(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const handleAnimationEnd = () => {
    setShowWrong(false)
    setShowSkipMessage(false)
  }

  const isPotentialMatch = (categoryId) => {
    if (!currentPlayer || !categories[categoryId]) return false
    
    return categories[categoryId].originalData.every(requirement => 
      currentPlayer.v.some(achievementId => requirement.id === achievementId)
    )
  }

  const getCellBackground = (categoryId, index) => {
    if (wildcardMatches.includes(categoryId)) {
      return '#FFD700'
    }
    if (validSelections.includes(categoryId)) {
      return '#22c55e'
    }
    if (categoryId === currentInvalidSelection) return '#ef4444'
    if (selectedCells.includes(categoryId)) return 'brand.100'
    if (showCheatHighlight && isPotentialMatch(categoryId)) {
      return '#9333ea'
    }
    
    const row = Math.floor(index / 4)
    const col = index % 4
    return (row + col) % 2 === 0 ? '#0f172a' : '#1e293b'
  }

  const getCellBoxShadow = (categoryId) => {
    if (wildcardMatches.includes(categoryId)) {
      return '0 0 20px rgba(255, 215, 0, 0.5)'
    }
    if (validSelections.includes(categoryId)) {
      return '0 0 20px rgba(0, 184, 148, 0.5)'
    }
    if (categoryId === currentInvalidSelection) return '0 0 20px rgba(225, 112, 85, 0.5)'
    return '0 4px 12px rgba(0, 0, 0, 0.2)'
  }

  const isCellDisabled = (categoryId) => {
    return validSelections.includes(categoryId)
  }

  const formatCategoryText = (category) => {
    if (!category || !category.originalData) return 'Loading...'
    
    const items = Array.isArray(category.originalData) ? category.originalData : [category.originalData]
    const firstItem = items[0]
    
    switch (firstItem.type) {
      case 1: // Country
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
    return category.originalData.map(item => `/images/${item.id}.webp`)
  }

  return (
    <Box position="relative">
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
            onClick={() => !isDisabled && !isCellDisabled(index) && onCellSelect(index)}
            cursor={isDisabled ? 'not-allowed' : isCellDisabled(index) ? 'default' : 'pointer'}
            p={2}
            bg={getCellBackground(index, index)}
            transition="all 0.3s ease"
            borderRadius="md"
            boxShadow={getCellBoxShadow(index)}
            position="relative"
            _hover={{
              transform: !isDisabled && !isCellDisabled(index) && 'translateY(-2px)',
              bg: isDisabled ? getCellBackground(index, index) : isCellDisabled(index) 
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
              {category.originalData && category.originalData.length > 1 ? (
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
              <Text 
                fontSize={{ base: "3xs", sm: "xs", md: "sm" }}
                color="white"
                textAlign="center"
                fontWeight="600"
                noOfLines={4}
                textTransform="uppercase"
                textShadow="0 2px 4px rgba(0,0,0,0.2)"
              >
                {formatCategoryText(category)}
              </Text>
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
          animation={`${wrongMessageAnimation} 0.8s ease-in-out forwards`}
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
              -2 Players
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
              -1 Player
            </Text>
          </VStack>
        </Box>
      )}
    </Box>
  )
}

export default mpBingoBoard
