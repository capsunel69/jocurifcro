import bingoCardData from './bingoCard_001.json'

// Transform the JSON data into the format we need
export const players = bingoCardData.map(player => {
  // Get all categories where the player has a value of 1
  const playerCategories = Object.entries(player)
    .filter(([key, value]) => value === 1 && key !== 'player')
    .map(([key]) => key)

  return {
    id: player.player, // Using player name as ID
    name: player.player,
    categories: playerCategories,
    image: `/images/players/${player.player}.webp` // Local image path
  }
})

export const getRandomPlayer = (usedPlayers = []) => {
  const availablePlayers = players.filter(p => !usedPlayers.includes(p.id))
  if (availablePlayers.length === 0) return null
  
  const selectedPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)]
  // Add fallback in case the player image doesn't exist
  try {
    new URL(selectedPlayer.image, window.location.origin)
  } catch {
    selectedPlayer.image = '/images/player/placeholder.png'
  }
  return selectedPlayer
}
