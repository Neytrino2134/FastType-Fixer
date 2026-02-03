
import React, { useEffect, useState, useRef } from 'react';

const FpsCounter: React.FC = () => {
  const [fps, setFps] = useState(0);
  const framesRef = useRef(0);
  const prevTimeRef = useRef(performance.now());

  useEffect(() => {
    let requestID: number;

    const loop = () => {
      const time = performance.now();
      framesRef.current++;

      if (time >= prevTimeRef.current + 1000) {
        setFps(Math.round((framesRef.current * 1000) / (time - prevTimeRef.current)));
        prevTimeRef.current = time;
        framesRef.current = 0;
      }

      requestID = requestAnimationFrame(loop);
    };

    requestID = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(requestID);
  }, []);

  return (
    <div className="absolute bottom-4 left-4 z-[9999] pointer-events-none">
        <div className="bg-black/60 border border-theme-primary text-theme-primary px-2 py-1 rounded font-mono text-[10px] font-bold tracking-widest shadow-[0_0_10px_var(--color-primary)]">
            FPS: {fps}
        </div>
    </div>
  );
};

export default FpsCounter;
