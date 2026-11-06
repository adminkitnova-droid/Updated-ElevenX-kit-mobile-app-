import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isFirebaseConfigured,
  updateUserFirestoreProfile,
  fetchUserFirestoreProfile
} from "@/lib/firebase";

export type Role = "super_admin" | "admin" | "rider" | "customer";

export type AppUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  user_metadata: {
    full_name?: string | null;
    phone?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
    city?: string | null;
  };
};

type AuthCtx = {
  user: AppUser | null;
  roles: Role[];
  loading: boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
  loginDemo: (role: "admin" | "rider" | "customer") => void;
  signInWithEmail: (email: string, pass: string) => Promise<{ ok: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  updateUserAvatar: (avatarUrl: string) => Promise<void>;
  updateUserProfileData: (patch: { full_name?: string; phone?: string; address?: string; city?: string; avatarUrl?: string }) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const DEMO_USERS: Record<string, { user: AppUser; roles: Role[] }> = {
  admin: {
    user: {
      id: "demo_admin_11x",
      email: "adminelevenx@gmail.com",
      displayName: "ElevenX Admin",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      user_metadata: {
        full_name: "ElevenX Lead Admin",
        phone: "+256 700 111 222",
        address: "Plot 11 Sportswear Plaza, Kampala",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
        city: "Kampala",
      },
    },
    roles: ["admin", "super_admin"],
  },
  rider: {
    user: {
      id: "demo_rider_11x",
      email: "rider@elevenx.com",
      displayName: "Express Rider Dan",
      photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
      user_metadata: {
        full_name: "Dan Okello",
        phone: "+256 772 888 999",
        address: "Central Dispatch Station 3",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
        city: "Kampala",
      },
    },
    roles: ["rider"],
  },
  customer: {
    user: {
      id: "demo_customer_11x",
      email: "customer@example.com",
      displayName: "Brian K.",
      photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80",
      user_metadata: {
        full_name: "Brian Kasirye",
        phone: "+256 782 555 123",
        address: "Bukoto Street, Kampala",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80",
        city: "Kampala",
      },
    },
    roles: ["customer"],
  },
};

const LOCAL_AUTH_KEY = "elevenx_active_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_AUTH_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default to logged in as demo customer for a great first experience
    return DEMO_USERS.customer.user;
  });

  const [roles, setRoles] = useState<Role[]>(() => {
    try {
      const saved = localStorage.getItem("elevenx_active_roles");
      if (saved) return JSON.parse(saved);
    } catch {}
    return ["customer"];
  });

  const [loading, setLoading] = useState(false);

  // Sync with real Firebase Auth if keys are valid
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    try {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          let avatarUrl = fbUser.photoURL || null;
          let fullName = fbUser.displayName || null;
          let userRoles: Role[] = ["customer"];
          if (fbUser.email === "adminelevenx@gmail.com") {
            userRoles = ["admin", "super_admin"];
          }

          // Fetch user profile and role from Firestore if exists
          const db = getFirebaseDb();
          if (db) {
            try {
              const snap = await getDoc(doc(db, "users", fbUser.uid));
              if (snap.exists()) {
                const data = snap.data();
                if (data.avatarUrl || data.photoURL) avatarUrl = data.avatarUrl || data.photoURL;
                if (data.full_name || data.displayName) fullName = data.full_name || data.displayName;
                if (data.role) userRoles = [data.role as Role];
                if (Array.isArray(data.roles)) userRoles = data.roles as Role[];
              }
            } catch (err) {
              console.warn("Could not load Firestore profile:", err);
            }
          }

          const appUser: AppUser = {
            id: fbUser.uid,
            email: fbUser.email,
            displayName: fullName || fbUser.email?.split("@")[0] || "User",
            photoURL: avatarUrl,
            user_metadata: {
              full_name: fullName,
              avatarUrl: avatarUrl,
            },
          };

          setUser(appUser);
          setRoles(userRoles);
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(appUser));
          localStorage.setItem("elevenx_active_roles", JSON.stringify(userRoles));
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase Auth listener notice:", e);
    }
  }, []);

  const loginDemo = useCallback((portal: "admin" | "rider" | "customer") => {
    const preset = DEMO_USERS[portal];
    if (preset) {
      setUser(preset.user);
      setRoles(preset.roles);
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(preset.user));
      localStorage.setItem("elevenx_active_roles", JSON.stringify(preset.roles));
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      return;
    }
    const db = getFirebaseDb();
    if (db) {
      try {
        const snap = await getDoc(doc(db, "users", user.id));
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.roles)) setRoles(data.roles as Role[]);
          else if (data.role) setRoles([data.role as Role]);
        }
      } catch {}
    }
  }, [user]);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.warn("Firebase signout notice:", e);
      }
    }
    setUser(null);
    setRoles([]);
    localStorage.removeItem(LOCAL_AUTH_KEY);
    localStorage.removeItem("elevenx_active_roles");
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    const auth = getFirebaseAuth();
    if (auth && isFirebaseConfigured()) {
      try {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        const appUser: AppUser = {
          id: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || email.split("@")[0],
          user_metadata: { full_name: res.user.displayName },
        };
        setUser(appUser);
        let userRoles: Role[] = ["customer"];
        if (email.toLowerCase() === "adminelevenx@gmail.com" || email.toLowerCase().includes("admin")) {
          userRoles = ["admin", "super_admin"];
        } else if (email.toLowerCase().includes("rider")) {
          userRoles = ["rider"];
        }
        setRoles(userRoles);
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(appUser));
        localStorage.setItem("elevenx_active_roles", JSON.stringify(userRoles));
        return { ok: true, roles: userRoles };
      } catch (err: any) {
        return { ok: false, error: err.message || "Failed to sign in" };
      }
    }
    // Offline / demo instant login
    const isMockAdmin = email.toLowerCase().includes("admin");
    const isMockRider = email.toLowerCase().includes("rider");
    const role: Role = isMockAdmin ? "admin" : isMockRider ? "rider" : "customer";
    const appUser: AppUser = {
      id: "user_" + Math.random().toString(36).substring(2, 9),
      email,
      displayName: email.split("@")[0],
      user_metadata: { full_name: email.split("@")[0] },
    };
    setUser(appUser);
    setRoles([role]);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(appUser));
    localStorage.setItem("elevenx_active_roles", JSON.stringify([role]));
    return { ok: true };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string, name: string) => {
    const auth = getFirebaseAuth();
    if (auth && isFirebaseConfigured()) {
      try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        const appUser: AppUser = {
          id: res.user.uid,
          email: res.user.email,
          displayName: name,
          user_metadata: { full_name: name },
        };
        setUser(appUser);
        const db = getFirebaseDb();
        if (db) {
          await setDoc(doc(db, "users", res.user.uid), {
            id: res.user.uid,
            email,
            displayName: name,
            role: "customer",
            createdAt: new Date().toISOString(),
          });
        }
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(appUser));
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.message || "Failed to create account" };
      }
    }
    const appUser: AppUser = {
      id: "user_" + Math.random().toString(36).substring(2, 9),
      email,
      displayName: name,
      user_metadata: { full_name: name },
    };
    setUser(appUser);
    setRoles(["customer"]);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(appUser));
    return { ok: true };
  }, []);

  const updateUserAvatar = useCallback(async (avatarUrl: string) => {
    if (!user) return;
    const updated: AppUser = {
      ...user,
      photoURL: avatarUrl,
      user_metadata: {
        ...user.user_metadata,
        avatarUrl,
      },
    };
    setUser(updated);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(updated));

    // Update in Firebase Auth if real user
    const auth = getFirebaseAuth();
    if (auth?.currentUser) {
      try {
        await updateProfile(auth.currentUser, { photoURL: avatarUrl });
      } catch (err) {
        console.warn("Auth updateProfile notice:", err);
      }
    }

    // Sync to Firestore profile document
    await updateUserFirestoreProfile(user.id, {
      avatarUrl,
      photoURL: avatarUrl,
    });
  }, [user]);

  const updateUserProfileData = useCallback(async (patch: { full_name?: string; phone?: string; address?: string; city?: string; avatarUrl?: string }) => {
    if (!user) return;
    const updated: AppUser = {
      ...user,
      displayName: patch.full_name || user.displayName,
      photoURL: patch.avatarUrl ?? user.photoURL,
      user_metadata: {
        ...user.user_metadata,
        ...patch,
      },
    };
    setUser(updated);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(updated));

    const auth = getFirebaseAuth();
    if (auth?.currentUser) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: patch.full_name || auth.currentUser.displayName,
          ...(patch.avatarUrl ? { photoURL: patch.avatarUrl } : {}),
        });
      } catch (err) {
        console.warn("Auth updateProfile notice:", err);
      }
    }

    await updateUserFirestoreProfile(user.id, patch);
  }, [user]);

  const value: AuthCtx = {
    user,
    roles,
    loading,
    refreshRoles,
    signOut,
    loginDemo,
    signInWithEmail,
    signUpWithEmail,
    updateUserAvatar,
    updateUserProfileData,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const context = useContext(Ctx);
  if (!context) throw new Error("useAuth outside AuthProvider");
  return context;
}

export function homeFor(roles: Role[], portal: "customer" | "admin" | "rider") {
  if (portal === "admin") return roles.includes("admin") || roles.includes("super_admin") ? "/admin" : "/profile";
  if (portal === "rider") return roles.includes("rider") ? "/rider" : "/profile";
  return "/profile";
}
