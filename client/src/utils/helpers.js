// Generate room link for sharing
export const generateRoomLink = (roomName, participantName) => {
  const baseUrl = window.location.protocol + '//' + window.location.host;
  return `${baseUrl}/room?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent(participantName)}`;
};

// Get URL parameters for auto-join functionality
export const getUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomFromUrl = urlParams.get('room');
  const nameFromUrl = urlParams.get('name');
  
  return {
    room: roomFromUrl ? decodeURIComponent(roomFromUrl) : '',
    name: nameFromUrl ? decodeURIComponent(nameFromUrl) : ''
  };
};

// Copy text to clipboard with fallback
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy link:', err);
    // Fallback: show the link in an alert
    alert(`Share this link: ${text}`);
    return false;
  }
};