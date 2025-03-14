import { HStack, Button, Tooltip, VStack, Box } from '@chakra-ui/react'
import { MdStar, MdSkipNext, MdRefresh, MdShuffle } from 'react-icons/md'

function GameControls({ hasWildcard, onWildcardUse, onSkip, isSkipPenalty }) {
  return (
    <VStack spacing={6} w="full" maxW="500px">
      {/* Main controls */}
      <HStack spacing={4} w="full" justify="center">
        <Tooltip 
          label={hasWildcard ? "Use wildcard to match any category" : "Wildcard already used"}
          placement="top"
        >
          <Button
            leftIcon={<MdStar />}
            bg="linear-gradient(135deg, #ff9800, #f57c00)"
            boxShadow="0 5px 15px rgba(255, 152, 0, 0.3)"
            onClick={onWildcardUse}
            isDisabled={!hasWildcard || isSkipPenalty}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 20px rgba(255, 152, 0, 0.4)'
            }}
          >
            Wildcard
          </Button>
        </Tooltip>
        <Tooltip
          label={isSkipPenalty ? "Skip penalty turn" : "Skip current player"}
          placement="top"
        >
          <Button
            leftIcon={<MdSkipNext />}
            bg={isSkipPenalty ? 'linear-gradient(135deg, #f44336, #d32f2f)' : 'rgba(255, 255, 255, 0.1)'}
            boxShadow={isSkipPenalty ? '0 5px 15px rgba(244, 67, 54, 0.3)' : 'none'}
            onClick={onSkip}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: isSkipPenalty ? '0 8px 20px rgba(244, 67, 54, 0.4)' : '0 5px 15px rgba(255, 255, 255, 0.1)'
            }}
          >
            {isSkipPenalty ? "Skip Penalty" : "Skip"}
          </Button>
        </Tooltip>
      </HStack>
    </VStack>
  )
}

export default GameControls
