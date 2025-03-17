import { Grid, GridItem, Text, HStack, Image, VStack, useColorModeValue, Box } from '@chakra-ui/react'
import { useEffect } from 'react'

function BingoBoard({ selectedCells, onCellSelect, validSelections = [], currentInvalidSelection = null, categories = [], wildcardMatches = [] }) {
  useEffect(() => {
    console.log('Checking cell:', currentInvalidSelection, 'Wildcard matches:', wildcardMatches)
  }, [currentInvalidSelection, wildcardMatches])

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
    <Grid
      templateColumns="repeat(4, 1fr)"
      gap={1}
      w="100%"
      maxW="550px"
      mx="auto"
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
  )
}

export default BingoBoard
