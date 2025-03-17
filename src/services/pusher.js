import Pusher from 'pusher-js';

const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
  forceTLS: true
});

export const gameChannel = pusher.subscribe('bingo-game');

export const GAME_EVENTS = {
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  CELL_SELECTED: 'cell-selected',
  GAME_STARTED: 'game-started',
  GAME_ENDED: 'game-ended',
  PLAYER_READY: 'player-ready'
};

export default pusher; 