import { useEffect } from 'react';
import { CircularProgress, CircularProgressLabel } from '@chakra-ui/react';

const Timer = ({ seconds, onTimeUp }) => {
  useEffect(() => {
    if (seconds <= 0) {
      onTimeUp();
    }
  }, [seconds, onTimeUp]);

  return (
    <CircularProgress
      value={(seconds / 10) * 100}
      size="40px"
      thickness="12px"
      color={seconds <= 3 ? "red.400" : "green.400"}
    >
      <CircularProgressLabel fontWeight="bold" fontSize="14px" color="white">
        {Math.max(0, seconds)}
      </CircularProgressLabel>
    </CircularProgress>
  );
};

export default Timer;