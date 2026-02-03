
import { useState, useRef, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { RecorderConfig } from '../types';

export const useRecorder = (getAudioStream: () => MediaStream | null) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { addNotification } = useNotification();
  
  // Ref to hold the resolve function of the stopRecording promise
  const stopResolveRef = useRef<((value: boolean) => void) | null>(null);

  const startRecording = useCallback(async (config: RecorderConfig) => {
    try {
      // Resolve resolution
      let width = 1920;
      let height = 1080;
      if (config.resolution === '720p') { width = 1280; height = 720; }
      if (config.resolution === '4k') { width = 3840; height = 2160; }

      // 1. Get Visual Stream (Screen Capture)
      // We rely on getDisplayMedia which lets the user select the app window
      const videoStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: config.fps }
        },
        audio: false // We mix high-quality audio separately
      });

      // 2. Get Audio Stream (Web Audio API)
      const audioStream = getAudioStream();
      
      // If audio engine isn't ready (user hasn't played anything), creating the recorder might fail or produce silent audio.
      // We proceed even if null, but warn. Ideally the player initializes context on user interaction.
      if (!audioStream) {
          console.warn("Audio Stream not available from Player. Recording video only.");
      }

      // 3. Combine Tracks
      const tracks = [...videoStream.getVideoTracks()];
      if (audioStream) {
          tracks.push(...audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);

      // 4. Setup Recorder
      // Prefer high quality codecs if available
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          mimeType = 'video/webm;codecs=vp8,opus';
      }

      const recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: config.videoBitrate,
          audioBitsPerSecond: config.audioBitrate
      });

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          // Stop video tracks to release capture hardware/UI
          videoStream.getTracks().forEach(t => t.stop());
          
          let success = false;

          if ((window as any).require) {
              // Electron Save Strategy
              try {
                  const buffer = await blob.arrayBuffer();
                  const { ipcRenderer } = (window as any).require('electron');
                  addNotification("Saving recording...", "info");
                  const result = await ipcRenderer.invoke('save-recording', new Uint8Array(buffer));
                  
                  if (result.success) {
                      addNotification(`Saved to: ${result.filePath}`, "success");
                      success = true;
                  } else if (result.canceled) {
                      addNotification("Save cancelled", "info");
                  }
              } catch (err) {
                  console.error(err);
                  addNotification("Failed to save file", "error");
              }
          } else {
              // Web Fallback Strategy
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `neon-rec-${Date.now()}.webm`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              addNotification("Download started", "success");
              success = true;
          }
          
          setIsRecording(false);
          
          // Resolve the promise if someone is waiting for stop to complete
          if (stopResolveRef.current) {
              stopResolveRef.current(success);
              stopResolveRef.current = null;
          }
      };

      recorder.start(1000); // chunk every second
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Handle user stopping stream via browser UI 'Stop sharing' button
      videoStream.getVideoTracks()[0].onended = () => {
          if (recorder.state !== 'inactive') recorder.stop();
      };

    } catch (e) {
      console.error(e);
      addNotification("Recording failed to start", "error");
      setIsRecording(false);
    }
  }, [getAudioStream, addNotification]);

  const stopRecording = useCallback((): Promise<boolean> => {
      return new Promise((resolve) => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              // Set the resolver ref so onstop can call it
              stopResolveRef.current = resolve;
              mediaRecorderRef.current.stop();
          } else {
              resolve(false);
          }
      });
  }, []);

  return { isRecording, startRecording, stopRecording };
};
