import { VStack, Button, Text } from '@chakra-ui/react';
import { FaClock, FaInfinity } from 'react-icons/fa';

const mpGameModeSelect = ({ onModeSelect }) => {
  const handleModeSelect = (isTimed) => {
    // Small delay to ensure state updates are processed
    setTimeout(() => {
      onModeSelect(isTimed);
    }, 0);
  };

  return (
    <VStack spacing={4} p={2} borderRadius="lg">
      <Text fontSize="xl" fontFamily="'Russo One', sans-serif">
        Alege modul de joc
      </Text>
      <VStack
        direction={['column', 'row']}
        spacing={4}
        w="full"
        display="flex"
        flexDirection={['column', 'row']}
      >
        <Button
          leftIcon={<FaInfinity />}
          colorScheme="teal"
          size="lg"
          onClick={() => handleModeSelect(false)}
          w={['full', '50%']}
        >
          Classic Mode
        </Button>
        <Button
          leftIcon={<FaClock />}
          colorScheme="purple"
          size="lg"
          onClick={() => handleModeSelect(true)}
          w={['full', '50%']}
        >
          Timed Mode (10 sec)
        </Button>
      </VStack>
    </VStack>
  );
};

export default mpGameModeSelect; 