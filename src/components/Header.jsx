import { Box, Flex, Image, Spacer, Link, Text, IconButton, useDisclosure, Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton, Stack } from '@chakra-ui/react'
import { FaDice, FaUserSecret, FaHome, FaBars } from 'react-icons/fa'

const Header = () => {
    const { isOpen, onOpen, onClose } = useDisclosure()
    
    const menuItems = [
        { href: '/bingo', icon: FaDice, text: 'Bingo' },
        { href: '/ghiceste-jucatorul', icon: FaUserSecret, text: 'Ghiceste Jucatorul' },
        { href: 'https://fotbal-comedie.ro', icon: FaHome, text: 'Back to main website' }
    ]

    return (
        <Box 
            as="header" 
            bg="#000212" 
            borderBottom="1px solid" 
            borderColor="whiteAlpha.100"
            position="sticky"
            top={0}
            zIndex={1000}
            backdropFilter="blur(10px)"
        >
            <Flex 
                align="center" 
                maxW="1200px" 
                mx="auto" 
                px={6} 
                py={3}
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
                            salut@fotbal-comedie.ro
                        </Text>
                    </Box>
                </Link>
                <Spacer />
                {/* Desktop Menu */}
                <Flex gap={3} display={{ base: 'none', md: 'flex' }}>
                    {menuItems.map((item, index) => (
                        <Link 
                            key={index}
                            href={item.href}
                            display="flex"
                            alignItems="center"
                            gap={2}
                            px={4}
                            py={2.5}
                            borderRadius="lg"
                            color="whiteAlpha.900"
                            fontSize="sm"
                            fontWeight="500"
                            transition="all 0.2s"
                            position="relative"
                            _hover={{ 
                                color: 'yellow.400',
                                bg: 'whiteAlpha.100',
                                transform: 'translateY(-2px)'
                            }}
                            _active={{
                                transform: 'translateY(0)',
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
                    <DrawerOverlay />
                    <DrawerContent bg="#000212">
                        <DrawerCloseButton color="white" />
                        <DrawerHeader borderBottomWidth="1px" borderColor="whiteAlpha.100">
                            <Text color="white">Menu</Text>
                        </DrawerHeader>
                        <DrawerBody>
                            <Stack spacing={4} mt={4}>
                                {menuItems.map((item, index) => (
                                    <Link
                                        key={index}
                                        href={item.href}
                                        display="flex"
                                        alignItems="center"
                                        gap={2}
                                        px={4}
                                        py={2.5}
                                        borderRadius="lg"
                                        color="whiteAlpha.900"
                                        fontSize="sm"
                                        fontWeight="500"
                                        transition="all 0.2s"
                                        _hover={{ 
                                            color: 'yellow.400',
                                            bg: 'whiteAlpha.100',
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