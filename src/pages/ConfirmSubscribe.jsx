import { useState } from 'react'
import { Container, VStack, Heading, Text, Button, SimpleGrid, Box, Image, Icon, HStack } from '@chakra-ui/react'
import { FaFutbol } from 'react-icons/fa'

function ConfirmSubscribe() {
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
            <Heading
              fontSize={{ base: "2xl", md: "3xl" }}
              color="whiteAlpha.900"
              fontWeight="bold"
            >
              VERIFICA-TI MAILUL IN CATEVA MINUTE
            </Heading>
            <Text 
              fontSize="xl" 
              color="whiteAlpha.900" 
              maxW="2xl"
            >
              Vei primi o surpriza. Pana atunci, afla mai multe despre Jocul Goleadorilor apasand butonul de mai jos.
            </Text>
            <Button
              size="lg"
              colorScheme="yellow"
              leftIcon={<Icon as={FaFutbol} />}
              mt={4}
              onClick={() => window.location.href = '/jocul-goleadorilor'}
            >
              JOCUL GOLEADORILOR
            </Button>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}

export default ConfirmSubscribe 