import { useState } from 'react'
import { Container, VStack, Heading, Text, Button, SimpleGrid, Box, Image, Icon, HStack, Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { FaFutbol, FaPlay } from 'react-icons/fa'

function JoculGoleadorilor() {
  const [isVideoOpen, setIsVideoOpen] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
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
        >
          {/* Hero Section */}
          <VStack spacing={2} textAlign="center" px={{ base: 4, md: 0 }}>
            <Heading
              fontSize={{ base: "2xl", md: "3xl" }}
              color="whiteAlpha.900"
              fontWeight="bold"
            >
              CINE ESTE JUCATORUL DIN CLIP?
            </Heading>

            {/* Video Thumbnail/Button */}
            <Box
              as="button"
              onClick={() => setIsVideoOpen(true)}
              position="relative"
              width="100%"
              maxW="560px"
              cursor="pointer"
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.02)' }}
            >
              <img 
                src={`https://img.youtube.com/vi/Ka2OzelzBqM/maxresdefault.jpg`}
                alt="Video Thumbnail"
                style={{ width: '100%', borderRadius: '12px' }}
              />
              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                bg="rgba(0, 0, 0, 0.7)"
                borderRadius="full"
                width="64px"
                height="64px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                transition="all 0.2s"
                _hover={{ bg: 'red.500', transform: 'translate(-50%, -50%) scale(1.1)' }}
              >
                <Icon as={FaPlay} w={6} h={6} color="white" ml={1} />
              </Box>
            </Box>

            <Text 
              fontSize="xl" 
              color="whiteAlpha.900" 
              maxW="2xl"
            >
              Alege o varianta dupa ce ai vazut clipul.
            </Text>

            {/* Poll Buttons or Result */}
            {!hasVoted ? (
              <VStack spacing={3} w="full" maxW="md">
                <Button colorScheme="blue" size="lg" w="full" onClick={() => setHasVoted(true)}>
                  DARIUS OLARU
                </Button>
                <Button colorScheme="blue" size="lg" w="full" onClick={() => setHasVoted(true)}>
                  FEDERICO VALVERDE
                </Button>
                <Button colorScheme="blue" size="lg" w="full" onClick={() => setHasVoted(true)}>
                  FLORINEL COMAN
                </Button>
              </VStack>
            ) : (
              <VStack 
                spacing={6} 
                bg="whiteAlpha.100" 
                p={6} 
                borderRadius="xl" 
                w="full" 
                maxW="600px"
                mt={4}
              >
                <Text 
                  color="whiteAlpha.800" 
                  fontSize={{ base: "md", md: "lg" }}
                >
                  Daca ai votat Valverde, felicitari. Daca ai votat Olaru sau Florinel… e cazul sa te mai uiti la fotbal.
                </Text>
                <Text 
                  color="whiteAlpha.800" 
                  fontSize={{ base: "md", md: "lg" }}
                >
                  Daca vrei sa-ti testezi in continuare cunostintele pe goluri si goale, te invit sa incerci{' '}
                  <Text as="span" fontWeight="bold" color="whiteAlpha.900">
                    JOCUL GOLEADORILOR
                  </Text>
                  .
                </Text>
                <Text 
                  color="whiteAlpha.800" 
                  fontSize={{ base: "md", md: "lg" }}
                >
                  Cum ajungi la el? E simplu, baga e-mailul mai jos si poti castiga premii "spectaculoase".
                </Text>

                {/* Newsletter iframe */}
                <Box w="full" maxW="600px" mt={2}>
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
            )}
          </VStack>

          {/* Video Modal */}
          <Modal 
            isOpen={isVideoOpen} 
            onClose={() => setIsVideoOpen(false)} 
            size="xl"
            isCentered
          >
            <ModalOverlay backdropFilter="blur(4px)" />
            <ModalContent bg="transparent" boxShadow="none" mx={4}>
              <ModalCloseButton 
                color="white" 
                bg="blackAlpha.600" 
                borderRadius="full"
                _hover={{ bg: 'blackAlpha.700' }}
              />
              <ModalBody p={0}>
                <Box borderRadius="xl" overflow="hidden">
                  <iframe
                    width="100%"
                    height="315"
                    src="https://www.youtube.com/embed/Ka2OzelzBqM?autoplay=1"
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </Box>
              </ModalBody>
            </ModalContent>
          </Modal>
        </VStack>
      </Container>
    </Box>
  )
}

export default JoculGoleadorilor 