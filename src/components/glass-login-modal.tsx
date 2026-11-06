import { useState } from "react";
import { toast } from "sonner";
import { Crown, Lock, Mail, User, X, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface GlassLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export function GlassLoginModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Sign In to Save Your Kit",
  subtitle = "Create an account or sign in to save your customized jersey and proceed to checkout.",
}: GlassLoginModalProps) {
  const { signInWithEmail, signUpWithEmail, loginDemo } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const res: any = await signInWithEmail(email, password);
        if (res.ok) {
          toast.success("Welcome back! Adding kit to your bag...");
          onClose();
          onSuccess();
        } else {
          toast.error(res.error || "Sign in failed. Check your credentials.");
        }
      } else {
        const res: any = await signUpWithEmail(email, password, name || email.split("@")[0]);
        if (res.ok) {
          toast.success("Account created successfully! Adding kit to your bag...");
          onClose();
          onSuccess();
        } else {
          toast.error(res.error || "Sign up failed.");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleQuickDemo = () => {
    loginDemo("customer");
    toast.success("Signed in with test profile! Adding kit to bag...");
    onClose();
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed backdrop with heavy blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Frosted Glass Floating Card */}
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/15 bg-[#141412]/80 backdrop-blur-2xl backdrop-saturate-200 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] z-10 space-y-4 animate-in zoom-in-95 duration-200">
        {/* Ambient Gold Glow orb */}
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between relative">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/20 border border-primary/30 text-primary shadow-inner">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <b className="font-display text-lg tracking-wide block text-foreground">
                ELEVEN<span className="text-primary">X</span> <span className="text-xs font-sans text-muted-foreground font-light">KIT</span>
              </b>
              <span className="text-[10px] text-primary uppercase font-bold tracking-wider">
                Authentication Required
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Titles */}
        <div className="space-y-1 relative">
          <h3 className="font-display text-xl font-bold text-foreground">
            {mode === "signin" ? title : "Create an ElevenX Account"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {mode === "signin"
              ? subtitle
              : "Register to keep your customized jerseys saved in the cloud and track match-day deliveries."}
          </p>
        </div>

        {/* 1-Click Instant Test Access */}
        <button
          type="button"
          onClick={handleQuickDemo}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 transition text-xs text-primary font-bold group"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>1-Click Instant Demo Sign In</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
        </button>

        {/* Frosted Glass Form */}
        <form onSubmit={handleSubmit} className="space-y-3 relative pt-1">
          {mode === "signup" && (
            <div>
              <label className="field-label text-[11px]">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Samuel Mugerwa"
                  className="field text-xs py-2 pl-9 bg-black/40 border-white/10 focus:border-primary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}

          <div>
            <label className="field-label text-[11px]">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="you@domain.com"
                className="field text-xs py-2 pl-9 bg-black/40 border-white/10 focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div>
            <label className="field-label text-[11px]">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                className="field text-xs py-2 pl-9 bg-black/40 border-white/10 focus:border-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-gold full text-xs py-3 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary/20"
          >
            {busy
              ? "AUTHENTICATING..."
              : mode === "signin"
              ? "SIGN IN & ADD TO CART"
              : "CREATE ACCOUNT & ADD TO CART"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <div className="text-center text-xs text-muted-foreground pt-1 border-t border-white/10">
          {mode === "signin" ? (
            <p>
              Don't have an account yet?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-bold text-primary hover:underline ml-1"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-bold text-primary hover:underline ml-1"
              >
                Sign in here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
