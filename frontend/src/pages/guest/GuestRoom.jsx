import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function GuestRoom() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ws = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const screenStream = useRef(null);
  const navigate = useNavigate();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [connected, setConnected] = useState(true);

  const roomId = "demo-room";

  useEffect(() => {
    const start = async () => {
      localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = localStream.current;

      ws.current = new WebSocket(`ws://localhost:8000/ws/${roomId}`);

      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          ws.current.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
      };

      peerConnection.current.ontrack = (event) => {
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      localStream.current.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream.current);
      });

      ws.current.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        if (data.type === "offer") {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          ws.current.send(JSON.stringify({ type: "answer", answer }));
        } else if (data.type === "candidate") {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      };
    };

    start();
    return () => cleanup();
  }, []);

  const toggleMic = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOn(videoTrack.enabled);
    }
  };

  const startScreenShare = async () => {
    try {
      screenStream.current = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.current.getVideoTracks()[0];

      // Replace camera track with screen track
      const senders = peerConnection.current.getSenders();
      const videoSender = senders.find(sender => sender.track?.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(screenTrack);
      }

      // Show screen locally
      localVideoRef.current.srcObject = screenStream.current;
      setScreenOn(true);

      // When user stops screen share
      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  const stopScreenShare = async () => {
    const originalTrack = localStream.current.getVideoTracks()[0];
    const senders = peerConnection.current.getSenders();
    const videoSender = senders.find(sender => sender.track?.kind === 'video');

    if (videoSender) {
      videoSender.replaceTrack(originalTrack);
    }

    localVideoRef.current.srcObject = localStream.current;
    screenStream.current?.getTracks().forEach(t => t.stop());
    screenStream.current = null;
    setScreenOn(false);
  };

  const toggleScreen = () => {
    screenOn ? stopScreenShare() : startScreenShare();
  };

  const leaveMeeting = () => {
    cleanup();
    setConnected(false);
    navigate("/");
  };

  const cleanup = () => {
    peerConnection.current?.close();
    ws.current?.close();
    localStream.current?.getTracks().forEach(track => track.stop());
    screenStream.current?.getTracks().forEach(track => track.stop());
  };

  if (!connected) {
    return (
      <div className="text-center mt-20 text-lg text-gray-600">
        You have left the meeting.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 space-y-6 bg-gray-100 min-h-screen">
      <div className="flex gap-4">
        <video ref={localVideoRef} autoPlay muted playsInline className="w-72 h-48 bg-black rounded" />
        <video ref={remoteVideoRef} autoPlay playsInline className="w-72 h-48 bg-black rounded" />
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={toggleMic}
          className={`px-4 py-2 rounded ${micOn ? 'bg-gray-700' : 'bg-red-500'} text-white`}
        >
          {micOn ? 'Mute Mic' : 'Unmute Mic'}
        </button>

        <button
          onClick={toggleCam}
          className={`px-4 py-2 rounded ${camOn ? 'bg-gray-700' : 'bg-red-500'} text-white`}
        >
          {camOn ? 'Turn Off Camera' : 'Turn On Camera'}
        </button>

        <button
          onClick={toggleScreen}
          className={`px-4 py-2 rounded ${screenOn ? 'bg-green-600' : 'bg-gray-600'} text-white`}
        >
          {screenOn ? 'Stop Sharing' : 'Share Screen'}
        </button>

        <button
          onClick={leaveMeeting}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Leave Meeting
        </button>
      </div>
    </div>
  );
}
