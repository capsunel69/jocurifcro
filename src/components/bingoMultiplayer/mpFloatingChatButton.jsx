import { Button, Box, Circle } from '@chakra-ui/react'
import { FaComments } from 'react-icons/fa'

function MpFloatingChatButton({ unreadCount = 0, onClick }) {
  return (
    <Box
      position="fixed"
      top="80px"
      right="20px"
      zIndex={9999}
      display={{ base: 'block', lg: 'none' }}
    >
      <Button
        borderRadius="full"
        width="50px"
        height="50px"
        bg="blue.500"
        color="white"
        _hover={{ bg: 'blue.600' }}
        onClick={onClick}
        alignItems="center"
        justifyContent="center"
        boxShadow="xl"
        position="relative"
      >
        <Box position="relative">
          <FaComments size="20px" />
          {unreadCount > 0 && (
            <Circle
              size="20px"
              bg="red.500"
              color="white"
              position="absolute"
              top="-8px"
              right="-8px"
              fontSize="xs"
              fontWeight="bold"
              boxShadow="0 2px 4px rgba(0,0,0,0.2)"
            >
              {unreadCount}
            </Circle>
          )}
        </Box>
      </Button>
    </Box>
  )
}

export default MpFloatingChatButton 