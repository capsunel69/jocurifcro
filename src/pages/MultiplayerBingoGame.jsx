import { useState, useEffect, useCallback } from 'react'
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
import { FaCopy } from 'react-icons/fa'
import MpChat from '../components/bingoMultiplayer/mpChat'

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
  const [isHost, setIsHost] = useState(true)
  const [allPlayersFinished, setAllPlayersFinished] = useState(false)
  const [hasFinished, setHasFinished] = useState(false)

  // Separate temporary input state from active player state
  const [inputPlayerName, setInputPlayerName] = useState('')
  const [inputRoomId, setInputRoomId] = useState('')

  // Replace the sound initialization and playSound function with this updated version
  const soundEffects = {
    correct: new Audio('/sfx/correct_answer.mp3'),
    wrong: new Audio('/sfx/wrong_answer.mp3'),
    wildcard: new Audio('/sfx/wildcard.mp3')
  };

  // Set volume for all sounds
  Object.values(soundEffects).forEach(sound => {
    sound.volume = 0.15;
    // Preload sounds
    sound.preload = 'auto';
    // Add error handling
    sound.onerror = (e) => console.log('Sound loading error:', e);
  });

  // Updated sound player function
  const playSound = async (type) => {
    try {
      const sound = soundEffects[type];
      if (!sound) return;

      // Reset the sound to start
      sound.currentTime = 0;
      
      // Try to play the sound
      try {
        // Create user interaction context
        await sound.play();
      } catch (error) {
        if (error.name === 'NotAllowedError') {
          // Handle autoplay restriction
          console.log('Sound autoplay blocked by browser');
          
          // Create a new Audio instance for this specific play
          const newSound = new Audio(sound.src);
          newSound.volume = 0.15;
          await newSound.play().catch(e => console.log('Fallback sound play failed:', e));
        } else {
          console.log('Sound play error:', error);
        }
      }
    } catch (error) {
      console.log('Sound system error:', error);
    }
  };

  const [isTimerActive, setIsTimerActive] = useState(false)
  const [currentCardId, setCurrentCardId] = useState(null)

  const [isLinkCopied, setIsLinkCopied] = useState(false)

  // Add new state for ready status
  const [isReady, setIsReady] = useState(false)

  // Add these new states in your component
  const [playerStatuses, setPlayerStatuses] = useState({});

  // Add this state near your other state declarations
  const [hasHost, setHasHost] = useState(true)

  // Add this state near your other state declarations
  const [gameOverState, setGameOverState] = useState(null);

  // First, add this near the top of your component where other state variables are defined
  const [chatChannel, setChatChannel] = useState(null);

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
      setChatChannel(channel); // Store the channel for chat
      
      channel.bind('game-started', (data) => {
        console.log('Game started event received:', data);
        
        // Reset game state including gameOverState
        setValidSelections([]);
        setSelectedCells([]);
        setUsedPlayers([]);
        setWildcardMatches([]);
        setHasWildcard(true);
        setIsGameOver(false);
        setHasFinished(false);
        setAllPlayersFinished(false);
        setPlayerScores({});
        setFinishedPlayers([]);
        setGameOverState(null); // Clear the game over state when starting new game
        
        // Set new game data
        setCategories(data.gameData.categories);
        setCurrentPlayer(data.gameData.currentPlayer);
        setMaxAvailablePlayers(data.gameData.maxPlayers);
        setGameState('playing');
        
        // Set the current card ID
        setCurrentCardId(data.gameData.currentCard);
        
        // Preserve player statuses if provided
        if (data.playerStatuses) {
          setPlayerStatuses(data.playerStatuses);
        }
        
        // Reset timer
        setTimeRemaining(10);
        setIsTimerActive(true);
        setIsInteractionDisabled(false);
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
          // Use the new sound format
          playSound('correct');
          
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
          totalValidSelections: data.totalValidSelections,
          nextPlayer: data.nextPlayer
        });

        if (data.playerName === playerName) {
          // Handle wildcard matches if any
          if (data.wildcardMatches && data.wildcardMatches.length > 0) {
            playSound('wildcard');
            setWildcardMatches(data.wildcardMatches);
            setValidSelections(prev => [...prev, ...data.wildcardMatches]);
            setSelectedCells(prev => {
              const updatedCells = [...prev, ...data.wildcardMatches];
              if (updatedCells.length >= 16) {
                setIsGameOver(true);
                setGameState('finished');
                handleGameOver();
              }
              return updatedCells;
            });
          } else {
            // Add notification for no matches found
            toast({
              title: "No Matches Found",
              description: "Your wildcard didn't find any matches. Better luck next time... but not this game!",
              status: "warning",
              duration: 3000,
              isClosable: true,
              position: "top"
            });
          }

          // Update used players and current player
          setUsedPlayers(prev => {
            const newUsedPlayers = [...prev];
            if (data.skippedPlayerId && !newUsedPlayers.includes(data.skippedPlayerId)) {
              newUsedPlayers.push(data.skippedPlayerId);
            }
            return newUsedPlayers;
          });

          // Set next player
          if (data.nextPlayer) {
            setCurrentPlayer(data.nextPlayer);
          }
          
          setHasWildcard(false);
          setTimeRemaining(10); // Reset timer for next player
          setIsTimerActive(true);
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
        console.log('Player finished event received:', data);
        
        // Set the score from the server
        if (data.finalScore !== undefined) {
          setPlayerScores(prev => ({
            ...prev,
            [data.playerName]: data.finalScore
          }));
        }
        
        // Add to finished players if not already there
        if (!finishedPlayers.includes(data.playerName)) {
          setFinishedPlayers(prev => [...prev, data.playerName]);
        }
        
        // Update game over state if provided
        if (data.gameOverState) {
          setGameOverState(data.gameOverState);
        }
        
        // Check if all players have finished
        if (data.allPlayersFinished) {
          setAllPlayersFinished(true);
        }
      })

      channel.bind('game-reset', (data) => {
        console.log('Game reset event received:', data);
        setGameState('waiting');
        setPlayers(data.activePlayers || []);
        
        // Preserve player statuses if provided
        if (data.playerStatuses) {
          setPlayerStatuses(data.playerStatuses);
        }
        
        toast({
          title: "Game Reset",
          description: data.reason || "The game has been reset.",
          status: "info",
          duration: 5000,
        });
      })

      // Update the player-left event handler
      channel.bind('player-left', (data) => {
        console.log('Player left event received:', data);
        setPlayers(data.remainingPlayers || []);
        
        // Check if there's still a host in the remaining players
        const hostExists = data.remainingPlayers.some(player => player.isHost);
        setHasHost(hostExists);
        
        if (!hostExists) {
          toast({
            title: "Host Left",
            description: "The host has left the room. Please exit and join a new game.",
            status: "error",
            duration: null,
            isClosable: true,
          });
        }
        
        if (data.remainingPlayers.length < 2) {
          setGameState('waiting');
          toast({
            title: "Game Reset",
            description: "Not enough players to continue. Returning to lobby.",
            status: "info",
            duration: 5000,
          });
        }
      })

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

      // Add new event handler for ready status changes
      channel.bind('player-ready-changed', (data) => {
        setPlayers(prevPlayers => 
          prevPlayers.map(player => 
            player.name === data.playerName 
              ? { ...player, isReady: data.isReady }
              : player
          )
        );
      });

      // Update the player-status-changed event handler
      channel.bind('player-status-changed', (data) => {
        console.log('Status change event received:', data);
        if (data.allStatuses) {
          // Process statuses with timestamps to handle race conditions
          setPlayerStatuses(prev => {
            const newStatuses = { ...prev };
            Object.entries(data.allStatuses).forEach(([pName, statusData]) => {
              // Only update if the new status is more recent
              const prevTimestamp = prev[pName]?.timestamp || 0;
              if (statusData.timestamp > prevTimestamp) {
                newStatuses[pName] = statusData.status;
              }
            });
            return newStatuses;
          });
        } else {
          setPlayerStatuses(prev => ({
            ...prev,
            [data.playerName]: data.status
          }));
        }
      });

      // Add this new event handler
      channel.bind('game-state-update', (data) => {
        console.log('Game state update received:', data);
        if (data.gameOverState) {
          setGameOverState(data.gameOverState);
        }
      });

      return () => {
        channel.unbind_all();
        pusher.unsubscribe(`room-${roomId}`);
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
      // Reset all game-related state first
      setHasFinished(false);
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
      setCurrentPlayer(null);
      setIsTimerActive(false);
      setTimeRemaining(10);
      setIsInteractionDisabled(false);
      
      // Make the API call to reset the game
      const response = await fetch(`${API_BASE_URL}/api/reset-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId,
          playerName 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reset game');
      }

    } catch (error) {
      console.error('Error resetting game:', error);
      toast({
        title: "Error",
        description: "Failed to start new game",
        status: "error",
      });
    }
  };

  // Add this effect to handle browser/tab closure and visibility changes
  useEffect(() => {
    if (!roomId || !playerName) return;

    let timeoutId;
    let isClosing = false;
    let lastActiveTimestamp = Date.now();

    // Add heartbeat to regularly update server about our presence
    const sendHeartbeat = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/update-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            roomId, 
            playerName,
            status: 'active',
            timestamp: Date.now()
          })
        });
        lastActiveTimestamp = Date.now();
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    };

    // Start heartbeat interval
    const heartbeatInterval = setInterval(sendHeartbeat, 15000); // Every 15 seconds

    // Handle visibility change with heartbeat awareness
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && !isClosing) {
        // User switched tabs or minimized
        if (roomId && playerName) {
          try {
            await fetch(`${API_BASE_URL}/api/update-status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                roomId, 
                playerName,
                status: 'away',
                timestamp: Date.now()
              })
            });
          } catch (error) {
            console.error('Error updating away status:', error);
          }
        }
      } else if (document.visibilityState === 'visible') {
        // User came back - explicitly set status to active
        if (roomId && playerName) {
          try {
            await fetch(`${API_BASE_URL}/api/update-status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                roomId, 
                playerName,
                status: 'active',
                timestamp: Date.now(),
                forceUpdate: true // Add this flag to force status update
              })
            });
            // Immediate heartbeat when becoming visible
            sendHeartbeat();
          } catch (error) {
            console.error('Error updating active status:', error);
          }
        }
      }
    };

    // Handle actual page/browser closure
    const handleBeforeUnload = () => {
      isClosing = true;
      // Use sendBeacon for more reliable delivery during page unload
      navigator.sendBeacon(
        `${API_BASE_URL}/api/exit-room`,
        JSON.stringify({ 
          roomId, 
          playerName,
          timestamp: Date.now()
        })
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleBeforeUnload);

    // Initial heartbeat
    sendHeartbeat();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleBeforeUnload);
      clearInterval(heartbeatInterval);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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

  // First, add this debug useEffect
  useEffect(() => {
    console.log('Game state debug:', {
      players: players.map(p => p.name),
      finishedPlayers,
      allPlayersFinished,
      isHost,
      gameState
    });
  }, [players, finishedPlayers, allPlayersFinished, isHost, gameState]);

  // Update the useEffect that checks for all players finished
  useEffect(() => {
    const allFinished = players.length > 0 && 
      players.every(player => finishedPlayers.includes(player.name));
    
    console.log('Checking if all players finished:', {
      playersCount: players.length,
      finishedCount: finishedPlayers.length,
      allFinished,
      players: players.map(p => p.name),
      finishedPlayers
    });

    setAllPlayersFinished(allFinished);
  }, [players, finishedPlayers]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('roomId');
    if (rid) {
      setInputRoomId(rid);
    }
  }, []);

  const getShareableLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/multiplayer-bingo?roomId=${roomId}`;
    console.log('Generated link:', link); // Debug log
    return link;
  };

  useEffect(() => {
    if (roomId && playerName) {
      const channel = pusher.subscribe(`room-${roomId}-${playerName}`);
      
      // Add this new event handler
      channel.bind('force-redirect', (data) => {
        console.log('Received force-redirect event:', data);
        window.location.href = '/multiplayer-bingo';
      });

      return () => {
        channel.unbind_all();
        pusher.unsubscribe(`room-${roomId}-${playerName}`);
      };
    }
  }, [roomId, playerName]);

  // Add new function to handle ready toggle
  const handleReadyToggle = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/toggle-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerName })
      });

      if (!response.ok) {
        throw new Error('Failed to update ready status');
      }

      const data = await response.json();
      setIsReady(data.isReady);
    } catch (error) {
      console.error('Error toggling ready status:', error);
      toast({
        title: "Error",
        description: "Failed to update ready status",
        status: "error",
      });
    }
  };

  // Add this function to handle kicking players
  const handleKickPlayer = async (kickedPlayerName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/kick-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId, 
          playerName,
          kickedPlayerName 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to kick player');
      }
    } catch (error) {
      console.error('Error kicking player:', error);
      toast({
        title: "Error",
        description: "Failed to kick player",
        status: "error",
      });
    }
  };

  if (gameState === 'init') {
    return (
      <Box
        minH="100vh"
        height="100vh"
        backgroundImage="url('/images/bg-pattern-dark.png')"
        backgroundSize="cover"
        py={10}
        overflow="auto"
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
                textAlign="center"
                bgClip="text"
              >
                Multiplayer Bingo
                <Text
                  fontSize="md"
                  color="gray.400"
                  fontWeight="normal"
                  textAlign="center"
                  mt={2}
                >
                  Beta Version - Improvements Coming Soon
                </Text>
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
                  isDisabled={inputRoomId.length > 0}
                  opacity={inputRoomId.length > 0 ? 0.5 : 1}
                  cursor={inputRoomId.length > 0 ? 'not-allowed' : 'pointer'}
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
        px={2}
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
            
            {!hasHost && (
              <Box
                bg="red.500"
                color="white"
                p={4}
                borderRadius="md"
                width="100%"
                textAlign="center"
              >
                <VStack spacing={4}>
                  <Text fontWeight="bold">
                    The host has left the room
                  </Text>
                  <Button
                    colorScheme="white"
                    variant="outline"
                    onClick={handleExitToMenu}
                  >
                    Exit to Menu
                  </Button>
                </VStack>
              </Box>
            )}
            
            <Box
              bg="rgba(0, 0, 0, 0.4)"
              p={8}
              borderRadius="xl"
              backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.1)"
              w="full"
              maxW="650px"
              position="relative"
            >
              <VStack spacing={6}>
                <HStack w="full" justify="space-between" align="center">
                  <Text 
                    color="white"
                    fontSize="l"
                    fontWeight="bold"
                  >
                    Room ID: {roomId}
                  </Text>
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme={isLinkCopied ? "green" : "gray"}
                    onClick={async () => {
                      try {
                        const link = getShareableLink();
                        
                        // Try modern clipboard API first
                        if (navigator.clipboard && window.isSecureContext) {
                          await navigator.clipboard.writeText(link);
                        } else {
                          // Fallback for older browsers or non-HTTPS
                          const textArea = document.createElement("textarea");
                          textArea.value = link;
                          textArea.style.position = "fixed";
                          textArea.style.left = "-999999px";
                          textArea.style.top = "-999999px";
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          
                          try {
                            document.execCommand('copy');
                            textArea.remove();
                          } catch (err) {
                            console.error('Fallback: Oops, unable to copy', err);
                            textArea.remove();
                            throw new Error('Copy failed');
                          }
                        }
                        
                        // If we got here, the copy worked
                        setIsLinkCopied(true);
                        toast({
                          title: "Link Copied!",
                          description: "Room link has been copied to clipboard",
                          status: "success",
                          duration: 2000,
                          isClosable: true,
                          position: "top"
                        });
                        setTimeout(() => setIsLinkCopied(false), 2000);
                      } catch (error) {
                        console.error('Failed to copy:', error);
                        toast({
                          title: "Failed to copy",
                          description: "Please try again",
                          status: "error",
                          duration: 2000,
                          isClosable: true,
                          position: "top"
                        });
                      }
                    }}
                    leftIcon={<FaCopy />}
                    transition="all 0.2s"
                    _hover={{
                      bg: 'rgba(255, 255, 255, 0.1)'
                    }}
                    opacity="0.8"
                    color="white"
                    borderWidth="1px"
                    borderColor="rgba(255, 255, 255, 0.2)"
                  >
                    {isLinkCopied ? "Copied Link!" : "Share Room"}
                  </Button>
                </HStack>
                
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
                      <HStack spacing={2}>
                        {player.isHost && (
                          <Badge colorScheme="blue">Host</Badge>
                        )}
                        <Badge colorScheme={player.isReady ? "green" : "red"}>
                          {player.isReady ? "Ready" : "Not Ready"}
                        </Badge>
                        {playerStatuses[player.name] === 'away' && (
                          <Badge colorScheme="yellow">Away</Badge>
                        )}
                        {/* Add kick button - only visible to host and not for themselves */}
                        {players.find(p => p.name === playerName)?.isHost && 
                         !player.isHost && (
                          <Button
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            opacity={0.4}
                            minW="24px"
                            h="24px"
                            p={0}
                            ml={1}
                            borderRadius="full"
                            _hover={{
                              opacity: 1,
                              bg: 'rgba(255, 0, 0, 0.15)',
                              transform: 'scale(1.1)',
                              borderColor: 'transparent'
                            }}
                            _active={{
                              transform: 'scale(0.95)',
                              bg: 'rgba(255, 0, 0, 0.25)'
                            }}
                            _focus={{
                              boxShadow: 'none'
                            }}
                            transition="all 0.2s"
                            onClick={() => handleKickPlayer(player.name)}
                          >
                            <Text fontSize="16px" fontWeight="bold" lineHeight="1">×</Text>
                          </Button>
                        )}
                      </HStack>
                    </HStack>
                  ))}
                </VStack>
                
                {/* Ready button for ALL players */}
                <Button
                  colorScheme={isReady ? "green" : "blue"}
                  onClick={handleReadyToggle}
                  w="full"
                  size="lg"
                  h="56px"
                  bg={isReady 
                    ? "linear-gradient(135deg, #48BB78 0%, #2F855A 100%)"
                    : "linear-gradient(135deg, #4299E1 0%, #2B6CB0 100%)"
                  }
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: isReady
                      ? '0 4px 12px rgba(72, 187, 120, 0.4)'
                      : '0 4px 12px rgba(66, 153, 225, 0.4)'
                  }}
                  _active={{
                    transform: 'translateY(0)',
                    boxShadow: 'none'
                  }}
                  transition="all 0.2s"
                  position="relative"
                  overflow="hidden"
                >
                  <HStack spacing={2} justify="center">
                    {isReady ? (
                      <>
                        <Text>✓</Text>
                        <Text>Ready!</Text>
                      </>
                    ) : (
                      <>
                        <Text>Click when ready</Text>
                      </>
                    )}
                  </HStack>
                  {isReady && (
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="white"
                      opacity="0.1"
                      animation="pulse 2s infinite"
                    />
                  )}
                </Button>
                
                {/* Add Exit Room button here */}
                <Button
                  variant="ghost"
                  colorScheme="red"
                  onClick={handleExitToMenu}
                  w="full"
                  size="md"
                  opacity={0.6}
                  bg="rgb(53, 15, 15)"
                  borderWidth="1px"
                  borderColor="rgba(9, 75, 129, 0.1)"
                  _hover={{
                    opacity: 1,
                    bg: 'rgba(255, 0, 0, 0.1)',
                    borderColor: 'rgba(255, 0, 0, 0.2)'
                  }}
                >
                  Exit Room
                </Button>
                
                {/* Host controls - only show game mode select for host */}
                {players.find(p => p.name === playerName)?.isHost && (
                  <Box w="full" pt={4}>
                    <MpGameModeSelect 
                      onModeSelect={handleModeSelect} 
                      isDisabled={!canStartGame || !players.every(p => p.isReady)}
                      playerCount={players.length}
                    />
                    {!players.every(p => p.isReady) && (
                      <Text
                        color="red.300"
                        fontSize="sm"
                        textAlign="center"
                        mt={2}
                      >
                        Waiting for all players to be ready...
                      </Text>
                    )}
                  </Box>
                )}
              </VStack>
            </Box>

            {/* Add chat in a new container below the waiting room box */}
            <Box
              bg="rgba(0, 0, 0, 0.4)"
              p={4}
              borderRadius="xl"
              backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.1)"
              w="full"
              maxW="650px"
              minH="400px"
              position="relative"
            >
              <MpChat
                roomId={roomId}
                playerName={playerName}
                pusherChannel={chatChannel}
                variant="embedded"
              />
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
        px={2}
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
                    {currentPlayer.g} {currentPlayer.f}
                  </Text>
                  <Box position="relative" display="flex" justifyContent="center" mb={2}>
                    <MpTimer seconds={timeRemaining} onTimeUp={handleTimeUp} />
                  </Box>
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
                  isDisabled={isInteractionDisabled || isGameOver || gameState !== 'playing'}
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

            {/* Display the card ID */}
            <Box
              position="absolute"
              bottom={2}
              right={2}
              p={1}
              bg="rgba(0, 0, 0, 0.5)"
              borderRadius="md"
            >
              <Text
                fontSize="xs"
                color="gray.300"
              >
                Card ID: {currentCardId || 'N/A'}
              </Text>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  // Render game over screen immediately when isGameOver is true
  if (isGameOver || gameState === 'finished') {
    // Combine active players with disconnected players from gameOverState
    const allPlayers = [...players];
    if (gameOverState) {
      gameOverState.players.forEach(player => {
        if (!allPlayers.some(p => p.name === player.name)) {
          allPlayers.push(player);
        }
      });
    }

    // Sort players by score
    const rankedPlayers = allPlayers.sort((a, b) => {
      const scoreA = (gameOverState?.scores[a.name] || playerScores[a.name] || 0);
      const scoreB = (gameOverState?.scores[b.name] || playerScores[b.name] || 0);
      
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return a.name.localeCompare(b.name);
    });

    // Calculate how many players haven't finished yet
    const unfinishedCount = players.filter(p => !finishedPlayers.includes(p.name)).length;
    
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        px={2}
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
                  
                  // Determine rank (handle ties)
                  let rank = index + 1;
                  if (index > 0) {
                    const prevScore = playerScores[rankedPlayers[index - 1].name] || 0;
                    if (score === prevScore) {
                      rank = index;
                    }
                  }
                  
                  // Determine medal for top 3
                  let medal = null;
                  if (rank === 1) medal = "🥇";
                  else if (rank === 2) medal = "🥈";
                  else if (rank === 3) medal = "🥉";

                  // Get player status - but force 'active' if it's the current player viewing
                  const playerStatus = isCurrentPlayer ? 'active' : playerStatuses[player.name];
                  
                  const isDisconnected = gameOverState?.players.find(p => 
                    p.name === player.name)?.disconnected || false;
                  
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
                        <Text color="white" fontWeight="bold">
                          {gameOverState?.scores[player.name] || playerScores[player.name] || 0} matches
                        </Text>
                        {isDisconnected ? (
                          <Badge colorScheme="red">Disconnected</Badge>
                        ) : playerStatus === 'away' && !isCurrentPlayer ? (
                          <Badge colorScheme="yellow">Away</Badge>
                        ) : finishedPlayers.includes(player.name) ? (
                          <Badge colorScheme="green">Finished</Badge>
                        ) : (
                          <Badge colorScheme="blue">Playing</Badge>
                        )}
                      </HStack>
                    </HStack>
                  );
                })}
              </VStack>
            </Box>

            {/* Actions */}
            <VStack spacing={4}>
              {/* Only show Start New Game button if player is host */}
              {players.find(p => p.name === playerName)?.isHost && (
                <Box position="relative" w="full">
                  <Button
                    colorScheme={unfinishedCount === 0 ? "green" : "red"}
                    size="lg"
                    onClick={handlePlayAgain}
                    w="full"
                    bg={unfinishedCount === 0
                      ? "linear-gradient(135deg, #48BB78 0%, #2F855A 100%)"
                      : "linear-gradient(135deg, #E53E3E 0%, #9B2C2C 100%)"
                    }
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: unfinishedCount === 0
                        ? '0 4px 12px rgba(72, 187, 120, 0.4)'
                        : '0 4px 12px rgba(229, 62, 62, 0.4)'
                    }}
                    whiteSpace="normal"
                    textAlign="center"
                    py={2}
                  >
                    {unfinishedCount === 0
                      ? 'Start New Game' 
                      : `Start New Game (${unfinishedCount} still playing)`
                    }
                  </Button>
                  {unfinishedCount > 0 && (
                    <Text
                      color="red.300"
                      fontSize="sm"
                      textAlign="center"
                      mt={2}
                    >
                      Warning: Some players haven't finished yet
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