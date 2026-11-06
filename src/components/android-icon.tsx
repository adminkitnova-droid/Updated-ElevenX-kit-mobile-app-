import { useState, useEffect } from "react";
import { Download, Smartphone, X, Check, ExternalLink, ShieldCheck, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";

interface AndroidIconProps {
  className?: string;
  size?: number;
}

export function AndroidIcon({ className = "h-5 w-5", size }: AndroidIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Android Robot Head and Antennas */}
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v6c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-6C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-6c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.17-1.17c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.51 2.28 12.78 2 12 2c-.78 0-1.51.28-2.02.76L8.51 1.28c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.17 1.17C7.38 4.09 6.27 5.92 6.05 8h11.9c-.22-2.08-1.33-3.91-2.92-4.84zM9 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
    </svg>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function AndroidInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("ElevenX Kit added to your Android Home Screen!");
        setDeferredPrompt(null);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gold-line/40 bg-surface/80 hover:bg-gold-soft text-primary text-xs font-bold transition hover:border-primary shadow-sm"
        title="Install ElevenX Kit Android App / Add to Home Screen"
        aria-label="Install Android App"
      >
        <AndroidIcon className="h-4 w-4 text-[#3ddc84]" />
        <span className="hidden sm:inline">Android App</span>
      </button>

      {/* Android Installation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-gold-line/60 bg-[#161513] p-6 shadow-2xl space-y-5 text-center">
            {/* Header Icon */}
            <div className="flex justify-center">
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#3ddc84]/20 to-primary/20 border border-[#3ddc84]/40 text-[#3ddc84] shadow-xl">
                <AndroidIcon className="h-9 w-9 text-[#3ddc84]" />
                <div className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                  <Crown className="h-3 w-3" />
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Official Android App
              </span>
              <h3 className="font-display text-xl font-bold text-foreground mt-1">
                Install ElevenX Kit on Android
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Enjoy instant kit customization, live matchday push notifications, and courier dispatch tracking on your Android device.
              </p>
            </div>

            {/* Quick 2-Step Android Instructions */}
            <div className="rounded-2xl border border-border bg-surface/60 p-4 text-left space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 text-primary font-bold text-[11px] shrink-0">
                  1
                </div>
                <p className="text-muted-foreground">
                  Tap your browser menu (<strong className="text-foreground">⋮</strong> or three dots in Chrome / Samsung Internet).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 text-primary font-bold text-[11px] shrink-0">
                  2
                </div>
                <p className="text-muted-foreground">
                  Select <strong className="text-primary">"Install App"</strong> or <strong className="text-primary">"Add to Home screen"</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {deferredPrompt && (
                <button
                  type="button"
                  onClick={async () => {
                    await deferredPrompt.prompt();
                    setShowModal(false);
                  }}
                  className="btn-gold full text-xs py-2.5 flex items-center justify-center gap-2"
                >
                  <AndroidIcon className="h-4 w-4 text-black" />
                  Install Now via Android Prompt
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-outline full text-xs py-2 m-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
