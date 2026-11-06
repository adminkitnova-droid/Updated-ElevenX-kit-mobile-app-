import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  getFirebaseDb,
  uploadFirebaseUserAvatar,
  updateUserFirestoreProfile,
  fetchUserFirestoreProfile
} from "@/lib/firebase";
import {
  User,
  Shield,
  Phone,
  MapPin,
  LogOut,
  Camera,
  Upload,
  Check,
  X,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";

type Profile = {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  email: string | null;
  avatarUrl?: string | null;
};

const AVATAR_PRESETS = [
  {
    id: "striker",
    name: "Golden Striker #9",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    badge: "⚽ Striker #9",
  },
  {
    id: "playmaker",
    name: "Playmaker Maestro #10",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    badge: "🎯 Number 10",
  },
  {
    id: "champion",
    name: "ElevenX Champion",
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80",
    badge: "👑 Elite Crown",
  },
  {
    id: "cranes",
    name: "Cranes Pride",
    url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=256&h=256&q=80",
    badge: "🇺🇬 Cranes Pro",
  },
  {
    id: "winger",
    name: "Electric Winger #7",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    badge: "⚡ Winger #7",
  },
  {
    id: "keeper",
    name: "Guardian Keeper #1",
    url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&h=256&q=80",
    badge: "🧤 Keeper #1",
  },
  {
    id: "retro",
    name: "Heritage Legend",
    url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80",
    badge: "⭐ Vintage Kit",
  },
  {
    id: "captain",
    name: "Club Captain",
    url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80",
    badge: "🛡️ Skipper",
  },
];

export function AccountSection() {
  const { user, roles, loading, signOut, updateUserAvatar, updateUserProfileData } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [p, setP] = useState<Profile>({
    full_name: "",
    phone: "",
    address: "",
    city: "Kampala",
    email: null,
    avatarUrl: null,
  });

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const initialProfile: Profile = {
      full_name: user.displayName || user.user_metadata?.full_name || "",
      phone: user.user_metadata?.phone || "+256 700 000 000",
      address: user.user_metadata?.address || "Kololo, Kampala",
      city: user.user_metadata?.city || "Kampala",
      email: user.email,
      avatarUrl: user.photoURL || user.user_metadata?.avatarUrl || null,
    };

    void fetchUserFirestoreProfile(user.id)
      .then((data) => {
        if (data) {
          setP({
            full_name: data.full_name || data.displayName || initialProfile.full_name,
            phone: data.phone || initialProfile.phone,
            address: data.address || initialProfile.address,
            city: data.city || initialProfile.city,
            email: user.email,
            avatarUrl: data.avatarUrl || data.photoURL || initialProfile.avatarUrl,
          });
        } else {
          setP(initialProfile);
        }
      })
      .catch(() => setP(initialProfile));
  }, [user]);

  if (loading) return <div className="panel animate-pulse h-28" />;

  if (!user) {
    return (
      <div className="panel p-6 text-center">
        <h2 className="text-lg font-bold">Sign In to Your Account</h2>
        <p className="muted mb-4 mt-1 text-xs">
          Synchronize your customized jerseys, profile avatar, delivery addresses, and real-time order tracking.
        </p>
        <Link to="/auth" className="btn-gold inline-block text-xs py-2 px-5">
          SIGN IN / REGISTER
        </Link>
      </div>
    );
  }

  const handleOpenAvatarModal = () => {
    setSelectedAvatarUrl(p.avatarUrl || null);
    setShowAvatarModal(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar image must be under 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const downloadOrDataUrl = await uploadFirebaseUserAvatar(user.id, file);
      setSelectedAvatarUrl(downloadOrDataUrl);
      toast.success("Avatar preview loaded! Click 'Save Avatar' to sync to Firestore.");
    } catch (err: any) {
      toast.error("Failed to load avatar image: " + (err?.message || "Unknown error"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmAvatar = async () => {
    const nextUrl = selectedAvatarUrl;
    setP((prev) => ({ ...prev, avatarUrl: nextUrl }));
    await updateUserAvatar(nextUrl || "");
    setShowAvatarModal(false);
    toast.success("Avatar updated and synchronized with your Firebase profile!");
  };

  const handleRemoveAvatar = async () => {
    setSelectedAvatarUrl(null);
    setP((prev) => ({ ...prev, avatarUrl: null }));
    await updateUserAvatar("");
    setShowAvatarModal(false);
    toast.success("Avatar removed. Default initials restored.");
  };

  const save = async () => {
    await updateUserProfileData({
      full_name: p.full_name,
      phone: p.phone,
      address: p.address,
      city: p.city,
      avatarUrl: p.avatarUrl || undefined,
    });
    toast.success("Profile saved and synchronized with Firebase!");
  };

  const set = (patch: Partial<Profile>) => setP({ ...p, ...patch });

  return (
    <>
      {/* Profile Header Card */}
      <div className="panel p-5 rounded-2xl bg-gradient-to-r from-card via-card to-surface border border-gold-line/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          {/* Avatar Ring with Quick Edit Badge */}
          <div className="relative group">
            <div
              onClick={handleOpenAvatarModal}
              className="relative h-18 w-18 sm:h-20 sm:w-20 rounded-full border-2 border-gold-line shadow-2xl overflow-hidden cursor-pointer bg-[#141412] flex items-center justify-center transition group-hover:scale-105 group-hover:border-primary"
              title="Click to upload or choose an avatar"
            >
              {p.avatarUrl ? (
                <img
                  src={p.avatarUrl}
                  alt={p.full_name || "Profile avatar"}
                  className="h-full w-full object-cover rounded-full"
                  onError={() => setP((prev) => ({ ...prev, avatarUrl: null }))}
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary via-primary/80 to-amber-600 text-2xl font-black text-primary-foreground select-none">
                  {(p.full_name || user.email || "E").charAt(0).toUpperCase()}
                </div>
              )}

              {/* Hover Camera Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] font-bold gap-1">
                <Camera className="h-4 w-4 text-primary" />
                <span>Change</span>
              </div>
            </div>

            {/* Camera Badge Icon */}
            <button
              onClick={handleOpenAvatarModal}
              className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground border-2 border-card shadow hover:scale-110 transition"
              title="Upload or pick avatar"
              aria-label="Upload or pick avatar"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight text-foreground">
                {p.full_name || "ElevenX Customer"}
              </h2>
              {!!roles.length && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {roles.join(" • ")}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
              <button
                onClick={handleOpenAvatarModal}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Change Avatar
              </button>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Synced to Firestore
              </span>
            </div>
          </div>
        </div>

        <button
          className="btn-outline text-xs py-2 px-4 m-0 flex items-center gap-1.5 shrink-0"
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>

      {/* AVATAR SELECTOR & UPLOAD MODAL */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gold-line/60 bg-[#161513] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Customize Profile Avatar
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Upload your own photo or pick an authentic matchday preset
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Selection Live Preview */}
            <div className="flex items-center justify-between rounded-2xl bg-surface/80 border border-border p-3.5">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full border-2 border-primary overflow-hidden bg-card flex items-center justify-center shrink-0 shadow-md">
                  {selectedAvatarUrl ? (
                    <img
                      src={selectedAvatarUrl}
                      alt="Selected Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-primary text-xl font-bold text-primary-foreground">
                      {(p.full_name || user.email || "E").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold block text-foreground">
                    {selectedAvatarUrl ? "Active Avatar Preview" : "Default Initials"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Will be stored in your Firestore user document
                  </span>
                </div>
              </div>

              {selectedAvatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg border border-red-500/20 transition"
                  title="Remove avatar and use initials"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>

            {/* 1. UPLOAD CUSTOM PHOTO SECTION */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Option 1: Upload Custom Photo
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-border hover:border-primary rounded-2xl p-4 text-center cursor-pointer transition bg-card/60 hover:bg-card flex flex-col items-center justify-center gap-2"
              >
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition">
                  {isUploading ? (
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <b className="text-xs text-foreground group-hover:text-primary transition block">
                    {isUploading ? "Uploading to Cloud Storage..." : "Click to Browse or Drop Photo"}
                  </b>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Supports PNG, JPG or WebP (Max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* 2. CURATED FOOTBALL AVATAR PRESETS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Option 2: Select Matchday Preset
                </label>
                <span className="text-[10px] text-primary font-mono font-medium">8 Pro Avatars</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = selectedAvatarUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedAvatarUrl(preset.url)}
                      className={`relative flex flex-col items-center p-2 rounded-2xl border text-center transition group ${
                        isSelected
                          ? "border-primary bg-primary/15 shadow-lg ring-2 ring-primary/40"
                          : "border-border bg-card/60 hover:bg-card hover:border-gold-line/60"
                      }`}
                    >
                      <div className="relative h-14 w-14 rounded-full overflow-hidden border border-border shadow group-hover:scale-105 transition mb-1.5">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="h-full w-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center text-primary-foreground">
                            <div className="grid h-5 w-5 place-items-center rounded-full bg-primary text-black">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-foreground truncate w-full">
                        {preset.name}
                      </span>
                      <span className="text-[9px] text-primary font-mono mt-0.5">
                        {preset.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="btn-outline text-xs py-2 px-4 m-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAvatar}
                className="btn-gold text-xs py-2 px-5 flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Save Avatar to Firebase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personal & Delivery Details */}
      <div className="section-title">Delivery & Personal Information</div>
      <div className="panel space-y-3">
        <div>
          <label className="field-label text-xs">Full Name</label>
          <input
            className="field text-xs py-2"
            value={p.full_name}
            onChange={(e) => set({ full_name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label text-xs">Phone Number</label>
            <input
              className="field text-xs py-2"
              value={p.phone}
              onChange={(e) => set({ phone: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label text-xs">Primary City</label>
            <select
              className="field text-xs py-2"
              value={p.city}
              onChange={(e) => set({ city: e.target.value })}
            >
              <option value="Kampala">Kampala</option>
              <option value="Wakiso">Wakiso</option>
              <option value="Entebbe">Entebbe</option>
              <option value="Mukono">Mukono</option>
              <option value="Jinja">Jinja</option>
            </select>
          </div>
        </div>

        <div>
          <label className="field-label text-xs">Physical Delivery Address</label>
          <input
            className="field text-xs py-2"
            value={p.address}
            placeholder="Plot, Street, Building, or Landmark"
            onChange={(e) => set({ address: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <button className="btn-gold text-xs py-2 px-5" onClick={save}>
            SAVE PROFILE
          </button>
          <span className="text-[11px] text-muted-foreground">
            Auto-synced with Firestore profile
          </span>
        </div>
      </div>
    </>
  );
}
