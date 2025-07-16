// hooks/useWebRTC.js
import { useEffect, useRef } from 'react';

export function useWebRTC(videoRef, roomId, setMediaError) {
  const ws = useRef(null);
  const peer = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(`ws://localhost:8000/ws/${roomId}`);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;

        peer.current = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        stream.getTracks().forEach((track) => {
          peer.current.addTrack(track, stream);
        });

        peer.current.onicecandidate = (e) => {
          if (e.candidate) {
            ws.current.send(JSON.stringify({ type: 'ice', candidate: e.candidate }));
          }
        };

        peer.current.ontrack = (event) => {
          const remoteVideo = document.getElementById("remoteVideo");
          if (remoteVideo) remoteVideo.srcObject = event.streams[0];
        };

        ws.current.onmessage = async (msg) => {
          const data = JSON.parse(msg.data);

          if (data.type === 'offer') {
            await peer.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peer.current.createAnswer();
            await peer.current.setLocalDescription(answer);
            ws.current.send(JSON.stringify({ type: 'answer', answer }));
          } else if (data.type === 'answer') {
            await peer.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          } else if (data.type === 'ice') {
            await peer.current.addIceCandidate(data.candidate);
          }
        };

        ws.current.onopen = async () => {
          const offer = await peer.current.createOffer();
          await peer.current.setLocalDescription(offer);
          ws.current.send(JSON.stringify({ type: 'offer', offer }));
        };
      })
      .catch((err) => {
        console.error("Media error:", err);
        setMediaError("Failed to access camera/microphone");
      });

    return () => {
      ws.current?.close();
      peer.current?.close();
    };
  }, [roomId, videoRef]);
}
