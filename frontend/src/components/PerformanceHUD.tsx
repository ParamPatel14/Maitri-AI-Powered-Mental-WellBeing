import React, { useEffect, useRef } from 'react';
import { useMaitriStream } from '../context/MaitriStreamContext';
import type { Point3D } from '../types/maitri';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for conditional tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// MediaPipe Pose Connections (subset for skeletal drawing)
const POSE_CONNECTIONS = [
  // Torso
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  // Right Arm
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  // Left Arm
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  // Right Leg
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
  // Left Leg
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
];

export const PerformanceHUD: React.FC = () => {
  const { frame } = useMaitriStream();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize webcam
  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: 30 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };
    startVideo();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
      }
    };
  }, []);

  // Draw skeleton on canvas update
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const container = containerRef.current;
    
    if (!canvas || !ctx || !container) return;

    // Match canvas internal resolution to container size to keep lines crisp
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    if (frame?.landmarks) {
      const { landmarks } = frame;

      // Draw connections
      ctx.strokeStyle = '#10b981'; // Emerald 500
      ctx.lineWidth = 3;
      
      if (frame.result.has_issue) {
         ctx.strokeStyle = '#ef4444'; // Red 500
      }

      ctx.beginPath();
      POSE_CONNECTIONS.forEach(([p1, p2]) => {
        const pt1 = landmarks[p1];
        const pt2 = landmarks[p2];
        if (pt1 && pt2) {
          ctx.moveTo(pt1.x * width, pt1.y * height);
          ctx.lineTo(pt2.x * width, pt2.y * height);
        }
      });
      ctx.stroke();

      // Draw joints
      ctx.fillStyle = '#ffffff';
      Object.values(landmarks).forEach((pt: Point3D) => {
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  }, [frame]);

  const hasIssue = frame?.result?.has_issue;
  const feedback = frame?.result?.feedback;

  return (
    <div className="relative w-full h-full flex flex-col p-4">
      {/* Ambient wrapper */}
      <div 
        ref={containerRef}
        className={cn(
          "relative flex-1 rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-[0_0_50px_-12px]",
          hasIssue 
            ? "border-red-500 shadow-red-500/50 animate-pulse" 
            : "border-zinc-800 shadow-emerald-500/10"
        )}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover -scale-x-100"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
        />
        
        {/* Feedback Pill */}
        {feedback && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <div className={cn(
              "px-6 py-3 rounded-full backdrop-blur-md border text-center font-medium shadow-2xl transition-all duration-200",
              hasIssue 
                ? "bg-red-500/20 border-red-500/50 text-red-50" 
                : "bg-emerald-500/20 border-emerald-500/50 text-emerald-50"
            )}>
              {feedback}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
