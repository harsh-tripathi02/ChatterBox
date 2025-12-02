import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import './VideoCall.css';

function VideoCall({ recipientId, isVideo, onEndCall }) {
  const { sendMessage, registerHandler, unregisterHandler } = useWebSocket();
  const [callStatus, setCallStatus] = useState('initializing');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    initializeCall();
    
    const handlerId = 'video-call';
    registerHandler(handlerId, handleSignalingMessage);

    return () => {
      cleanup();
      unregisterHandler(handlerId);
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({
            type: 'ice-candidate',
            recipient_id: recipientId,
            data: event.candidate,
          });
        }
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setCallStatus('connected');
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setCallStatus('connected');
        } else if (peerConnection.connectionState === 'disconnected' || 
                   peerConnection.connectionState === 'failed') {
          setCallStatus('disconnected');
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      sendMessage({
        type: 'offer',
        recipient_id: recipientId,
        data: offer,
      });

      setCallStatus('calling');
    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Failed to access media devices. Please check permissions.');
      onEndCall();
    }
  };

  const handleSignalingMessage = async (data) => {
    try {
      if (data.type === 'offer' && data.sender_id === recipientId) {
        // Handle incoming offer
        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) return;

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.data));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        sendMessage({
          type: 'answer',
          recipient_id: recipientId,
          data: answer,
        });

        setCallStatus('connected');
      } else if (data.type === 'answer' && data.sender_id === recipientId) {
        // Handle answer
        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) return;

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.data));
        setCallStatus('connected');
      } else if (data.type === 'ice-candidate' && data.sender_id === recipientId) {
        // Handle ICE candidate
        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) return;

        await peerConnection.addIceCandidate(new RTCIceCandidate(data.data));
      } else if (data.type === 'call-end' && data.sender_id === recipientId) {
        // Remote peer ended call
        onEndCall();
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };

  const cleanup = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Send call-end signal
    sendMessage({
      type: 'call-end',
      recipient_id: recipientId,
    });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && isVideo) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    cleanup();
    onEndCall();
  };

  return (
    <div className="video-call-container">
      <div className="video-call-header">
        <h3>{isVideo ? 'Video Call' : 'Audio Call'}</h3>
        <span className="call-status">{callStatus}</span>
      </div>

      <div className="video-streams">
        {isVideo && (
          <>
            <div className="remote-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="video-element"
              />
              {callStatus === 'calling' && (
                <div className="call-status-overlay">
                  <p>Calling...</p>
                </div>
              )}
            </div>
            
            <div className="local-video">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="video-element"
              />
            </div>
          </>
        )}

        {!isVideo && (
          <div className="audio-call">
            <div className="audio-avatar">🎧</div>
            <p>{callStatus === 'calling' ? 'Calling...' : 'Call in progress'}</p>
            <audio ref={remoteVideoRef} autoPlay />
            <audio ref={localVideoRef} autoPlay muted />
          </div>
        )}
      </div>

      <div className="call-controls">
        <button
          className={`control-button ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>

        {isVideo && (
          <button
            className={`control-button ${isVideoOff ? 'active' : ''}`}
            onClick={toggleVideo}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? '📹❌' : '📹'}
          </button>
        )}

        <button
          className="control-button end-call"
          onClick={handleEndCall}
          title="End call"
        >
          📞
        </button>
      </div>
    </div>
  );
}

export default VideoCall;
