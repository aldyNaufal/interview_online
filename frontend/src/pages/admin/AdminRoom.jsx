// import React, { useState, useRef, useEffect } from 'react';
// import { 
//   Crown, Clock, Circle, Copy, Settings, VideoOff, Mic, MicOff, 
//   Video, Share, Square, Users, MessageSquare, Grid3X3, PhoneOff 
// } from 'lucide-react';
// import { useMeeting } from '../../hooks/useMeeting';
// import { useWebRTC } from '../../hooks/useWebRTC';
// import ParticipantsPanel from '../../components/room/ParticipantsPanel';
// import BreakoutRoomsPanel from '../../components/room/BreakoutRoomsPanel';

// const MeetingComponent = ({ userId, roomId }) => {
//   // Use the meeting hook
//   const {
//     connectionState,
//     isConnected,
//     error,
//     participants,
//     chatMessages,
//     breakoutRooms,
//     roomInfo,
//     mediaState,
//     isRecording,
//     recordingTime,
//     initializeConnection,
//     joinRoom,
//     leaveRoom,
//     sendChatMessage,
//     updateMediaState,
//     toggleAudio,
//     toggleVideo,
//     toggleScreenShare,
//     startRecording,
//     stopRecording,
//     createBreakoutRoom,
//     joinBreakoutRoom
//   } = useMeeting(userId, roomId);

//   // Local UI state
//   const [showParticipants, setShowParticipants] = useState(false);
//   const [showChat, setShowChat] = useState(false);
//   const [showBreakoutRooms, setShowBreakoutRooms] = useState(false);
//   const [isMediaReady, setIsMediaReady] = useState(false);
//   const [audioLevel, setAudioLevel] = useState(0);
//   const [meetingDuration, setMeetingDuration] = useState(0);

//   // Refs
//   const audioContextRef = useRef(null);
//   const analyserRef = useRef(null);
//   const streamRef = useRef(null);
//   const meetingTimerRef = useRef(null);


//   const videoRef = useRef();
//   const [mediaError, setMediaError] = useState(null);
//   const [roomId] = useState("main-room"); // dynamic in future
//   useWebRTC(videoRef, roomId, setMediaError);

//   // Initialize media and connection on component mount
//   useEffect(() => {
//     const initialize = async () => {
//       try {
//         // Initialize connection
//         await initializeConnection();
        
//         // Join room with user info
//         const userInfo = {
//           name: "John Doe", // Replace with actual user info
//           role: "host",
//           avatar: null
//         };
        
//         await joinRoom(userInfo);
        
//         // Initialize media
//         await initializeMedia();
        
//         // Start meeting timer
//         startMeetingTimer();
//       } catch (error) {
//         console.error('Failed to initialize meeting:', error);
//         setMediaError('Failed to initialize meeting');
//       }
//     };

//     initialize();

//     // Cleanup on unmount
//     return () => {
//       if (meetingTimerRef.current) {
//         clearInterval(meetingTimerRef.current);
//       }
//       cleanupMedia();
//       leaveRoom();
//     };
//   }, []);

//   // Initialize media devices
//   const initializeMedia = async () => {
//     try {
//       setMediaError(null);
      
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: mediaState.video_enabled,
//         audio: mediaState.audio_enabled
//       });
      
//       streamRef.current = stream;
      
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//       }
      
//       // Setup audio level monitoring
//       if (mediaState.audio_enabled) {
//         setupAudioLevelMonitoring(stream);
//       }
      
//       setIsMediaReady(true);
//     } catch (error) {
//       console.error('Media initialization error:', error);
//       setMediaError('Camera/microphone access denied');
//       setIsMediaReady(false);
//     }
//   };

//   // Setup audio level monitoring
//   const setupAudioLevelMonitoring = (stream) => {
//     try {
//       const audioContext = new AudioContext();
//       const analyser = audioContext.createAnalyser();
//       const source = audioContext.createMediaStreamSource(stream);
      
//       analyser.fftSize = 256;
//       source.connect(analyser);
      
//       audioContextRef.current = audioContext;
//       analyserRef.current = analyser;
      
//       const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
//       const updateAudioLevel = () => {
//         if (analyserRef.current) {
//           analyserRef.current.getByteFrequencyData(dataArray);
//           const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
//           setAudioLevel(average);
//           requestAnimationFrame(updateAudioLevel);
//         }
//       };
      
