import { useEffect, useState } from 'react';
import { CircularProgress, CircularProgressLabel, Box } from '@chakra-ui/react';

const MpTimer = ({ seconds, onTimeUp }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Make sure timer is visible
    setIsVisible(true);
    
    // Check if we need to call onTimeUp
    if (seconds <= 0) {
      onTimeUp();
    }
  }, [seconds, onTimeUp]);

  // Fix to make sure timer is properly visible
  if (!isVisible || seconds === undefined) return null;

  return (
    <Box position="relative" display="inline-block">
      <CircularProgress
        value={(seconds / 10) * 100}
        size="60px"
        thickness="8px"
        color={seconds <= 3 ? "red.400" : "green.400"}
        trackColor="rgba(0,0,0,0.3)"
      >
        <CircularProgressLabel fontWeight="bold" fontSize="18px" color="white">
          {Math.max(0, seconds)}
        </CircularProgressLabel>
      </CircularProgress>
    </Box>
  );
};

export default MpTimer;