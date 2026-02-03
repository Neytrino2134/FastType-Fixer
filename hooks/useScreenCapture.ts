
import { useState, useRef, useCallback, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface UseScreenCaptureProps {
  onMicStream?: (stream: MediaStream | null) => void;
  onSysStream?: (stream: MediaStream | null) => void;
  onVideoStream?: (stream: MediaStream | null) => void;
}

export const useScreenCapture = ({ onMicStream, onSysStream, onVideoStream }: UseScreenCaptureProps) => {
  const { addNotification } = useNotification();
  
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSysAudioActive, setIsSysAudioActive] = useState(false);
  
  const videoStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const sysStreamRef = useRef<MediaStream | null>(null);

  // --- VIDEO CAPTURE (Visuals) ---
  const toggleVideoCapture = useCallback(async () => {
    if (isVideoActive) {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      setIsVideoActive(false);
      if (onVideoStream) onVideoStream(null);
      addNotification("Video Capture Stopped", "info");
    } else {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
          audio: false
        });
        
        videoStreamRef.current = stream;
        setIsVideoActive(true);
        if (onVideoStream) onVideoStream(stream);
        
        stream.getVideoTracks()[0].onended = () => {
            setIsVideoActive(false);
            if (onVideoStream) onVideoStream(null);
            videoStreamRef.current = null;
        };
        
      } catch (err) {
        console.error("Screen capture cancelled", err);
      }
    }
  }, [isVideoActive, onVideoStream, addNotification]);

  // --- MICROPHONE CAPTURE ---
  const toggleMic = useCallback(async () => {
    if (isMicActive) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      setIsMicActive(false);
      if (onMicStream) onMicStream(null);
      addNotification("Microphone Stopped", "info");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
                latency: 0
            } as any
        });
        
        micStreamRef.current = stream;
        setIsMicActive(true);
        if (onMicStream) onMicStream(stream);

        stream.getAudioTracks()[0].onended = () => {
            setIsMicActive(false);
            if (onMicStream) onMicStream(null);
            micStreamRef.current = null;
        };
        
        addNotification("Microphone Active (Visualizer Only)", "success");
      } catch (err) {
        console.error("Mic capture failed", err);
        addNotification("Microphone Access Denied", "error");
      }
    }
  }, [isMicActive, onMicStream, addNotification]);

  // --- SYSTEM AUDIO CAPTURE ---
  const toggleSysAudio = useCallback(async () => {
    if (isSysAudioActive) {
      if (sysStreamRef.current) {
        sysStreamRef.current.getTracks().forEach(track => track.stop());
        sysStreamRef.current = null;
      }
      setIsSysAudioActive(false);
      if (onSysStream) onSysStream(null);
      addNotification("System Audio Stopped", "info");
    } else {
      try {
        // We use getDisplayMedia to grab system audio (loopback)
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: { width: 1, height: 1 }, // Minimal video requirement to get audio
          audio: true
        });
        
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            addNotification("No Audio Track Selected", "warning");
            stream.getTracks().forEach((t: any) => t.stop());
            return;
        }

        // Stop the dummy video track immediately to save resources
        stream.getVideoTracks().forEach((t: any) => t.stop());
        
        // Create audio-only stream
        const audioOnlyStream = new MediaStream(audioTracks);
        
        sysStreamRef.current = audioOnlyStream;
        setIsSysAudioActive(true);
        if (onSysStream) onSysStream(audioOnlyStream);

        audioOnlyStream.getAudioTracks()[0].onended = () => {
            setIsSysAudioActive(false);
            if (onSysStream) onSysStream(null);
            sysStreamRef.current = null;
        };
        
        addNotification("System Audio Active (Visualizer Only)", "success");

      } catch (err) {
        console.error("System audio capture failed", err);
        addNotification("Capture Cancelled", "error");
      }
    }
  }, [isSysAudioActive, onSysStream, addNotification]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => t.stop());
          if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
          if (sysStreamRef.current) sysStreamRef.current.getTracks().forEach(t => t.stop());
      };
  }, []);

  return {
    isVideoActive,
    toggleVideoCapture,
    isMicActive,
    toggleMic,
    isSysAudioActive,
    toggleSysAudio
  };
};
