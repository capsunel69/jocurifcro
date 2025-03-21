import { VStack, Button, Text } from '@chakra-ui/react';
import { FaClock, FaPlay } from 'react-icons/fa';

const mpGameModeSelect = ({ onModeSelect, isDisabled, playerCount }) => {
  const handleStartGame = () => {
    // Always use timed mode (true)
    setTimeout(() => {
      onModeSelect(true);
    }, 0);
  };

  return (
    <VStack spacing={4} p={2} borderRadius="lg">
      <Text fontSize="xl" fontFamily="'Russo One', sans-serif">
        {isDisabled 
          ? `Waiting for players (${playerCount}/2-5)...`
          : 'Ready to play?'}
      </Text>
      <Button
        leftIcon={<FaPlay />}
        colorScheme="teal"
        size="lg"
        onClick={handleStartGame}
        w="full"
        isDisabled={isDisabled}
        bg="linear-gradient(135deg, #3182ce 0%, #2c5282 100%)"
        _hover={{
          transform: !isDisabled ? 'translateY(-2px)' : 'none',
          boxShadow: !isDisabled ? '0 6px 12px rgba(49, 130, 206, 0.4)' : 'none'
        }}
      >
        Start Game
      </Button>
      <Text fontSize="sm" color="gray.300" textAlign="center">
        Players will have 10 seconds per turn
      </Text>
    </VStack>
  );
};

export default mpGameModeSelect; 