//       updateAudioLevel();
//     } catch (error) {
//       console.error('Audio monitoring setup error:', error);
//     }
//   };

//   // Start meeting timer
//   const startMeetingTimer = () => {
//     meetingTimerRef.current = setInterval(() => {
//       setMeetingDuration(prev => prev + 1);
//     }, 1000);
//   };

//   // Cleanup media resources
//   const cleanupMedia = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(track => track.stop());
//     }
//     if (audioContextRef.current) {
//       audioContextRef.current.close();
//     }
//   };

//   // Handle toggle mute
//   const toggleMute = async () => {
//     try {
//       await toggleAudio();
      
//       if (streamRef.current) {
//         const audioTrack = streamRef.current.getAudioTracks()[0];
//         if (audioTrack) {
//           audioTrack.enabled = mediaState.audio_enabled;
//         }
//       }
//     } catch (error) {
//       console.error('Toggle mute error:', error);
//     }
//   };

//   // Handle toggle video
//   const toggleVideoHandler = async () => {
//     try {
//       await toggleVideo();
      
//       if (streamRef.current) {
//         const videoTrack = streamRef.current.getVideoTracks()[0];
//         if (videoTrack) {
//           videoTrack.enabled = mediaState.video_enabled;
//         }
//       }
//     } catch (error) {
//       console.error('Toggle video error:', error);
//     }
//   };

//   // Handle screen share
//   const handleScreenShare = async () => {
//     try {
//       if (mediaState.screen_sharing) {
//         // Stop screen sharing
//         await toggleScreenShare();
//         await initializeMedia(); // Resume camera
//       } else {
//         // Start screen sharing
//         const screenStream = await navigator.mediaDevices.getDisplayMedia({
//           video: true,
//           audio: true
//         });
        
//         if (videoRef.current) {
//           videoRef.current.srcObject = screenStream;
//         }
        
//         await toggleScreenShare();
        
//         // Handle screen share end
//         screenStream.getVideoTracks()[0].onended = () => {
//           toggleScreenShare();
//           initializeMedia();
//         };
//       }
//     } catch (error) {
//       console.error('Screen share error:', error);
//     }
//   };

//   // Handle breakout room creation
//   const handleCreateRoom = async (roomName) => {
//     try {
//       await createBreakoutRoom(roomName);
//     } catch (error) {
//       console.error('Create breakout room error:', error);
//     }
//   };

//   // Handle breakout room deletion
//   const handleDeleteRoom = (roomId) => {
//     // Implement room deletion logic
//     console.log('Delete room:', roomId);
//   };

//   // Handle participant assignment
//   const handleAssignToRoom = (participantId, roomId) => {
//     // Implement participant assignment logic
//     console.log('Assign participant:', participantId, 'to room:', roomId);
//   };

//   // Handle participant removal
//   const handleRemoveFromRoom = (participantId, roomId) => {
//     // Implement participant removal logic
//     console.log('Remove participant:', participantId, 'from room:', roomId);
//   };

//   // Handle room permission toggle
//   const handleToggleRoomPermission = (roomId, permission) => {
//     // Implement permission toggle logic
//     console.log('Toggle permission:', permission, 'for room:', roomId);
//   };

//   // Show connection error if any
//   if (error) {
//     return (
//       <div className="h-screen bg-gray-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="text-red-500 text-lg mb-4">Connection Error</div>
//           <div className="text-gray-600 mb-4">{error}</div>
//           <button 
//             onClick={initializeConnection}
//             className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//           >
//             Retry Connection
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="h-screen bg-gray-100 flex flex-col">
      
//       <div className="flex-1 flex">
//         {/* Main Content */}
//         <div className="flex-1 flex flex-col">
//           {/* Video Area */}
//           <div className="flex-1 p-4 bg-gray-900">
//             <div className="h-full flex items-center justify-center">
//               <div className="relative bg-gray-800 rounded-lg w-96 h-72 overflow-hidden">
//                 {mediaError ? (
//                   <div className="w-full h-full flex items-center justify-center text-white">
//                     <div className="text-center">
//                       <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
//                         <VideoOff className="w-10 h-10 text-white" />
//                       </div>
//                       <p className="text-sm">{mediaError}</p>
//                       <button 
//                         onClick={initializeMedia}
//                         className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//                       >
//                         Try Again
//                       </button>
//                     </div>
//                   </div>
//                 ) : mediaState.video_enabled && isMediaReady ? (
//                   <video 
//                     ref={videoRef} 
//                     autoPlay 
//                     muted 
//                     playsInline
//                     className="w-full h-full object-cover"
//                   />
//                 ) : (
//                   <div className="w-full h-full flex items-center justify-center">
//                     <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
//                       J
//                     </div>
//                   </div>
//                 )}
                
