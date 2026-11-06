import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { Page } from "@/components/shell";
import { useAuth } from "@/lib/auth";
import { Crown, Shield, Bike, User, ArrowRight, Lock, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, signUpWithEmail, loginDemo } = useAuth();

  const isAdminRoute = location.pathname === "/admin-login";
  const isRiderRoute = location.pathname === "/rider-login";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(() => {
    if (isAdminRoute) return "adminelevenx@gmail.com";
    if (isRiderRoute) return "rider@elevenx.com";
    return "";
  });
  const [password, setPassword] = useState(() => {
    if (isAdminRoute || isRiderRoute) return "admin123456";
    return "";
  });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAdminRoute) {
      setEmail("adminelevenx@gmail.com");
      setPassword("admin123456");
      setMode("signin");
    } else if (isRiderRoute) {
      setEmail("rider@elevenx.com");
      setPassword("rider123456");
      setMode("signin");
    }
  }, [location.pathname, isAdminRoute, isRiderRoute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in email and password.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const res: any = await signInWithEmail(email, password);
        if (res.ok) {
          toast.success("Welcome back!");
          if (isAdminRoute || email.toLowerCase() === "adminelevenx@gmail.com" || email.toLowerCase().includes("admin")) {
            navigate("/admin");
          } else if (isRiderRoute || email.toLowerCase().includes("rider")) {
            navigate("/rider");
          } else {
            navigate("/profile");
          }
        } else {
          toast.error(res.error || "Sign in failed");
        }
      } else {
        const res: any = await signUpWithEmail(email, password, name || email.split("@")[0]);
        if (res.ok) {
          toast.success("Account created successfully!");
          navigate("/profile");
        } else {
          toast.error(res.error || "Sign up failed");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDemoSelect = (role: "admin" | "rider" | "customer") => {
    loginDemo(role);
    toast.success(`Logged in with demo ${role} profile!`);
    if (role === "admin") navigate("/admin");
    else if (role === "rider") navigate("/rider");
    else navigate("/profile");
  };

  return (
    <Page>
      <div className="mx-auto max-w-[420px] space-y-6 pt-4">
        <div className="text-center space-y-2">
          <div className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            {isAdminRoute ? (
              <Shield className="h-6 w-6 text-primary" />
            ) : isRiderRoute ? (
              <Bike className="h-6 w-6 text-primary" />
            ) : (
              <Crown className="h-6 w-6 text-primary" />
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isAdminRoute
              ? "Admin & Operations Portal"
              : isRiderRoute
              ? "Courier & Dispatch Portal"
              : mode === "signin"
              ? "Sign In to ElevenX"
              : "Create ElevenX Account"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAdminRoute
              ? "Secure executive management connected to Firebase Firestore & Auth"
              : isRiderRoute
              ? "Courier dispatch console for Kampala & Entebbe drop-offs"
              : mode === "signin"
              ? "Access your saved personalized jerseys and order history"
              : "Register to personalize jerseys and track match-day deliveries"}
          </p>
        </div>

        {/* Demo Fast Login Buttons */}
        <div className="rounded-2xl border border-gold-line bg-card/70 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              ⚡ 1-Click Role Switcher / Demo
            </p>
            <span className="text-[10px] text-emerald-400 font-mono">Firebase RBAC</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoSelect("customer")}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition text-xs ${
                !isAdminRoute && !isRiderRoute
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border bg-surface text-muted-foreground hover:border-primary"
              }`}
            >
              <User className="h-4 w-4 text-primary mb-1" />
              <span className="font-bold text-[10px]">Customer</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoSelect("rider")}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition text-xs ${
                isRiderRoute
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border bg-surface text-muted-foreground hover:border-primary"
              }`}
            >
              <Bike className="h-4 w-4 text-primary mb-1" />
              <span className="font-bold text-[10px]">Rider</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoSelect("admin")}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition text-xs ${
                isAdminRoute
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border bg-surface text-muted-foreground hover:border-primary"
              }`}
            >
              <Shield className="h-4 w-4 text-primary mb-1" />
              <span className="font-bold text-[10px]">Admin</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form className="panel space-y-3.5 p-5 shadow-xl" onSubmit={handleSubmit}>
          {isAdminRoute && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-[11px] text-primary flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Executive Role Binding:</strong> <span className="font-mono">adminelevenx@gmail.com</span> is granted full <code>admin</code> and <code>super_admin</code> rights.
              </div>
            </div>
          )}

          {isRiderRoute && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-400 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Courier Role Binding:</strong> Handles delivery status transitions, Google Live Map routing, and customer notifications.
              </div>
            </div>
          )}

          {mode === "signup" && !isAdminRoute && !isRiderRoute && (
            <div>
              <label className="field-label text-xs">Full Name</label>
              <input
                type="text"
                className="field text-xs py-2"
                placeholder="e.g. Samuel Mugerwa"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="field-label text-xs">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                className="field text-xs py-2 pl-9"
                placeholder={isAdminRoute ? "adminelevenx@gmail.com" : "you@domain.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div>
            <label className="field-label text-xs">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                className="field text-xs py-2 pl-9"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-gold full text-xs py-3 flex items-center justify-center gap-2 mt-2"
          >
            {busy
              ? "AUTHENTICATING..."
              : isAdminRoute
              ? "SIGN IN TO ADMIN"
              : isRiderRoute
              ? "SIGN IN TO RIDER PORTAL"
              : mode === "signin"
              ? "SIGN IN"
              : "CREATE ACCOUNT"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>

          {!isAdminRoute && !isRiderRoute && (
            <div className="pt-2 text-center text-xs text-muted-foreground">
              {mode === "signin" ? (
                <p>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-bold text-primary hover:underline"
                  >
                    Create one now
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="font-bold text-primary hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>
          )}

          <div className="border-t border-border/60 pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <Link to="/" className="hover:text-primary transition">
              &larr; Back to Store
            </Link>
            <div className="flex gap-2">
              <Link to="/admin-login" className="hover:text-primary transition underline">
                Admin
              </Link>
              <span>•</span>
              <Link to="/rider-login" className="hover:text-primary transition underline">
                Rider
              </Link>
            </div>
          </div>
        </form>
      </div>
    </Page>
  );
}
