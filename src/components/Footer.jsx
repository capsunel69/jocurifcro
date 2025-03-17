import { Box, Text, Flex, Link, Icon } from '@chakra-ui/react'
import { FaTiktok, FaYoutube, FaInstagram } from 'react-icons/fa'

const Footer = () => {
  return (
    <Box 
      as="footer" 
      bg="#000212" 
      color="white" 
      py={12}
      borderTop="1px solid rgba(255,255,255,0.1)"
    >
      <Flex 
        direction={{ base: 'column', md: 'row' }}
        maxW="1200px"
        mx="auto"
        px={6}
        gap={12}
        align={{ base: 'center', md: 'flex-start' }}
        justify="space-between"
      >
        {/* Column 1 */}
        <Box textAlign={{ base: 'center', md: 'left' }} flex="1">
          <Text 
            fontSize="xl" 
            fontWeight="bold" 
            mb={4}
            color="yellow.400"
          >
            Daca fotbal nu vedem, hai macar sa radem.
          </Text>
          <Text color="whiteAlpha.800">&copy; {new Date().getFullYear()} Jocuri Fotbal Comedie.</Text>
        </Box>

        {/* Column 2 */}
        <Box textAlign={{ base: 'center', md: 'left' }} flex="1">
          <Text 
            fontSize="lg" 
            fontWeight="bold" 
            mb={4}
            textTransform="uppercase"
            letterSpacing="wide"
          >
            Contact
          </Text>
          <Text mb={6} color="whiteAlpha.800">hentzcumana@gmail.com</Text>
          <Flex gap={6} justify={{ base: 'center', md: 'flex-start' }}>
            <Link 
              href="https://www.youtube.com/channel/UCweuWrcNBSKT01d2p_RuLvA" 
              target="_blank" 
              _hover={{ color: 'yellow.400', transform: 'scale(1.1)' }}
              transition="all 0.2s"
            >
              <Icon as={FaYoutube} w={7} h={7} />
            </Link>
            <Link 
              href="https://www.tiktok.com/@fotbal.pe.comedie" 
              target="_blank" 
              _hover={{ color: 'yellow.400', transform: 'scale(1.1)' }}
              transition="all 0.2s"
            >
              <Icon as={FaTiktok} w={6} h={6} />
            </Link>
            <Link 
              href="https://www.instagram.com/fotbalpecomedie/" 
              target="_blank" 
              _hover={{ color: 'yellow.400', transform: 'scale(1.1)' }}
              transition="all 0.2s"
            >
              <Icon as={FaInstagram} w={7} h={7} />
            </Link>
          </Flex>
        </Box>

        {/* Column 3 */}
        <Box textAlign={{ base: 'center', md: 'left' }} flex="1">
          <Text 
            fontSize="lg" 
            fontWeight="bold" 
            mb={4}
            textTransform="uppercase"
            letterSpacing="wide"
          >
            Jocuri
          </Text>
          <Link 
            href="/bingo" 
            display="block" 
            mb={3} 
            _hover={{ color: 'yellow.400', paddingLeft: '2px' }}
            transition="all 0.2s"
            color="whiteAlpha.800"
          >
            Bingo Fotbal
          </Link>
          <Link 
            href="/ghiceste-jucatorul" 
            display="block" 
            mb={3} 
            _hover={{ color: 'yellow.400', paddingLeft: '2px' }}
            transition="all 0.2s"
            color="whiteAlpha.800"
          >
            Ghiceste Jucatorul
          </Link>
        </Box>
      </Flex>
    </Box>
  )
}

export default Footer 