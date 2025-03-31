import { useEffect, useState, useRef } from 'react'
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Flex,
  IconButton,
  Collapse,
  useDisclosure
} from '@chakra-ui/react'
import { FaChevronUp, FaChevronDown } from 'react-icons/fa'

function MpChat({ roomId, playerName, pusherChannel, variant = 'floating' }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef(null)
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true })
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    // Subscribe to chat messages
    if (pusherChannel) {
      pusherChannel.bind('chat-message', (data) => {
        setMessages(prev => [...prev, data])
      })
    }

    return () => {
      if (pusherChannel) {
        pusherChannel.unbind('chat-message')
      }
    }
  }, [pusherChannel])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName,
          message: inputMessage.trim()
        })
      })
      setInputMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  if (variant === 'embedded') {
    return (
      <Box h="full">
        <Flex
          direction="column"
          h="full"
        >
          {/* Chat Header */}
          <Flex
            p={2}
            bg="whiteAlpha.100"
            borderTopRadius="lg"
            justify="space-between"
            align="center"
          >
            <Text fontWeight="bold" color="white">Room Chat</Text>
          </Flex>

          {/* Chat Messages */}
          <Box
            flex="1"
            overflowY="auto"
            p={3}
            css={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
              },
            }}
          >
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                mb={2}
                alignSelf={msg.playerName === playerName ? 'flex-end' : 'flex-start'}
              >
                <Text
                  fontSize="xs"
                  color="gray.400"
                  mb={1}
                >
                  {msg.playerName}
                </Text>
                <Box
                  bg={msg.playerName === playerName ? 'blue.500' : 'whiteAlpha.200'}
                  color="white"
                  px={3}
                  py={2}
                  borderRadius="lg"
                  maxW="80%"
                >
                  <Text fontSize="sm">{msg.message}</Text>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          {/* Chat Input */}
          <Flex p={2} bg="whiteAlpha.50">
            <Input
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              bg="whiteAlpha.100"
              border="none"
              color="white"
              _placeholder={{ color: 'whiteAlpha.500' }}
              mr={2}
            />
            <Button
              onClick={handleSendMessage}
              colorScheme="blue"
              size="sm"
            >
              Send
            </Button>
          </Flex>
        </Flex>
      </Box>
    )
  }

  // Return the original floating chat UI for other variants
  return (
    <Box
      position="fixed"
      bottom={0}
      right={4}
      width="300px"
      bg="gray.900"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      boxShadow="lg"
      zIndex={100}
    >
      {/* Chat Header */}
      <Flex
        p={2}
        bg="whiteAlpha.100"
        borderTopRadius="lg"
        justify="space-between"
        align="center"
        cursor="pointer"
        onClick={onToggle}
      >
        <Text fontWeight="bold" color="white">Chat Room</Text>
        <IconButton
          icon={isOpen ? <FaChevronDown /> : <FaChevronUp />}
          variant="ghost"
          size="sm"
          color="white"
        />
      </Flex>

      {/* Chat Messages */}
      <Collapse in={isOpen}>
        <VStack spacing={0} align="stretch">
          <Box
            height="300px"
            overflowY="auto"
            p={3}
            css={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
              },
            }}
          >
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                mb={2}
                alignSelf={msg.playerName === playerName ? 'flex-end' : 'flex-start'}
              >
                <Text
                  fontSize="xs"
                  color="gray.400"
                  mb={1}
                >
                  {msg.playerName}
                </Text>
                <Box
                  bg={msg.playerName === playerName ? 'blue.500' : 'whiteAlpha.200'}
                  color="white"
                  px={3}
                  py={2}
                  borderRadius="lg"
                  maxW="80%"
                >
                  <Text fontSize="sm">{msg.message}</Text>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          {/* Chat Input */}
          <Flex p={2} bg="whiteAlpha.50">
            <Input
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              bg="whiteAlpha.100"
              border="none"
              color="white"
              _placeholder={{ color: 'whiteAlpha.500' }}
              mr={2}
            />
            <Button
              onClick={handleSendMessage}
              colorScheme="blue"
              size="sm"
            >
              Send
            </Button>
          </Flex>
        </VStack>
      </Collapse>
    </Box>
  )
}

export default MpChat 