import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Flex,
  IconButton,
  Collapse,
  useDisclosure,
  HStack,
  useOutsideClick
} from '@chakra-ui/react'
import { FaChevronUp, FaChevronDown, FaPaperPlane } from 'react-icons/fa'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import MpFloatingChatButton from './mpFloatingChatButton'

function MpChat({ roomId, playerName, pusherChannel, variant = 'floating', onNewMessage }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true })
  const chatContainerRef = useRef(null)
  
  useOutsideClick({
    ref: emojiPickerRef,
    handler: () => setShowEmojiPicker(false),
  })

  const scrollToBottom = () => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  useEffect(() => {
    if (pusherChannel) {
      pusherChannel.bind('chat-message', (data) => {
        setMessages(prev => {
          const newMessages = [...prev, data]
          if (newMessages.length > 8) {
            return newMessages.slice(-8)
          }
          return newMessages
        })
        
        if (onNewMessage) {
          onNewMessage()
        }

        scrollToBottom()
      })

      pusherChannel.bind('player-joined', (data) => {
        setMessages(prev => {
          const systemMessage = {
            type: 'system',
            message: `${data.playerName} has joined the room`,
            timestamp: Date.now()
          }
          const newMessages = [...prev, systemMessage]
          if (newMessages.length > 8) {
            return newMessages.slice(-8)
          }
          return newMessages
        })
      })

      pusherChannel.bind('player-left', (data) => {
        setMessages(prev => {
          const systemMessage = {
            type: 'system',
            message: `${data.playerName} has left the room`,
            timestamp: Date.now()
          }
          const newMessages = [...prev, systemMessage]
          if (newMessages.length > 8) {
            return newMessages.slice(-8)
          }
          return newMessages
        })
      })
    }

    return () => {
      if (pusherChannel) {
        pusherChannel.unbind('chat-message')
        pusherChannel.unbind('player-joined')
        pusherChannel.unbind('player-left')
      }
    }
  }, [pusherChannel, onNewMessage])

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
      setShowEmojiPicker(false)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  const onEmojiSelect = (emoji) => {
    setInputMessage(prev => prev + emoji.native)
  }

  const renderMessage = (msg, idx) => {
    if (msg.type === 'system') {
      return (
        <Flex
          key={idx}
          mb={2}
          justify="center"
        >
          <Text
            fontSize="xs"
            color="gray.400"
            bg="whiteAlpha.100"
            px={3}
            py={1}
            borderRadius="full"
          >
            {msg.message}
          </Text>
        </Flex>
      )
    }

    const isOwnMessage = msg.playerName === playerName
    const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })

    return (
      <Flex
        key={idx}
        mb={2}
        justify={isOwnMessage ? 'flex-end' : 'flex-start'}
      >
        <HStack spacing={2} maxW="80%">
          {!isOwnMessage && (
            <Text
              color="gray.400"
              fontSize="sm"
              noOfLines={1}
            >
              {msg.playerName}:
            </Text>
          )}
          <Box
            bg={isOwnMessage ? 'blue.500' : 'whiteAlpha.200'}
            color="white"
            px={3}
            py={2}
            borderRadius="lg"
          >
            <VStack spacing={0} align="stretch">
              <Text fontSize="sm">{msg.message}</Text>
              <Text
                fontSize="10px"
                color="whiteAlpha.600"
                textAlign="right"
                mt="2px"
              >
                {timestamp}
              </Text>
            </VStack>
          </Box>
        </HStack>
      </Flex>
    )
  }

  if (variant === 'embedded') {
    return (
      <>
        <Box h="full" ref={chatContainerRef}>
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
              maxH="300px"
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
              {messages.map((msg, idx) => renderMessage(msg, idx))}
              <div ref={messagesEndRef} />
            </Box>

            {/* Chat Input */}
            <Box position="relative">
              {showEmojiPicker && (
                <Box
                  ref={emojiPickerRef}
                  position="absolute"
                  bottom="100%"
                  right={0}
                  zIndex={2}
                  mb={2}
                >
                  <Picker 
                    data={data} 
                    onEmojiSelect={onEmojiSelect}
                    theme="dark"
                    previewPosition="none"
                    skinTonePosition="none"
                  />
                </Box>
              )}
              <Flex p={2} bg="whiteAlpha.50">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  mr={2}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  minW="40px"
                  h="40px"
                  p={0}
                  _hover={{
                    bg: 'whiteAlpha.200'
                  }}
                >
                  <Text fontSize="xl">😊</Text>
                </Button>
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
                  h="40px"
                />
                <Button
                  onClick={handleSendMessage}
                  colorScheme="blue"
                  size="sm"
                  h="40px"
                  width="150px"
                  leftIcon={<FaPaperPlane />}
                >
                  Send
                </Button>
              </Flex>
            </Box>
          </Flex>
        </Box>
      </>
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
      ref={chatContainerRef}
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
            {messages.map((msg, idx) => renderMessage(msg, idx))}
            <div ref={messagesEndRef} />
          </Box>

          {/* Chat Input */}
          <Flex p={2} bg="whiteAlpha.50">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              mr={2}
              display="flex"
              alignItems="center"
              justifyContent="center"
              minW="40px"
              h="40px"
              p={0}
              _hover={{
                bg: 'whiteAlpha.200'
              }}
            >
              <Text fontSize="xl">😊</Text>
            </Button>
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
              h="40px"
            />
            <Button
              onClick={handleSendMessage}
              colorScheme="blue"
              size="sm"
              h="40px"
              leftIcon={<FaPaperPlane />}
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