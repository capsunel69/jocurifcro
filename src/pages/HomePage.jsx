import { Container, VStack, Heading, Text, Button, SimpleGrid, Box, Image, Icon, HStack } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { FaDice, FaUserSecret, FaArrowRight } from 'react-icons/fa'

function HomePage() {
  const navigate = useNavigate()

  const games = [
    {
      title: "Bingo",
      description: "Testeaza-ti cunostintele despre fotbal potrivind jucatorii cu realizarile lor in acest joc captivant de bingo!",
      image: "/images/bingo image.webp", // Add this image to your public folder
      icon: FaDice,
      path: "/bingo"
    },
    {
      title: "Ghiceste Jucatorul",
      description: "Poti ghici jucatorul misterios? Foloseste indiciile pentru a identifica cine se ascunde in umbra!",
      image: "/images/ghiceste.webp", // Add this image to your public folder
      icon: FaUserSecret,
      path: "/ghiceste-jucatorul"
    }
  ]

  return (
    <Box 
      py={{ base: 0, md: 24 }}
      borderRadius={{ base: 0, md: "xl" }}
    >
      <Container 
        maxW="1200px" 
        px={{ base: 0, md: 6 }}
        borderRadius={{ base: 0, md: "xl" }}
      >
        <VStack spacing={{ base: 8, md: 16 }} px={{ base: 4, md: 0 }} align="center">
          {/* Hero Section */}
          <VStack spacing={4} textAlign="center" px={{ base: 4, md: 0 }}>
            <Heading 
              as="h1" 
              size="2xl" 
              bgGradient="linear(to-r, yellow.400, orange.400)"
              bgClip="text"
              letterSpacing="tight"
            >
              Jocuri Fotbal Comedie
            </Heading>
            <Text 
              fontSize="xl" 
              color="whiteAlpha.900" 
              maxW="2xl"
            >
              Exploreaza colectia noastra de jocuri cu tematica fotbalistica, 
              create sa-ti testeze cunostintele si sa-ti provoace expertiza in fotbal.
            </Text>
          </VStack>

          {/* Games Grid */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} w="full">
            {games.map((game, index) => (
              <Box
                key={index}
                bg="whiteAlpha.50"
                borderRadius={{ base: 0, md: "xl" }}
                overflow="hidden"
                transition="all 0.3s"
                _hover={{
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.5)',
                }}
              >
                <Image
                  src={game.image}
                  alt={game.title}
                  h="200px"
                  w="full"
                  objectFit="cover"
                  filter="brightness(0.8)"
                />
                <Box p={6}>
                  <HStack spacing={3} mb={3}>
                    <Icon as={game.icon} boxSize={5} color="yellow.400" />
                    <Heading size="md" color="whiteAlpha.900">
                      {game.title}
                    </Heading>
                  </HStack>
                  <Text color="whiteAlpha.800" mb={4}>
                    {game.description}
                  </Text>
                  <Button
                    rightIcon={<FaArrowRight />}
                    onClick={() => navigate(game.path)}
                    colorScheme="yellow"
                    variant="outline"
                    _hover={{
                      bg: 'yellow.400',
                      color: 'black'
                    }}
                  >
                    Joacă Acum
                  </Button>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  )
}

export default HomePage 