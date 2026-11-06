import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Page } from "@/components/shell";
import { useAuth, type Role } from "@/lib/auth";
import { ShieldCheck, Truck, ArrowRight, UserCheck } from "lucide-react";

export function PortalGate({ role, children, fallback }: { role: Role; children: ReactNode; fallback?: ReactNode }) {
  const { user, roles, loading, loginDemo } = useAuth();
  const login = role === "rider" ? "/rider-login" : "/admin-login";

  if (loading) {
    return (
      <Page>
        <div className="panel h-32 animate-pulse bg-card/60" />
      </Page>
    );
  }

  const hasAccess = roles.includes(role) || (role === "admin" && roles.includes("super_admin"));

  if (!user) {
    return (
      <Page>
        <div className="panel mx-auto max-w-[440px] text-center p-6 border-gold-line">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            {role === "rider" ? <Truck className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <h2 className="font-display text-2xl font-bold">Sign In Required</h2>
          <p className="muted mb-4 mt-1">
            This portal is restricted to {role === "rider" ? "authorized dispatch riders" : "store management administrators"}.
          </p>
          <div className="space-y-2">
            <Link to={login} className="btn-gold full inline-block text-center">
              SIGN IN AS {role.toUpperCase()}
            </Link>
            <button
              onClick={() => loginDemo(role === "rider" ? "rider" : "admin")}
              className="btn-outline full inline-flex items-center justify-center gap-2 text-xs"
            >
              <UserCheck className="h-4 w-4" />
              Instant {role === "rider" ? "Rider" : "Admin"} Demo Mode
            </button>
          </div>
        </div>
      </Page>
    );
  }

  if (!hasAccess) {
    return (
      <>
        {fallback ?? (
          <Page>
            <div className="panel mx-auto max-w-[440px] text-center p-6">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="font-display text-2xl font-bold">Elevated Access Required</h2>
              <p className="muted mb-4 mt-1">
                Your current account ({user.email || user.displayName}) does not have the <b>{role}</b> role assigned in Firebase.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => loginDemo(role === "rider" ? "rider" : "admin")}
                  className="btn-gold full inline-flex items-center justify-center gap-2 text-xs"
                >
                  Switch to Demo {role === "rider" ? "Rider" : "Admin"} Account
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link to="/profile" className="btn-outline full inline-block text-center text-xs">
                  Back to My Profile
                </Link>
              </div>
            </div>
          </Page>
        )}
      </>
    );
  }

  return <>{children}</>;
}
