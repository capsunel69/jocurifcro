import { Box, Container, VStack, Heading, Text, Button } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { FaHome, FaFutbol } from 'react-icons/fa'
import { keyframes } from '@emotion/react'

function NotFoundPage() {
  const navigate = useNavigate()

  const bounce = keyframes`
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  `

  const roll = keyframes`
    0% { transform: translateX(-50px) rotate(0deg); }
    50% { transform: translateX(50px) rotate(360deg); }
    100% { transform: translateX(-50px) rotate(0deg); }
  `

  return (
    <Box 
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Container 
        maxW="600px" 
        textAlign="center" 
        mt={{ base: 0, md: 20 }}
        p={{ base: 4, md: 8 }}
        py={{ base: 12, md: 16 }}
        borderRadius={{ base: 0, md: 'md' }}
      >
        <VStack spacing={8}>
          <Box position="relative">
            <Box animation={`${bounce} 2s ease-in-out infinite`}>
              <Heading 
                size="4xl" 
                bgGradient="linear(to-r, yellow.400, red.500)"
                bgClip="text"
                fontWeight="extrabold"
              >
                404
              </Heading>
            </Box>
            <Box
              position="absolute"
              bottom="-10px"
              left="50%"
              transform="translateX(-50%)"
              animation={`${roll} 3s ease-in-out infinite`}
              color="white"
              fontSize="3xl"
            >
              <FaFutbol />
            </Box>
          </Box>
          
          <Text 
            fontSize="xl" 
            color="whiteAlpha.800"
          >
            Oops! Se pare că te-ai rătăcit pe teren...
          </Text>

          <Button
            leftIcon={<FaHome />}
            onClick={() => navigate('/')}
            size="lg"
            colorScheme="yellow"
            _hover={{
              transform: 'scale(1.05)',
              bg: 'yellow.400',
              color: 'black'
            }}
            transition="all 0.3s"
          >
            Înapoi Acasă
          </Button>
        </VStack>
      </Container>
    </Box>
  )
}

export default NotFoundPage