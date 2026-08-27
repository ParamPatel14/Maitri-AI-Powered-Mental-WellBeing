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
  const { frame, isConnected, sendFrame } = useMaitriStream();
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const captureRef   = useRef<HTMLCanvasElement>(null); // hidden, used for frame encoding

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
        console.error('Error accessing webcam:', err);
      }
    };
    startVideo();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Frame-capture loop — sends ~10 fps to backend for analysis
  useEffect(() => {
    if (!isConnected) return;

    const id = setInterval(() => {
      const video   = videoRef.current;
      const capture = captureRef.current;
      if (!video || !capture || video.readyState < 2) return;

      capture.width  = video.videoWidth  || 640;
      capture.height = video.videoHeight || 480;
      const ctx = capture.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const dataUrl = capture.toDataURL('image/jpeg', 0.7);
      sendFrame(dataUrl);
    }, 100); // 10 fps

    return () => clearInterval(id);
  }, [isConnected, sendFrame]);

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

    const landmarks = frame?.landmarks;
    if (landmarks) {

      // Draw connections
      ctx.strokeStyle = '#10b981'; // Emerald 500
      ctx.lineWidth = 3;
      
      if (frame.result?.has_issue) {
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
      ctx.fillStyle = '#18181b';
      Object.values(landmarks).forEach((pt: Point3D) => {
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  }, [frame]);

  const hasIssue = Boolean(frame?.result?.has_issue);
  const feedback = frame?.result?.feedback || null;
  const onboardingMessage =
    frame?.calibration?.state === 'running'
      ? frame.calibration.message
      : frame?.status === 'no_pose'
        ? 'Move into frame'
        : frame?.pose?.quality !== undefined && frame.pose.quality < 0.65
          ? 'Hold still and make sure your full body is visible'
          : frame?.pose?.recommended_view && frame?.pose?.camera_view && frame.pose.recommended_view !== 'unknown' && frame.pose.camera_view !== 'none' && frame.pose.recommended_view !== frame.pose.camera_view
            ? (frame.pose.recommended_view === 'side' ? 'Turn sideways to the camera' : 'Face the camera')
            : null;
  const poseQuality = frame?.pose?.quality;

  return (
    <div className="relative w-full h-full flex flex-col p-4">
      {/* Hidden canvas used only for JPEG encoding — never rendered */}
      <canvas ref={captureRef} className="hidden" />

      {/* Ambient wrapper */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-[0_0_50px_-12px]",
          hasIssue
            ? "border-red-500 shadow-red-500/50 animate-pulse"
            : "border-zinc-200 shadow-emerald-500/10"
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

        <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full border border-zinc-200 bg-white/80 backdrop-blur-md text-xs font-semibold text-zinc-700">
            Pose: {poseQuality !== undefined ? `${Math.round(poseQuality * 100)}%` : '--'}
          </div>
          {frame?.pose?.camera_view && frame.pose.camera_view !== 'none' && (
            <div className="px-3 py-1.5 rounded-full border border-zinc-200 bg-white/80 backdrop-blur-md text-xs font-semibold text-zinc-700">
              View: {frame.pose.camera_view}
            </div>
          )}
        </div>

        {frame?.calibration?.state === 'running' && (
          <div className="absolute top-4 right-4 z-10 w-56">
            <div className="px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-50 backdrop-blur-md">
              <div className="text-xs font-semibold text-emerald-700 mb-2">Calibrating</div>
              <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.round((frame.calibration.progress || 0) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {onboardingMessage && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="px-6 py-4 rounded-2xl border border-zinc-200 bg-white/90 backdrop-blur-md text-zinc-800 font-semibold text-center max-w-md">
              {onboardingMessage}
            </div>
          </div>
        )}

        {/* Feedback Pill */}
        {feedback && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <div className={cn(
              "px-6 py-3 rounded-full backdrop-blur-md border text-center font-medium shadow-2xl transition-all duration-200",
              hasIssue
                ? "bg-red-100 border-red-300 text-red-700"
                : "bg-emerald-100 border-emerald-300 text-emerald-700"
            )}>
              {feedback}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
