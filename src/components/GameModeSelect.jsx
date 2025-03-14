import { VStack, Button, Text } from '@chakra-ui/react';
import { FaClock, FaInfinity } from 'react-icons/fa';

const GameModeSelect = ({ onModeSelect }) => {
  const handleModeSelect = (isTimed) => {
    // Small delay to ensure state updates are processed
    setTimeout(() => {
      onModeSelect(isTimed);
    }, 0);
  };

  return (
    <VStack spacing={4} p={2} borderRadius="lg">
      <Text fontSize="3xl" fontFamily="'Russo One', sans-serif">
        Select Game Mode
      </Text>
      <Button
        leftIcon={<FaInfinity />}
        colorScheme="teal"
        size="lg"
        onClick={() => handleModeSelect(false)}
        w="full"
      >
        Classic Mode
      </Button>
      <Button
        leftIcon={<FaClock />}
        colorScheme="purple"
        size="lg"
        onClick={() => handleModeSelect(true)}
        w="full"
      >
        Timed Mode (10s)
      </Button>
    </VStack>
  );
};

export default GameModeSelect; 