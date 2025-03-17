import { Container, VStack, Heading, Text, Button, SimpleGrid, Box, Image, Icon, HStack } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { FaDice, FaUserSecret, FaArrowRight } from 'react-icons/fa'

function HomePage() {
  const navigate = useNavigate()

  const games = [
    {
      title: "Bingo",
      description: "Testeaza-ti cunostintele despre fotbal potrivind jucatorii cu realizarile lor!",
      image: "/images/bingo game.jpg",
      icon: FaDice,
      path: "/bingo",
      gradient: "linear(to-r, yellow.400, orange.400)"
    },
    {
      title: "Ghiceste Jucatorul",
      description: "Poti ghici jucatorul misterios? Foloseste indiciile pentru a identifica cine se ascunde in umbra!",
      image: "/images/ghiceste.webp",
      icon: FaUserSecret,
      path: "/ghiceste-jucatorul",
      gradient: "linear(to-r, purple.400, blue.400)"
    }
  ]

  return (
    <Box 
      py={{ base: 4, md: 24 }}
      borderRadius={{ base: 0, md: "xl" }}
    >
      <Container 
        maxW="1200px" 
        px={{ base: 0, md: 6 }}
        borderRadius={{ base: 0, md: "xl" }}
      >
        <VStack spacing={{ base: 8, md: 12 }} px={{ base: 4, md: 0 }} align="center">
          {/* Hero Section */}
          <VStack spacing={6} textAlign="center" px={{ base: 4, md: 0 }}>
            <Heading 
              as="h1" 
              size="2xl" 
              bgGradient="linear(to-r, yellow.400, orange.400)"
              bgClip="text"
              letterSpacing="tight"
              fontWeight="extrabold"
            >
              Jocuri Fotbal Comedie
            </Heading>
          </VStack>

          {/* Games Grid */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} w="full">
            {games.map((game, index) => (
              <Box
                key={index}
                bg="blackAlpha.400"
                borderRadius="2xl"
                overflow="hidden"
                transition="all 0.3s"
                position="relative"
                _hover={{
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 24px -10px rgba(0, 0, 0, 0.7)`,
                }}
              >
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  h="4px"
                  bgGradient={game.gradient}
                />
                <Image
                  src={game.image}
                  alt={game.title}
                  h="240px"
                  w="full"
                  objectFit="cover"
                />
                <Box p={8}>
                  <HStack spacing={4} mb={4}>
                    <Icon as={game.icon} boxSize={6} color="yellow.400" />
                    <Heading size="lg" color="whiteAlpha.900">
                      {game.title}
                    </Heading>
                  </HStack>
                  <Text color="whiteAlpha.800" mb={6} fontSize="lg">
                    {game.description}
                  </Text>
                  <Button
                    rightIcon={<FaArrowRight />}
                    onClick={() => navigate(game.path)}
                    colorScheme="yellow"
                    size="lg"
                    width="full"
                    _hover={{
                      bg: 'yellow.400',
                      color: 'black',
                      transform: 'translateY(-2px)'
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