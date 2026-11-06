import { useEffect, useState, useRef } from "react";
import { Crown } from "lucide-react";

interface GlassLoadingScreenProps {
  isLoading: boolean;
  minDurationMs?: number;
}

export function GlassLoadingScreen({ isLoading, minDurationMs = 1200 }: GlassLoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setFade(true);
        const hideTimer = setTimeout(() => setVisible(false), 500);
        return () => clearTimeout(hideTimer);
      }, minDurationMs);
      return () => clearTimeout(timer);
    }
  }, [isLoading, minDurationMs]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-500 ${
        fade ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Blurred Video Background */}
      <div className="absolute inset-0 overflow-hidden bg-black pointer-events-none">
        <video
          ref={videoRef}
          className={`h-full w-full object-cover blur-md brightness-50 scale-105 transition-opacity duration-700 ${
            videoLoaded ? "opacity-80" : "opacity-40"
          }`}
          autoPlay
          muted
          loop
          playsInline
          poster="/jersey-arsenal.jpg"
          onLoadedData={() => setVideoLoaded(true)}
        >
          <source src="/loading-bg.mp4" type="video/mp4" />
          <source src="/loading-bg.webm" type="video/webm" />
        </video>
        {/* Soft Vignette & Radial Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
      </div>

      {/* Frosted Glass Center Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-[#141412]/75 backdrop-blur-2xl backdrop-saturate-200 p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] text-center space-y-5 animate-in zoom-in-95 duration-300">
        {/* Ambient Gold Orbs */}
        <div className="absolute -top-12 -left-12 h-36 w-36 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center">
          {/* Glowing Crown Icon */}
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 text-primary shadow-xl animate-pulse">
            <Crown className="h-9 w-9 text-primary" />
          </div>

          <h1 className="font-display text-2xl font-black tracking-wider text-foreground mt-4">
            ELEVEN<span className="text-primary">X</span> <span className="text-sm font-sans font-normal text-muted-foreground">KIT</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-[2.5px] text-primary mt-1">
            ElevenX Kit Mobile App
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="space-y-2 pt-2">
          <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-gradient-to-r from-primary/60 via-primary to-amber-200 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
          </div>
          <p className="text-xs text-muted-foreground animate-pulse font-medium">
            Connecting to Firebase & Loading Kits...
          </p>
        </div>
      </div>
    </div>
  );
}
