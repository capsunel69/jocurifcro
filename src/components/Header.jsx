import { Box, Flex, Image, Spacer, Link, Text, IconButton, useDisclosure, Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton, Stack } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { FaDice, FaUserSecret, FaEnvelope, FaBars, FaNetworkWired } from 'react-icons/fa'
import { useLocation } from 'react-router-dom'

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`

const Header = () => {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const location = useLocation()
    
    const menuItems = [
        { href: '/bingo', icon: FaDice, text: 'Bingo' },
        { href: '/multiplayer-bingo', icon: FaNetworkWired, text: 'Multiplayer Bingo' },
        { href: '/ghiceste-jucatorul', icon: FaUserSecret, text: 'Ghiceste Jucatorul' },
        { href: '/subscribe', icon: FaEnvelope, text: 'Aboneaza-te' }
    ]

    return (
        <Box 
            as="header" 
            bg="linear-gradient(to right, #000212, #0A0A1B)"
            borderBottom="1px solid" 
            borderColor="whiteAlpha.100"
            position="sticky"
            top={0}
            zIndex={1000}
            backdropFilter="blur(12px)"
            boxShadow="0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            animation={`${fadeIn} 0.3s ease-in-out`}
        >
            <Flex 
                align="center" 
                maxW="1200px" 
                mx="auto" 
                px={{ base: 4, md: 6 }}
                py={4}
            >
                <Link 
                    href="/" 
                    display="flex" 
                    alignItems="center" 
                    textDecoration="none" 
                    _hover={{ 
                        textDecoration: 'none',
                        transform: 'translateY(-1px)',
                    }}
                    transition="transform 0.2s"
                >
                    <Image 
                        src="/fpc.png" 
                        alt="Bingo Logo" 
                        h="40px" 
                        transition="transform 0.2s"
                        _hover={{ transform: 'scale(1.05)' }}
                    />
                    <Box ml={4} color="white">
                        <Text 
                            fontSize="xl" 
                            fontFamily="'Russo One', sans-serif"
                            letterSpacing="wide"
                        >
                            Jocuri Fotbal Comedie
                        </Text>
                        <Text 
                            fontSize="xs" 
                            color="gray.400"
                            mt={0.5}
                        >
                            hentzcumana@gmail.com
                        </Text>
                    </Box>
                </Link>
                <Spacer />
                {/* Desktop Menu */}
                <Flex gap={4} display={{ base: 'none', md: 'flex' }}>
                    {menuItems.map((item, index) => (
                        <Link 
                            key={index}
                            href={item.disabled ? '#' : item.href}
                            display="flex"
                            alignItems="center"
                            gap={2}
                            px={4}
                            py={2.5}
                            borderRadius="xl"
                            color={item.disabled ? "gray.500" : (location.pathname === item.href ? "yellow.400" : "whiteAlpha.900")}
                            fontSize="sm"
                            fontWeight="500"
                            transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                            position="relative"
                            cursor={item.disabled ? "not-allowed" : "pointer"}
                            opacity={item.disabled ? 0.6 : 1}
                            _before={{
                                content: '""',
                                position: 'absolute',
                                bottom: '-2px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: location.pathname === item.href ? '80%' : '0%',
                                height: '2px',
                                bg: 'yellow.400',
                                transition: 'all 0.3s',
                            }}
                            _hover={{ 
                                color: item.disabled ? "gray.500" : 'yellow.400',
                                bg: item.disabled ? "transparent" : 'whiteAlpha.200',
                                transform: item.disabled ? "none" : 'translateY(-2px)',
                                _before: {
                                    width: item.disabled ? '0%' : '80%',
                                }
                            }}
                        >
                            <item.icon size={18} />
                            {item.text}
                        </Link>
                    ))}
                </Flex>
                
                {/* Mobile Menu Button */}
                <IconButton
                    display={{ base: 'flex', md: 'none' }}
                    icon={<FaBars />}
                    variant="ghost"
                    color="white"
                    onClick={onOpen}
                    aria-label="Open menu"
                    _hover={{ bg: 'whiteAlpha.100' }}
                />

                {/* Mobile Drawer */}
                <Drawer isOpen={isOpen} onClose={onClose} placement="right">
                    <DrawerOverlay backdropFilter="blur(8px)" />
                    <DrawerContent 
                        bg="linear-gradient(to bottom, #000212, #0A0A1B)"
                        boxShadow="dark-lg"
                    >
                        <DrawerCloseButton color="white" />
                        <DrawerHeader borderBottomWidth="1px" borderColor="whiteAlpha.100">
                            <Text color="white">Menu</Text>
                        </DrawerHeader>
                        <DrawerBody>
                            <Stack spacing={4} mt={4}>
                                {menuItems.map((item, index) => (
                                    <Link
                                        key={index}
                                        href={item.disabled ? '#' : item.href}
                                        display="flex"
                                        alignItems="center"
                                        gap={2}
                                        px={4}
                                        py={2.5}
                                        borderRadius="lg"
                                        color={item.disabled ? "gray.500" : (location.pathname === item.href ? "yellow.400" : "whiteAlpha.900")}
                                        bg={location.pathname === item.href ? "whiteAlpha.100" : "transparent"}
                                        fontSize="sm"
                                        fontWeight="500"
                                        transition="all 0.2s"
                                        cursor={item.disabled ? "not-allowed" : "pointer"}
                                        opacity={item.disabled ? 0.6 : 1}
                                        _hover={{ 
                                            color: item.disabled ? "gray.500" : 'yellow.400',
                                            bg: item.disabled ? "transparent" : 'whiteAlpha.100',
                                        }}
                                        onClick={onClose}
                                    >
                                        <item.icon size={18} />
                                        {item.text}
                                    </Link>
                                ))}
                            </Stack>
                        </DrawerBody>
                    </DrawerContent>
                </Drawer>
            </Flex>
        </Box>
    )
}

export default Header 