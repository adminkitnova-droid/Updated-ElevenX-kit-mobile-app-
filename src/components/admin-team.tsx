import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { Shield, User, Bike, Check, X, UserCheck } from "lucide-react";

type Person = { id: string; email: string | null; full_name: string; phone: string; city: string; created_at: string; role?: string };
type Application = { user_id: string; full_name: string; phone: string; area: string; status: string };

const DEFAULT_MEMBERS: Person[] = [
  { id: "admin_1", email: "adminelevenx@gmail.com", full_name: "Super Admin ElevenX", phone: "+256 700 111 222", city: "Kampala", created_at: "2024-01-15", role: "super_admin" },
  { id: "admin_2", email: "manager@elevenx.com", full_name: "Operations Manager", phone: "+256 772 333 444", city: "Entebbe", created_at: "2024-03-20", role: "admin" },
  { id: "rider_1", email: "rider@elevenx.com", full_name: "Express Rider Dan", phone: "+256 772 888 999", city: "Kampala Central", created_at: "2024-04-10", role: "rider" },
  { id: "cust_1", email: "customer@example.com", full_name: "Brian Kasirye", phone: "+256 782 555 123", city: "Bukoto", created_at: "2024-05-01", role: "customer" },
];

const DEFAULT_APPS: Application[] = [
  { user_id: "app_1", full_name: "Joseph Mukisa", phone: "+256 701 445 667", area: "Ntinda / Kiwatule / Kira", status: "pending" },
  { user_id: "app_2", full_name: "Grace Auma", phone: "+256 752 990 112", area: "Entebbe Road & Kajjansi", status: "approved" },
];

export function AdminTeam({ view }: { view: "customers" | "applications" | "admins" }) {
  const { roles: myRoles, user } = useAuth();
  const superAdmin = myRoles.includes("super_admin") || myRoles.includes("admin");
  const [people, setPeople] = useState<Person[]>(DEFAULT_MEMBERS);
  const [apps, setApps] = useState<Application[]>(DEFAULT_APPS);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const snap = await getDocs(collection(db, "users"));
      if (!snap.empty) {
        const loaded = snap.docs.map((d) => {
          const val = d.data();
          return {
            id: d.id,
            email: val.email || "user@elevenx.com",
            full_name: val.displayName || val.full_name || "Customer",
            phone: val.phone || "+256 700 000 000",
            city: val.city || val.address || "Kampala",
            created_at: val.createdAt || "2024-06-01",
            role: val.role || "customer",
          };
        });
        setPeople(loaded);
      }
    } catch (e) {
      console.warn("Could not load users from Firestore, using cache:", e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleAdmin = async (person: Person, makeAdmin: boolean) => {
    const nextRole = makeAdmin ? "admin" : "customer";
    setPeople((prev) =>
      prev.map((p) => (p.id === person.id ? { ...p, role: nextRole } : p))
    );
    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(doc(db, "users", person.id), { role: nextRole }, { merge: true });
      } catch {}
    }
    toast.success(makeAdmin ? `${person.full_name} granted Admin role` : `Admin role revoked for ${person.full_name}`);
  };

  const decideApp = (appUserId: string, approve: boolean) => {
    setApps((prev) =>
      prev.map((a) =>
        a.user_id === appUserId ? { ...a, status: approve ? "approved" : "rejected" } : a
      )
    );
    toast.success(approve ? "Rider application approved!" : "Rider application rejected.");
  };

  if (loading) return <div className="panel h-24 animate-pulse" />;

  if (view === "applications") {
    return (
      <div className="space-y-3">
        {!apps.length && <p className="muted">No rider applications currently pending.</p>}
        {apps.map((a) => (
          <div key={a.user_id} className="panel flex flex-col gap-2">
            <div className="section-row">
              <b className="text-sm font-semibold">{a.full_name}</b>
              <span className={`pill text-[10px] ${a.status === "approved" ? "active" : ""}`}>
                {a.status.toUpperCase()}
              </span>
            </div>
            <p className="muted text-xs">{a.phone} • Assigned delivery territory: {a.area}</p>
            {a.status === "pending" && (
              <div className="flex gap-2 pt-2">
                <button
                  className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1.5"
                  onClick={() => decideApp(a.user_id, true)}
                >
                  <Check className="h-3.5 w-3.5" /> Approve Rider
                </button>
                <button
                  className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 m-0"
                  onClick={() => decideApp(a.user_id, false)}
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (view === "admins") {
    return (
      <div className="space-y-3">
        <p className="muted text-xs">Configure administrators and permissions synchronized in Firebase.</p>
        {people.map((p) => {
          const isAdmin = p.role === "admin" || p.role === "super_admin";
          const isSuper = p.role === "super_admin";
          return (
            <div key={p.id} className="panel section-row">
              <div>
                <b className="text-sm font-semibold">{p.full_name}</b>
                <p className="muted text-xs">{p.email}</p>
                <small className="gold font-bold text-[10px] uppercase tracking-wider block mt-1">
                  {isSuper ? "Super Administrator" : isAdmin ? "Administrator" : "Customer Account"}
                </small>
              </div>
              {!isSuper && p.id !== user?.id && (
                <div>
                  {isAdmin ? (
                    <button
                      className="btn-outline text-xs py-1.5 px-3 m-0 text-red-400 border-red-500/30"
                      onClick={() => toggleAdmin(p, false)}
                    >
                      Revoke Admin
                    </button>
                  ) : (
                    <button
                      className="btn-gold text-xs py-1.5 px-3"
                      onClick={() => toggleAdmin(p, true)}
                    >
                      Make Admin
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="muted text-xs">{people.length} registered customers in database</p>
      {people.map((p) => (
        <div key={p.id} className="panel">
          <div className="flex items-center justify-between">
            <b className="text-sm font-semibold">{p.full_name}</b>
            <span className="text-[10px] text-muted-foreground uppercase">{p.role || "Customer"}</span>
          </div>
          <p className="muted text-xs mt-1">{p.email} • {p.phone} • {p.city}</p>
        </div>
      ))}
    </div>
  );
}
