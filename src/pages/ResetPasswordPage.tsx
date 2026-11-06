import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Page } from "@/components/shell";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, KeyRound } from "lucide-react";

export function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (auth && isFirebaseConfigured()) {
        await sendPasswordResetEmail(auth, email);
      }
      setSent(true);
      toast.success("Password reset instructions sent to your email!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <div className="mx-auto max-w-[420px] pt-6 space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="panel p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold">Reset Password</h1>
            <p className="text-xs text-muted-foreground">
              Enter your registered ElevenX email to receive password recovery instructions.
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center text-xs space-y-2">
              <p className="text-emerald-300 font-semibold">Check your inbox!</p>
              <p className="text-muted-foreground">We sent a recovery link to <b>{email}</b>.</p>
              <Link to="/auth" className="btn-gold inline-block mt-2 text-xs py-2 px-4">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-3.5">
              <div>
                <label className="field-label text-xs">Email Address</label>
                <input
                  type="email"
                  required
                  className="field text-xs py-2"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button type="submit" disabled={busy} className="btn-gold full text-xs py-3">
                {busy ? "SENDING..." : "SEND PASSWORD RESET LINK"}
              </button>
            </form>
          )}
        </div>
      </div>
    </Page>
  );
}
