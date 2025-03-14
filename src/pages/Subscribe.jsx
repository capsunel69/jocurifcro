import { useState } from 'react'
import { Container, VStack, Heading, Text, Button, SimpleGrid, Box, Image, Icon, HStack } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

function Subscribe() {
  const [iframeLoaded, setIframeLoaded] = useState(false)

  return (
    <Box 
      py={{ base: 0, md: 24 }}
      borderRadius={{ base: 0, md: "xl" }}
      minH={{ base: "100vh", md: "auto" }}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Container 
        maxW="1200px" 
        px={{ base: 0, md: 6 }}
        borderRadius={{ base: 0, md: "xl" }}
        h={{ base: "100vh", md: "auto" }}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack 
          spacing={{ base: 4, md: 8 }} 
          px={{ base: 4, md: 0 }} 
          align="center" 
          justify="center"
          mt={{ base: "-200px", md: 0 }}
        >
          {/* Hero Section */}
          <VStack spacing={2} textAlign="center" px={{ base: 4, md: 0 }}>
            <Image 
              src="/images/header-mail.png" 
              alt="Newsletter Header" 
              maxW={{ base: "280px", md: "320px" }}
              h="auto" 
            />
            <Text 
              fontSize="xl" 
              color="whiteAlpha.900" 
              maxW="2xl"
            >
              Daca apreciezi clipurile noastre, da un subscribe newsletter-ului Hentz cu Mana!
            </Text>
          </VStack>

          {/* Newsletter iframe */}
          <Box w="full" maxW="600px">
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
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}

export default Subscribe 