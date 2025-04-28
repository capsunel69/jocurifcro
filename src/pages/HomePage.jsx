import { Container, VStack, Heading, Text, Button, SimpleGrid, Box, Image, Icon, HStack } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { FaDice, FaUserSecret, FaArrowRight, FaTrophy } from 'react-icons/fa'

// New GameCard component
const GameCard = ({ game, onPlay, priority }) => (
  <Box
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
      loading={priority ? "eager" : "lazy"}
      sizes="(max-width: 768px) 100vw, 50vw"
      width="100%"
      height={240}
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
        onClick={() => onPlay(game.path)}
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
)

function HomePage() {
  const navigate = useNavigate()

  const games = [
    {
      title: "Bingo Multiplayer",
      description: "Accepta provocarea si joaca Bingo alaturi de prieteni intr-o experienta multiplayer captivanta si amuzanta!",
      image: "/images/bingo-multiplayer.webp",
      width: 400,
      height: 240,
      icon: FaDice,
      path: "/multiplayer-bingo",
      gradient: "linear(to-r, green.400, teal.400)"
    },
    {
      title: "Bingo",
      description: "Ghiceste fotbalistii legendari si actuali intr-un joc captivant de bingo care iti pune la incercare cunostintele despre fotbal!",
      image: "/images/bingo game.webp",
      icon: FaDice,
      path: "/bingo",
      gradient: "linear(to-r, yellow.400, orange.400)"
    },
    {
      title: "Ghiceste Jucatorul - Liga I",
      description: "Porneste intr-o aventura plina de mister si descopera identitatea fotbalistului ascuns folosind indiciile disponibile!",
      image: "/images/ghiceste.webp",
      icon: FaUserSecret,
      path: "/ghiceste-jucatorul",
      gradient: "linear(to-r, purple.400, blue.400)"
    },
    {
      title: "Ghiceste Jucatorul - Top 5 Ligi",
      description: "Ghiceste fotbalistii din cele mai importante ligi europene intr-un joc captivant care iti pune la incercare cunostintele despre fotbal!",
      image: "/images/top-5.webp",
      icon: FaTrophy,
      path: "/top-5",
      gradient: "linear(to-r, red.400, pink.400)"
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

          {/* Updated Games Grid */}
          <SimpleGrid 
            columns={{ base: 1, lg: 2 }} 
            spacing={8} 
            w="full"
            px={{ base: 4, md: 8 }}
            maxW="1200px"
            mx="auto"
          >
            {games.map((game, index) => (
              <GameCard 
                key={index}
                game={game}
                onPlay={navigate}
                priority={index === 0}
              />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  )
}

export default HomePage 