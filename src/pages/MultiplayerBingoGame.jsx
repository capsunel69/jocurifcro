import { useState, useEffect } from 'react'
import { 
  Box, 
  Container, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Heading,
  useToast,
  Badge,
  Input,
  Center,
  Progress
} from '@chakra-ui/react'
import { MdRefresh, MdShuffle } from 'react-icons/md'
import MpBingoBoard from '../components/bingoMultiplayer/mpBingoBoard'
import MpGameControls from '../components/bingoMultiplayer/mpGameControls'
import MpTimer from '../components/bingoMultiplayer/mpTimer'
import MpGameModeSelect from '../components/bingoMultiplayer/mpGameModeSelect'
import pusher from '../services/pusher'

const API_BASE_URL = import.meta.env.VITE_API_URL;

function MultiplayerBingoGame() {
  const [gameMode, setGameMode] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(10)
  const [gameState, setGameState] = useState('init')
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [selectedCells, setSelectedCells] = useState([])
  const [validSelections, setValidSelections] = useState([])
  const [currentInvalidSelection, setCurrentInvalidSelection] = useState(null)
  const [usedPlayers, setUsedPlayers] = useState([])
  const [hasWildcard, setHasWildcard] = useState(true)
  const [skipPenalty, setSkipPenalty] = useState(false)
  const [wildcardMatches, setWildcardMatches] = useState([])
  const [maxAvailablePlayers, setMaxAvailablePlayers] = useState(40)
  const [categories, setCategories] = useState([])
  const [roomId, setRoomId] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [players, setPlayers] = useState([])
  const toast = useToast()
  const [showSkipAnimation, setShowSkipAnimation] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isInteractionDisabled, setIsInteractionDisabled] = useState(false)
  const [playerScores, setPlayerScores] = useState({})
  const [finishedPlayers, setFinishedPlayers] = useState([])
  const [isHost, setIsHost] = useState(false)
  const [allPlayersFinished, setAllPlayersFinished] = useState(false)
  const [hasFinished, setHasFinished] = useState(false)

  // Separate temporary input state from active player state
  const [inputPlayerName, setInputPlayerName] = useState('')
  const [inputRoomId, setInputRoomId] = useState('')

  // Replace the sound initialization and create a function to reliably play sounds
  const correctSoundSrc = '/sfx/correct_answer.mp3'
  const wrongSoundSrc = '/sfx/wrong_answer.mp3'
  const wildcardSoundSrc = '/sfx/wildcard.mp3'

  // Create a sound player function that ensures sounds play every time
  const playSound = (soundSrc) => {
    const sound = new Audio(soundSrc);
    sound.volume = 0.15;
    
    // Create a promise that resolves when the sound can play
    const playPromise = sound.play();
    
    // If the browser doesn't support promises for audio playback
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log("Sound play error (ignoring):", error);
      });
    }
  }

  const correctSound = new Audio('/sfx/correct_answer.mp3')
  correctSound.volume = 0.15
  
  const wrongSound = new Audio('/sfx/wrong_answer.mp3')
  wrongSound.volume = 0.15
  
  const wildcardSound = new Audio('/sfx/wildcard.mp3')
  wildcardSound.volume = 0.15

  const [isTimerActive, setIsTimerActive] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rid = params.get('roomId')
    const pname = params.get('playerName')
    
    if (rid && pname) {
      setRoomId(rid)
      setPlayerName(pname)
    }
  }, [])

  useEffect(() => {
    if (roomId) {
      const channel = pusher.subscribe(`room-${roomId}`)
      
      channel.bind('game-started', (data) => {
        console.log('Game started data:', data)
        if (data.gameData) {
          setCategories(data.gameData.categories || [])
          setCurrentPlayer(data.gameData.currentPlayer)
          setMaxAvailablePlayers(data.gameData.maxPlayers)
          setUsedPlayers([])
          setGameState('playing')
          setGameMode('timed')
          
          // Initialize timer for this player
          setTimeRemaining(10)
          setIsTimerActive(true)
        }
      })

      channel.bind('cell-selected', (data) => {
        // Update scores in real-time for all players
        if (data.isValid) {
          setPlayerScores(prev => ({
            ...prev,
            [data.playerName]: data.totalValidSelections || 0
          }));
        }

        // Only handle the rest if it's for the current player
        if (data.playerName === playerName) {
          // Always show as if the selection was successful
          playSound(correctSoundSrc);
          
          // Update selected cells
          const updatedSelectedCells = data.playerState.selectedCells || [];
          setSelectedCells(updatedSelectedCells);
          setCurrentPlayer(data.playerState.currentPlayer);
          
          // If it's actually valid, track it for scoring
          if (data.isValid) {
            setValidSelections(prev => [...prev, data.categoryId]);
          }
          
          // Update used players
          setUsedPlayers(prev => {
            const newUsedPlayers = [...prev, data.playerState.lastUsedPlayer];
            
            // Check if game is over either by using all players OR by selecting all categories
            const allCategoriesSelected = updatedSelectedCells.length >= 16;
            if (newUsedPlayers.length >= maxAvailablePlayers || allCategoriesSelected) {
              console.log('Game over triggered by ' + 
                (allCategoriesSelected ? 'all categories selected' : 'all players used'));
              setIsGameOver(true);
              setGameState('finished');
              handleGameOver();
            }
            
            return newUsedPlayers;
          });
          
          // Only reset timer for this player
          setTimeRemaining(10);
          setIsTimerActive(true);
          
          // IMPORTANT: Re-enable interactions after receiving server response
          setIsInteractionDisabled(false);
        }
      })

      channel.bind('wildcard-used', (data) => {
        console.log('Wildcard used event received:', {
          playerName: data.playerName,
          wildcardMatches: data.wildcardMatches,
          totalValidSelections: data.totalValidSelections
        });

        if (data.playerName === playerName) {
          if (data.wildcardMatches && data.wildcardMatches.length > 0) {
            // Filter out categories that have already been selected
            const newMatches = data.wildcardMatches.filter(
              matchId => !selectedCells.includes(matchId)
            );
            
            if (newMatches.length > 0) {
              playSound(wildcardSoundSrc);
              
              // Update wildcard matches (for visualization)
              setWildcardMatches(newMatches);
              
              // Add to valid selections for scoring
              setValidSelections(prev => [...prev, ...newMatches]);
              
              // IMPORTANT: Also add to selectedCells for the game end condition
              setSelectedCells(prev => {
                const updatedCells = [...prev, ...newMatches];
                
                // Check if all 16 categories have been selected - trigger game end
                if (updatedCells.length >= 16) {
                  console.log('Game over triggered by wildcard completing all 16 categories');
                  setIsGameOver(true);
                  setGameState('finished');
                  handleGameOver();
                }
                
                return updatedCells;
              });
            } else {
              toast({
                title: "No New Matches",
                description: "All matching categories have already been selected.",
                status: "info",
                duration: 3000,
                isClosable: true,
              });
            }
          } else {
            toast({
              title: "No Matches Found",
              description: "There are no matching categories for this player.",
              status: "info",
              duration: 3000,
              isClosable: true,
            });
          }
          
          setHasWildcard(false);
          setIsInteractionDisabled(false);
        }

        // Update scores for all players
        if (data.totalValidSelections !== undefined) {
          setPlayerScores(prev => ({
            ...prev,
            [data.playerName]: data.totalValidSelections
          }));
        }
      })

      channel.bind('player-skipped', (data) => {
        console.log('Player skipped event received:', data);
        
        // Only respond to skip events for this player
        if (data.playerName === playerName) {
          setShowSkipAnimation(true);
          
          // Update used players for this player only
          setUsedPlayers(prev => {
            // Add skipped player to usedPlayers array
            const newUsedPlayers = [...prev];
            if (data.skippedPlayerId && !newUsedPlayers.includes(data.skippedPlayerId)) {
              newUsedPlayers.push(data.skippedPlayerId);
            }
            
            // Check if we've used all available players
            if (newUsedPlayers.length >= maxAvailablePlayers) {
              console.log('Game over triggered by skip (all players used)');
              setIsGameOver(true);
              setGameState('finished');
              handleGameOver();
            }
            
            return newUsedPlayers;
          });
          
          // Update current player to the next one
          if (data.playerState?.currentPlayer) {
            setCurrentPlayer(data.playerState.currentPlayer);
          }
          
          // Reset timer
          setTimeRemaining(10);
          setIsTimerActive(true);
          
          // Clear skip animation after a delay
          setTimeout(() => {
            setShowSkipAnimation(false);
            setIsInteractionDisabled(false);
          }, 800);
        }
      })

      channel.bind('player-finished', (data) => {
        console.log('Player finished event received:', data)
        
        // Set the score from the server once and for all
        if (data.finalScore !== undefined) {
          setPlayerScores(prev => {
            // Only update if the score is different
            if (prev[data.playerName] !== data.finalScore) {
              console.log(`Setting final score for ${data.playerName} to ${data.finalScore}`)
              return {
                ...prev,
                [data.playerName]: data.finalScore
              }
            }
            return prev
          })
        }
        
        // Add to finished players if not already there
        if (!finishedPlayers.includes(data.playerName)) {
          console.log(`Adding ${data.playerName} to finished players`);
          setFinishedPlayers(prev => [...prev, data.playerName]);
        }
        
        // Check if all players have finished
        const allFinished = [...players.map(p => p.name)]
          .every(name => [...finishedPlayers, data.playerName].includes(name));
        
        if (allFinished) {
          console.log('All players have finished');
          setAllPlayersFinished(true);
        }
      })

      channel.bind('game-reset', (data) => {
        // Reset game state for all players
        setGameState('waiting')
        setIsGameOver(false)
        setValidSelections([])
        setSelectedCells([])
        setUsedPlayers([])
        setHasWildcard(true)
        setWildcardMatches([])
        setPlayerScores({})
        setFinishedPlayers([])
        setAllPlayersFinished(false)
      })

      // Add/update player-left event handler
      channel.bind('player-left', (data) => {
        console.log('Player left event:', data);
        
        // Update players list without the player who left
        setPlayers(data.remainingPlayers);
        
        // Remove the player from finished players if they were there
        if (finishedPlayers.includes(data.playerName)) {
          setFinishedPlayers(prev => prev.filter(name => name !== data.playerName));
        }
        
        // Remove player from scores
        setPlayerScores(prev => {
          const newScores = {...prev};
          delete newScores[data.playerName];
          return newScores;
        });
        
        toast({
          title: "Player left",
          description: `${data.playerName} has left the game`,
          status: "info",
        });
        
        // After a player leaves, recalculate if all players are finished
        const remaining = data.remainingPlayers.filter(p => 
          !finishedPlayers.includes(p.name) || p.name === data.playerName
        ).length;
        
        // Update allPlayersFinished based on the new state
        if (remaining === 0) {
          setAllPlayersFinished(true);
        }
      });

      // Add/update room-closed event handler
      channel.bind('room-closed', (data) => {
        toast({
          title: "Room Closed",
          description: data.message,
          status: "error",
          duration: 5000,
        });
        // Redirect to home
        window.location.href = '/multiplayer-bingo';
      });

      // Update the player-joined event handler
      channel.bind('player-joined', (data) => {
        console.log('Player joined event received:', data);
        // Always update players list with the full list from server
        setPlayers(data.players);
        
        // Only show toast if it's not the current player joining
        if (data.playerName !== playerName) {
          toast({
            title: "Player joined",
            description: `${data.playerName} has joined the game!`,
            status: "info",
          });
        }
      });

      // Add the game-over handler to force mark everyone as finished
      channel.bind('game-over', (data) => {
        console.log('Game over event received!', data);
        setIsGameOver(true);
        setGameState('finished');
        handleGameOver();
      });

      // Also bind to the player-specific channel
      const playerChannel = pusher.subscribe(`room-${roomId}-${playerName}`);
      playerChannel.bind('game-over', (data) => {
        console.log(`Player-specific game-over event received for ${playerName}!`, data);
        setIsGameOver(true);
        setGameState('finished');
        handleGameOver();
      });

      return () => {
        pusher.unsubscribe(`room-${roomId}`)
      }
    }
  }, [roomId, playerName, maxAvailablePlayers, gameState, toast])

  useEffect(() => {
    // Check if all players have finished
    if (players.length > 0 && finishedPlayers.length === players.length) {
      setAllPlayersFinished(true)
    }
  }, [players, finishedPlayers])

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let timer = null;
    
    if (isTimerActive && timeRemaining > 0) {
      timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (isTimerActive && timeRemaining === 0) {
      console.log('Timer expired, auto-skipping');
      setIsTimerActive(false);
      
      // Make sure we're not already in the middle of an interaction
      if (!isInteractionDisabled) {
        handleSkip();
      }
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [timeRemaining, isTimerActive, gameState, isInteractionDisabled]);

  const handleModeSelect = async () => {
    setGameMode('timed')
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName,
          gameMode: 'timed'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start game')
      }
    } catch (error) {
      console.error('Error starting game:', error)
      toast({
        title: "Error",
        description: "Failed to start game",
        status: "error",
      })
    }
  }

  const handleCellSelect = async (categoryId) => {
    if (isInteractionDisabled || selectedCells.includes(categoryId)) return;
    
    try {
      setIsInteractionDisabled(true);
      
      // Make API request to check cell
      const response = await fetch(`${API_BASE_URL}/api/cell-select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName,
          categoryId,
          currentPlayerId: currentPlayer?.id,
          usedPlayers: usedPlayers
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to select cell');
      }
      
      // Don't play sound or update selectedCells here - wait for server event
      
      // We need to keep isInteractionDisabled true until we receive the server response
      // If we never get a response, make sure we reset after 2 seconds as a fallback
      setTimeout(() => {
        setIsInteractionDisabled(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error selecting cell:', error);
      // Make sure we reset the interaction state on error
      setIsInteractionDisabled(false);
      toast({
        title: "Error",
        description: "Failed to select cell",
        status: "error"
      });
    }
  };

  const handleWildcardUse = async () => {
    if (isInteractionDisabled || isGameOver || !hasWildcard) {
      console.log('Wildcard blocked:', { isInteractionDisabled, isGameOver, hasWildcard })
      return
    }
    
    try {
      console.log('Attempting to use wildcard:', {
        roomId,
        playerName,
        currentPlayerId: currentPlayer?.id,
        categoriesCount: categories.length
      })
      
      setIsInteractionDisabled(true)
      
      const response = await fetch(`${API_BASE_URL}/api/use-wildcard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId, 
          playerName,
          currentPlayerId: currentPlayer?.id,
          categories: categories
        })
      })
      
      const data = await response.json()
      console.log('Wildcard response:', data)
      
      if (!response.ok) {
        setIsInteractionDisabled(false)
        throw new Error(data.error || 'Failed to use wildcard')
      }
      
      // Let the server-side event handler manage the wildcard state
      // Don't update state here as it will be handled by the 'wildcard-used' event
      
    } catch (error) {
      console.error('Error using wildcard:', error)
      toast({
        title: "Error",
        description: error.message,
        status: "error",
      })
      setIsInteractionDisabled(false)
    }
  }

  const handleSkip = async () => {
    if (isInteractionDisabled) return;
    setIsInteractionDisabled(true);
    
    try {
      console.log('Skipping current player:', currentPlayer?.id);
      
      // Make API request to skip current player
      const response = await fetch(`${API_BASE_URL}/api/skip-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName,
          currentPlayerId: currentPlayer?.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to skip player');
      }
      
      // Don't update state here - wait for server event
      
    } catch (error) {
      console.error('Error skipping player:', error);
      setIsInteractionDisabled(false);
      toast({
        title: 'Error',
        description: 'Failed to skip player',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleTimeUp = () => {
    if (gameState !== 'playing' || isInteractionDisabled) return;
    
    console.log('Timer expired, auto-skipping');
    setIsTimerActive(false);
    handleSkip();
  }

  const handleCreateRoom = async () => {
    if (!inputPlayerName) {
      toast({
        title: "Error",
        description: "Please enter your name",
        status: "error",
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: inputPlayerName })
      });

      if (!response.ok) throw new Error('Failed to create room');
      
      const data = await response.json();
      setRoomId(data.roomId);
      setPlayerName(inputPlayerName);
      setPlayers([{ name: inputPlayerName, isHost: true }]);
      setIsHost(true);
      setGameState('waiting');
      
      toast({
        title: "Room Created!",
        description: `Room ID: ${data.roomId}`,
        status: "success",
      });
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room",
        status: "error",
      });
    }
  };

  const handleJoinRoom = async () => {
    if (!inputPlayerName || !inputRoomId) {
      toast({
        title: "Error",
        description: "Please enter your name and room ID",
        status: "error",
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerName: inputPlayerName, 
          roomId: inputRoomId 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join room');
      }
      
      const data = await response.json();
      setPlayerName(inputPlayerName);
      setRoomId(inputRoomId);
      setPlayers(data.currentPlayers); // Set the current players list
      setGameState('waiting');
      
      toast({
        title: "Joined Room",
        description: `Successfully joined room ${inputRoomId}`,
        status: "success",
      });
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join room",
        status: "error",
      });
    }
  };

  // Debug logging
  console.log('Current game state:', gameState)
  console.log('Categories:', categories)
  console.log('Current player:', currentPlayer)

  // Function to notify other players when game is over
  const handleGameOver = async () => {
    console.log('Game over handler called');
    
    // Make sure we're marked as finished locally first (don't wait for the server)
    if (!finishedPlayers.includes(playerName)) {
      // Immediately update the local state first
      setFinishedPlayers(prev => [...prev, playerName]);
      setHasFinished(true);
      
      // Then tell the server
      try {
        const response = await fetch(`${API_BASE_URL}/api/player-finished`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            playerName
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to send game over notification');
        }
      } catch (error) {
        console.error('Error notifying game over:', error);
        // Already marked locally as finished, so no need to revert
      }
    }
    
    setIsGameOver(true);
    setGameState('finished');
    
    // Check if all players are finished
    const allFinished = players.every(player => 
      [...finishedPlayers, playerName].includes(player.name)
    );
    
    if (allFinished) {
      setAllPlayersFinished(true);
    }
  };

  // Debug logs
  useEffect(() => {
    console.log('Game state:', {
      isGameOver,
      usedPlayers: usedPlayers.length,
      maxAvailablePlayers,
      playerScores,
      finishedPlayers
    })
  }, [isGameOver, usedPlayers, maxAvailablePlayers, playerScores, finishedPlayers])

  // Add debug logging for state changes
  useEffect(() => {
    console.log('Debug state:', {
      isGameOver,
      usedPlayers: usedPlayers.length,
      maxAvailablePlayers,
      gameState
    })
  }, [isGameOver, usedPlayers, maxAvailablePlayers, gameState])

  // Separate effect to handle game over conditions
  useEffect(() => {
    if (usedPlayers.length >= maxAvailablePlayers && gameState === 'playing') {
      console.log('Game over condition met:', {
        usedPlayers: usedPlayers.length,
        maxAvailablePlayers
      })
      setIsGameOver(true)
      setGameState('finished')
      handleGameOver()
    }
  }, [usedPlayers.length, maxAvailablePlayers, gameState])

  const handlePlayAgain = async () => {
    try {
      setHasFinished(false); // Reset finished state
      setGameState('waiting');
      setIsGameOver(false);
      setValidSelections([]);
      setSelectedCells([]);
      setUsedPlayers([]);
      setHasWildcard(true);
      setWildcardMatches([]);
      setPlayerScores({});
      setFinishedPlayers([]);
      setAllPlayersFinished(false);
      
      await fetch(`${API_BASE_URL}/api/reset-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId,
          playerName 
        })
      });
    } catch (error) {
      console.error('Error resetting game:', error);
      toast({
        title: "Error",
        description: "Failed to start new game",
        status: "error",
      });
    }
  };

  // Add new effect to handle page unload/exit
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (roomId && playerName) {
        try {
          await fetch(`${API_BASE_URL}/api/exit-room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerName })
          });
        } catch (error) {
          console.error('Error exiting room:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [roomId, playerName]);

  // Update exit to menu handler
  const handleExitToMenu = async () => {
    try {
      if (roomId && playerName) {
        await fetch(`${API_BASE_URL}/api/exit-room`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, playerName })
        });
      }
      // Redirect to home page
      window.location.href = '/multiplayer-bingo';
    } catch (error) {
      console.error('Error exiting room:', error);
      // Still redirect even if the API call fails
      window.location.href = '/multiplayer-bingo';
    }
  };

  // Update game mode selection component to check player count
  const canStartGame = players.length >= 2 && players.length <= 5;

  // Also add automatic player finished detection when all players are used
  useEffect(() => {
    // Auto-detect game completion when all players are used up
    if (gameState === 'playing' && usedPlayers.length >= maxAvailablePlayers && !hasFinished) {
      console.log('Auto-finishing game: all players used up');
      handlePlayerFinished();
    }
  }, [usedPlayers.length, maxAvailablePlayers, gameState, hasFinished]);

  // Let's also update the handlePlayerFinished function
  const handlePlayerFinished = async () => {
    if (hasFinished) {
      console.log('Already marked as finished, not sending duplicate request');
      return;
    }
    
    // Mark as finished locally first
    setHasFinished(true);
    
    // Add ourselves to finished players immediately
    if (!finishedPlayers.includes(playerName)) {
      setFinishedPlayers(prev => [...prev, playerName]);
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/player-finished`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to notify server about finished state');
      }
    } catch (error) {
      console.error('Error marking as finished:', error);
      // Don't revert local state since we want the UI to show finished
    }
  };

  if (gameState === 'init') {
    return (
      <Box
        minH="100vh"
        backgroundImage="url('/images/bg-pattern-dark.png')"
        backgroundSize="cover"
        py={10}
      >
        <Container maxW="container.md">
          <VStack spacing={8}>
            {/* Hero Section */}
            <VStack spacing={3}>
              <Heading 
                color="white" 
                size="2xl"
                textShadow="0 2px 4px rgba(0,0,0,0.3)"
                bgGradient="linear(to-r, blue.400, purple.500)"
                bgClip="text"
              >
                Multiplayer Bingo
              </Heading>
              <Text
                color="gray.300"
                fontSize="lg"
                textAlign="center"
                maxW="md"
              >
                Challenge your friends in a game of football knowledge!
              </Text>
            </VStack>
            
            {/* Main Card */}
            <Box
              bg="rgba(0, 0, 0, 0.4)"
              p={8}
              borderRadius="2xl"
              backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.1)"
              w="full"
              maxW="450px"
              boxShadow="0 4px 30px rgba(0, 0, 0, 0.3)"
            >
              <VStack spacing={8}>
                {/* Player Name Input */}
                <VStack spacing={2} w="full">
                  <Text
                    color="gray.300"
                    fontSize="sm"
                    fontWeight="medium"
                    alignSelf="start"
                  >
                    Your Name
                  </Text>
                  <Input
                    placeholder="Enter your name"
                    value={inputPlayerName}
                    onChange={(e) => setInputPlayerName(e.target.value)}
                    size="lg"
                    bg="rgba(255, 255, 255, 0.06)"
                    color="white"
                    border="1px solid rgba(255,255,255,0.2)"
                    _placeholder={{ color: 'gray.400' }}
                    _hover={{ bg: 'rgba(255, 255, 255, 0.08)' }}
                    _focus={{ 
                      bg: 'rgba(255, 255, 255, 0.08)',
                      borderColor: 'blue.400',
                      boxShadow: '0 0 0 1px rgba(66, 153, 225, 0.6)'
                    }}
                  />
                </VStack>
                
                {/* Create Room Button */}
                <Button
                  colorScheme="blue"
                  w="full"
                  onClick={handleCreateRoom}
                  size="lg"
                  fontSize="md"
                  fontWeight="bold"
                  h="56px"
                  bg="linear-gradient(135deg, #4299E1 0%, #2B6CB0 100%)"
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(66, 153, 225, 0.4)'
                  }}
                  _active={{
                    transform: 'translateY(0)',
                    boxShadow: 'none'
                  }}
                  leftIcon={<MdShuffle size="20px" />}
                >
                  Create New Room
                </Button>
                
                {/* Divider */}
                <HStack w="full" justify="center" spacing={4}>
                  <Box flex={1} h="1px" bg="rgba(255,255,255,0.1)" />
                  <Text color="gray.400" fontSize="sm" fontWeight="medium">
                    OR JOIN EXISTING
                  </Text>
                  <Box flex={1} h="1px" bg="rgba(255,255,255,0.1)" />
                </HStack>
                
                {/* Join Room Section */}
                <VStack spacing={4} w="full">
                  <VStack spacing={2} w="full">
                    <Text
                      color="gray.300"
                      fontSize="sm"
                      fontWeight="medium"
                      alignSelf="start"
                    >
                      Room Code
                    </Text>
                    <Input
                      placeholder="Enter room code"
                      value={inputRoomId}
                      onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                      size="lg"
                      bg="rgba(255, 255, 255, 0.06)"
                      color="white"
                      border="1px solid rgba(255,255,255,0.2)"
                      _placeholder={{ color: 'gray.400' }}
                      _hover={{ bg: 'rgba(255, 255, 255, 0.08)' }}
                      _focus={{ 
                        bg: 'rgba(255, 255, 255, 0.08)',
                        borderColor: 'green.400',
                        boxShadow: '0 0 0 1px rgba(72, 187, 120, 0.6)'
                      }}
                    />
                  </VStack>
                  
                  <Button
                    colorScheme="green"
                    w="full"
                    onClick={handleJoinRoom}
                    size="lg"
                    fontSize="md"
                    fontWeight="bold"
                    h="56px"
                    bg="linear-gradient(135deg, #48BB78 0%, #2F855A 100%)"
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(72, 187, 120, 0.4)'
                    }}
                    _active={{
                      transform: 'translateY(0)',
                      boxShadow: 'none'
                    }}
                    leftIcon={<MdRefresh size="20px" />}
                  >
                    Join Room
                  </Button>
                </VStack>
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (gameState === 'waiting') {
    return (
      <Box
        minH="100vh"
        backgroundImage="url('/images/bg-pattern-dark.png')"
        backgroundSize="cover"
        py={8}
      >
        <Container maxW="container.md">
          <VStack spacing={8}>
            <Heading 
              color="white" 
              size="2xl"
              textShadow="0 2px 4px rgba(0,0,0,0.3)"
            >
              Waiting Room
            </Heading>
            
            <Box
              bg="rgba(0, 0, 0, 0.4)"
              p={8}
              borderRadius="xl"
              backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.1)"
              w="full"
              maxW="650px"
            >
              <VStack spacing={6}>
                <Text 
                  color="white"
                  fontSize="xl"
                  fontWeight="bold"
                >
                  Room ID: {roomId}
                </Text>
                
                <Text 
                  color="gray.300"
                  fontSize="lg"
                  fontWeight="bold"
                >
                  Players:
                </Text>
                
                <VStack spacing={3} w="full">
                  {players.map((player, index) => (
                    <HStack 
                      key={index} 
                      w="full" 
                      justify="space-between"
                      bg="rgba(255, 255, 255, 0.1)"
                      p={3}
                      borderRadius="md"
                    >
                      <Text color="white">{player.name}</Text>
                      {player.isHost && (
                        <Badge colorScheme="green">Host</Badge>
                      )}
                    </HStack>
                  ))}
                </VStack>
                
                {players.find(p => p.name === playerName)?.isHost && (
                  <Box w="full" pt={4}>
                    <MpGameModeSelect 
                      onModeSelect={handleModeSelect} 
                      isDisabled={!canStartGame}
                      playerCount={players.length}
                    />
                  </Box>
                )}
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (gameState === 'playing') {
    return (
      <Box
        minH="100vh"
        backgroundImage="url('/images/bg-pattern-dark.png')"
        backgroundSize="cover"
        py={8}
      >
        <Container maxW="container.lg">
          <VStack spacing={6}>
            {/* Current player info */}
            {currentPlayer && (
              <Box 
                w="full"
                maxW="400px"
                p={4} 
                bg="linear-gradient(135deg,rgb(48, 86, 210) 0%,rgb(11, 52, 166) 100%)"
                borderRadius="xl"
                boxShadow="0 4px 12px rgba(0, 0, 0, 0.3)"
                border="1px solid rgba(255, 255, 255, 0.1)"
              >
                <HStack justify="center" spacing={3} align="center">
                  <Text 
                    fontSize="2xl" 
                    fontWeight="bold"
                    color="white"
                    textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
                  >
                    {currentPlayer.f} {currentPlayer.g}
                  </Text>
                  {gameMode === 'timed' && (
                    <Box position="relative" display="flex" justifyContent="center" mb={2}>
                      <MpTimer seconds={timeRemaining} onTimeUp={handleTimeUp} />
                    </Box>
                  )}
                </HStack>
              </Box>
            )}

            {/* Game controls */}
            <MpGameControls
              hasWildcard={hasWildcard}
              onWildcardUse={handleWildcardUse}
              onSkip={handleSkip}
              isSkipPenalty={skipPenalty}
              isDisabled={isInteractionDisabled}
            />

            {/* Bingo board */}
            {categories && categories.length > 0 && (
              <Box w="full" maxW="800px" mx="auto">
                <MpBingoBoard
                  categories={categories}
                  selectedCells={selectedCells}
                  onCellSelect={handleCellSelect}
                  validSelections={validSelections}
                  currentInvalidSelection={currentInvalidSelection}
                  wildcardMatches={wildcardMatches}
                  showSkip={showSkipAnimation}
                  isDisabled={isInteractionDisabled}
                  currentPlayer={currentPlayer}
                />
              </Box>
            )}

            {/* Used players counter */}
            <Box
              p={3}
              bg="rgba(0, 0, 0, 0.4)"
              borderRadius="lg"
              backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.1)"
            >
              <Text
                fontSize="lg"
                fontWeight="semibold"
                color="white"
                textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
              >
                Players Used: {usedPlayers?.length || 0} / {maxAvailablePlayers}
              </Text>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  // Render game over screen immediately when isGameOver is true
  if (isGameOver || gameState === 'finished') {
    // Sort players by score (highest first) and break ties alphabetically
    const rankedPlayers = [...players].sort((a, b) => {
      const scoreA = playerScores[a.name] || 0;
      const scoreB = playerScores[b.name] || 0;
      
      // Sort by score first (descending)
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      
      // If scores are tied, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    console.log('Game over state:', {
      allPlayersFinished,
      finishedPlayers,
      players,
      remainingPlayers: players.length - finishedPlayers.length,
      rankedPlayers
    });
    
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="rgba(0, 0, 0, 0.9)"
        backdropFilter="blur(8px)"
        zIndex={1000}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Container maxW="container.md">
          <VStack spacing={8} align="stretch">
            <Heading
              color="white"
              size="2xl"
              textAlign="center"
              textShadow="0 2px 4px rgba(0,0,0,0.3)"
            >
              Game Over!
            </Heading>

            {/* Player's score */}
            <Box
              bg="rgba(255, 255, 255, 0.1)"
              p={6}
              borderRadius="xl"
              border="1px solid rgba(255,255,255,0.2)"
            >
              <VStack spacing={3}>
                <Text color="white" fontSize="xl">
                  Your Score: {playerScores[playerName] || 0} matches
                </Text>
                <Progress
                  value={(playerScores[playerName] || 0) / categories.length * 100}
                  w="full"
                  colorScheme="blue"
                  borderRadius="full"
                />
              </VStack>
            </Box>

            {/* Leaderboard */}
            <Box
              bg="rgba(255, 255, 255, 0.1)"
              p={6}
              borderRadius="xl"
              border="1px solid rgba(255,255,255,0.2)"
            >
              <VStack spacing={4} align="stretch">
                <Heading size="md" color="white">
                  Leaderboard
                </Heading>
                {rankedPlayers.map((player, index) => {
                  const score = playerScores[player.name] || 0;
                  const isCurrentPlayer = player.name === playerName;
                  
                  // Determine rank (handle ties by giving players with the same score the same rank)
                  let rank = index + 1;
                  if (index > 0) {
                    const prevScore = playerScores[rankedPlayers[index - 1].name] || 0;
                    if (score === prevScore) {
                      rank = index; // Same rank as previous player
                    }
                  }
                  
                  // Determine medal for top 3
                  let medal = null;
                  if (rank === 1) medal = "🥇";
                  else if (rank === 2) medal = "🥈";
                  else if (rank === 3) medal = "🥉";
                  
                  return (
                    <HStack
                      key={player.name}
                      justify="space-between"
                      bg={isCurrentPlayer ? "rgba(66, 153, 225, 0.3)" : "rgba(255, 255, 255, 0.05)"}
                      p={3}
                      borderRadius="md"
                      border={isCurrentPlayer ? "1px solid rgba(66, 153, 225, 0.5)" : "none"}
                    >
                      <HStack spacing={2}>
                        <Box 
                          w="24px" 
                          textAlign="center"
                          fontWeight="bold"
                          color={
                            rank === 1 ? "yellow.400" :
                            rank === 2 ? "gray.300" :
                            rank === 3 ? "orange.300" : "gray.500"
                          }
                        >
                          {medal || `#${rank}`}
                        </Box>
                        <Text color="white" fontWeight={isCurrentPlayer ? "bold" : "normal"}>
                          {player.name} {isCurrentPlayer && "(You)"}
                        </Text>
                      </HStack>
                      <HStack spacing={3}>
                        <Text color="white" fontWeight="bold">{score} matches</Text>
                        {finishedPlayers.includes(player.name) ? (
                          <Badge colorScheme="green">Finished</Badge>
                        ) : (
                          <Badge colorScheme="yellow">Playing</Badge>
                        )}
                      </HStack>
                    </HStack>
                  );
                })}
              </VStack>
            </Box>

            {/* Players still in game - Only show if not all players finished */}
            {!allPlayersFinished && (
              <Text
                color="gray.400"
                fontSize="lg"
                textAlign="center"
              >
                {(() => {
                  // Get the count of active players who haven't finished
                  const remainingCount = players.filter(p => !finishedPlayers.includes(p.name)).length;
                  
                  // Only show message if there are remaining players
                  if (remainingCount <= 0) return null;
                  
                  return `Waiting for ${remainingCount} player${remainingCount > 1 ? 's' : ''} to finish...`;
                })()}
              </Text>
            )}

            {/* Actions */}
            <VStack spacing={4}>
              {isHost && (
                <Box position="relative" w="full">
                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={handlePlayAgain}
                    bg="linear-gradient(135deg, #3182ce 0%, #2c5282 100%)"
                    w="full"
                    isDisabled={!allPlayersFinished}
                    _hover={{
                      transform: allPlayersFinished ? 'translateY(-2px)' : 'none',
                      boxShadow: allPlayersFinished ? '0 4px 12px rgba(49, 130, 206, 0.4)' : 'none'
                    }}
                  >
                    Start New Game
                  </Button>
                  {!allPlayersFinished && (
                    <Text
                      color="gray.400"
                      fontSize="sm"
                      textAlign="center"
                      mt={2}
                    >
                      All players must finish before starting a new game
                    </Text>
                  )}
                </Box>
              )}
              <Button
                variant="outline"
                size="lg"
                onClick={handleExitToMenu}
                borderColor="rgba(255,255,255,0.2)"
                color="white"
                w="full"
                _hover={{
                  bg: 'rgba(255,255,255,0.1)'
                }}
              >
                Exit to Menu
              </Button>
            </VStack>
          </VStack>
        </Container>
      </Box>
    )
  }

  // Fallback UI in case no state matches
  return (
    <Box
      minH="100vh"
      backgroundImage="url('/images/bg-pattern-dark.png')"
      backgroundSize="cover"
      py={8}
    >
      <Container maxW="container.md">
        <VStack spacing={4}>
          <Heading color="white">Loading...</Heading>
        </VStack>
      </Container>
    </Box>
  );
}

export default MultiplayerBingoGame 