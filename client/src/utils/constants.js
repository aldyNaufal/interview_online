// API Configuration
export const API_BASE_URL = 'http://localhost:8000/api';

// Room Configuration
export const ROOM_CONFIG = {
  adaptive: true,
  dynacast: true,
  publishDefaults: {
    videoCodec: 'vp9',
  },
  maxParticipants: 10
};

// UI Constants
export const COPY_TIMEOUT = 2000;
export const VIDEO_ATTACH_DELAY = 100;