//                 {/* User info overlay */}
//                 <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded">
//                   John Doe (Host)
//                 </div>
                
//                 {/* Host crown */}
//                 <div className="absolute top-4 right-4 bg-blue-500 p-2 rounded-full">
//                   <Crown className="w-4 h-4 text-white" />
//                 </div>
                
//                 {/* Audio level indicator */}
//                 {mediaState.audio_enabled && isMediaReady && (
//                   <div className="absolute top-4 left-4 flex items-center gap-2 bg-black bg-opacity-60 text-white px-3 py-1 rounded">
//                     <Mic className="w-4 h-4" />
//                     <div className="w-12 h-2 bg-gray-600 rounded overflow-hidden">
//                       <div 
//                         className="h-full bg-green-500 transition-all duration-100"
//                         style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
//                       />
//                     </div>
//                   </div>
//                 )}
                
//                 {/* Muted indicator */}
//                 {!mediaState.audio_enabled && (
//                   <div className="absolute top-4 left-4 bg-red-500 p-2 rounded-full">
//                     <MicOff className="w-4 h-4 text-white" />
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Bottom Controls */}
//           <div className="bg-gray-800 px-6 py-4">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-2">
//                 <button 
//                   onClick={toggleMute}
//                   className={`p-3 rounded-full ${!mediaState.audio_enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'}`}
//                 >
//                   {!mediaState.audio_enabled ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
//                 </button>
//                 <button 
//                   onClick={toggleVideoHandler}
//                   className={`p-3 rounded-full ${!mediaState.video_enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'}`}
//                 >
//                   {!mediaState.video_enabled ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
//                 </button>
//               </div>

//               <div className="flex items-center gap-2">
//                 <button 
//                   onClick={handleScreenShare}
//                   className={`px-4 py-2 rounded-lg flex items-center gap-2 ${mediaState.screen_sharing ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
//                 >
//                   <Share className="w-5 h-5" />
//                   {mediaState.screen_sharing ? 'Stop Share' : 'Share Screen'}
//                 </button>
                
//                 <button 
//                   onClick={isRecording ? stopRecording : startRecording}
//                   className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
//                 >
//                   {isRecording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
//                   {isRecording ? 'Stop Record' : 'Record'}
//                 </button>
                
//                 <button 
//                   onClick={() => setShowParticipants(!showParticipants)}
//                   className={`px-4 py-2 rounded-lg flex items-center gap-2 ${showParticipants ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
//                 >
//                   <Users className="w-5 h-5" />
//                   Participants ({participants.length})
//                 </button>
                
//                 <button 
//                   onClick={() => setShowChat(!showChat)}
//                   className={`px-4 py-2 rounded-lg flex items-center gap-2 ${showChat ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
//                 >
//                   <MessageSquare className="w-5 h-5" />
//                   Chat
//                 </button>
                
//                 <button 
//                   onClick={() => setShowBreakoutRooms(!showBreakoutRooms)}
//                   className={`px-4 py-2 rounded-lg flex items-center gap-2 ${showBreakoutRooms ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
//                 >
//                   <Grid3X3 className="w-5 h-5" />
//                   Breakout Rooms
//                 </button>
//               </div>

//               <button 
//                 onClick={leaveRoom}
//                 className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full"
//               >
//                 <PhoneOff className="w-6 h-6" />
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Participants Panel */}
//         {showParticipants && (
//           <ParticipantsPanel 
//             participants={participants}
//             onTogglePanel={() => setShowParticipants(!showParticipants)}
//           />
//         )}

//         {/* Breakout Rooms Panel */}
//         {showBreakoutRooms && (
//           <BreakoutRoomsPanel
//             breakoutRooms={breakoutRooms}
//             participants={participants}
//             onCreateRoom={handleCreateRoom}
//             onDeleteRoom={handleDeleteRoom}
//             onAssignToRoom={handleAssignToRoom}
//             onRemoveFromRoom={handleRemoveFromRoom}
//             onTogglePermission={handleToggleRoomPermission}
//           />
//         )}
//       </div>
//     </div>
//   );
// };

// export default MeetingComponent;