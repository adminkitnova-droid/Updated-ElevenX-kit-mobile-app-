import { Link, useLocation } from "react-router-dom";
import { Crown, Heart, Home, Search, Shirt, ShoppingBag, User, Shield, Bell, CheckCircle2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ProductImage } from "@/components/product-image";
import { money, useStore, type Product } from "@/lib/store";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useNotifications } from "@/lib/notifications";
import { useAuth } from "@/lib/auth";
import { AndroidInstallButton } from "@/components/android-icon";

export function TopBar() {
  const { cartCount } = useStore();
  const { user } = useAuth();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const isFbConnected = isFirebaseConfigured();
  const { notifications, unreadCount, markAsRead, markAllAsRead, requestPermission, permission } = useNotifications();

  if (location.pathname.startsWith("/rider") || location.pathname.startsWith("/admin")) {
    return null;
  }

  const avatarUrl = user?.photoURL || user?.user_metadata?.avatarUrl;

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-border/80 bg-[#141412]/80 backdrop-blur-md backdrop-saturate-150 px-4 shadow-md">
        <Link to="/" className="flex items-center gap-2">
          <Crown className="h-7 w-7 text-primary" />
          <div>
            <b className="font-display text-2xl tracking-[1.5px]">
              ELEVEN<span className="text-primary">X</span> <span className="text-xs font-sans font-light tracking-wide text-foreground/80">KIT</span>
            </b>
            <small className="mt-0.5 block text-[8px] tracking-[1.3px] text-muted-foreground uppercase">
              ElevenX Kit Mobile App
            </small>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Android App Button */}
          <AndroidInstallButton />

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 text-primary hover:text-foreground transition rounded-lg hover:bg-surface"
              aria-label="Order notifications"
              title="Order notifications & alerts"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute 0 top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl border border-gold-line bg-card p-3 shadow-2xl z-50">
                <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold">Push Notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {permission !== "granted" && (
                  <button
                    onClick={() => void requestPermission()}
                    className="w-full mb-2 p-2 rounded-xl bg-gold-soft border border-gold-line/40 text-[11px] font-semibold text-primary hover:bg-primary/20 transition flex items-center justify-between"
                  >
                    <span>Enable device push alerts</span>
                    <span className="text-[10px] font-bold underline">Allow</span>
                  </button>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted-foreground">No alerts yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                          n.read
                            ? "border-border/60 bg-surface/50 text-muted-foreground"
                            : "border-primary/40 bg-primary/10 text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <b className="text-xs font-bold text-primary">{n.title}</b>
                          <small className="text-[9px] text-muted-foreground">{n.timestamp}</small>
                        </div>
                        <p className="text-[11px] mt-0.5 leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link to="/search" aria-label="Search" className="text-primary hover:text-foreground transition p-1">
            <Search className="h-5 w-5 sm:h-6 sm:w-6" />
          </Link>
          <Link to="/cart" aria-label="Cart" className="relative text-primary hover:text-foreground transition p-1">
            <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
            {cartCount > 0 && <CountBadge n={cartCount} />}
          </Link>

          {/* User Profile Avatar Link */}
          <Link
            to="/profile"
            aria-label="Profile"
            className="flex items-center justify-center transition p-0.5 rounded-full hover:ring-2 hover:ring-primary/60"
            title={user ? (user.displayName || user.email || "Profile") : "Sign In"}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                className="h-7 w-7 rounded-full object-cover border border-gold-line shadow"
              />
            ) : (
              <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-primary border border-primary/40 text-[11px] font-bold">
                {user ? (user.displayName || user.email || "U").charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
              </div>
            )}
          </Link>
        </div>
      </header>
    </>
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 py-0.2 text-[9px] font-bold text-primary-foreground shadow">
      {n}
    </span>
  );
}

export function BottomNav() {
  const { cartCount } = useStore();
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  if (path.startsWith("/rider") || path.startsWith("/admin")) {
    return null;
  }

  const avatarUrl = user?.photoURL || user?.user_metadata?.avatarUrl;

  const items = [
    { to: "/", label: "HOME", icon: Home },
    { to: "/search", label: "SEARCH", icon: Search },
    { to: "/studio", label: "STUDIO", icon: Shirt, studio: true },
    { to: "/cart", label: "CART", icon: ShoppingBag, badge: cartCount },
    { to: "/profile", label: "PROFILE", icon: User, hasAvatar: true },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[67px] justify-around border-t border-border/80 bg-[#141412]/85 backdrop-blur-md backdrop-saturate-150 shadow-[0_-10px_25px_rgba(0,0,0,0.85)] pb-[env(safe-area-inset-bottom)]">
      {items.map((it) => {
        const Icon = it.icon;
        const current = path === it.to;
        const studio = "studio" in it;
        const isProfileWithAvatar = "hasAvatar" in it && avatarUrl;

        return (
          <Link
            key={it.to}
            to={it.to}
            className={`relative flex min-w-[17%] flex-col items-center justify-center gap-1 transition ${
              current ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            } ${
              studio
                ? "-translate-y-2 h-[58px] w-[58px] min-w-0 self-start rounded-2xl border border-gold-line bg-[#1f1b13] shadow-xl"
                : ""
            }`}
          >
            {isProfileWithAvatar ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className={`h-5 w-5 rounded-full object-cover border ${current ? "border-primary ring-1 ring-primary" : "border-muted-foreground/60"}`}
              />
            ) : (
              <Icon className={studio ? "h-6 w-6 text-primary" : "h-5 w-5"} />
            )}
            <small className="text-[9px] tracking-wide font-medium">{it.label}</small>
            {"badge" in it && it.badge > 0 && <CountBadge n={it.badge} />}
          </Link>
        );
      })}
    </nav>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-[1100px] px-4 pb-24 pt-4">{children}</main>;
}

export function ProductCard({ p }: { p: Product }) {
  const { favourites, toggleFav, addToCart } = useStore();
  const fav = favourites.includes(p.id);

  return (
    <article className="group relative overflow-hidden rounded-[14px] border border-border bg-card pb-2.5 transition-all hover:border-gold-line">
      <button
        aria-label="Favourite"
        onClick={() => toggleFav(p.id)}
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/85 text-primary backdrop-blur-sm transition hover:scale-110"
      >
        <Heart className="h-4 w-4" fill={fav ? "currentColor" : "none"} />
      </button>

      <Link to={`/product/${p.id}`} className="block">
        <ProductImage src={p.image} alt={p.name} />
        <div className="flex flex-col gap-1 p-2.5">
          <small className="text-primary font-semibold text-[11px] uppercase tracking-wider">{p.team}</small>
          <b className="text-[13px] line-clamp-1 group-hover:text-primary transition">{p.name}</b>
          <strong className="text-primary font-display text-base">{money(p.price)}</strong>
        </div>
      </Link>

      <div className="flex items-center gap-2 px-2.5">
        <button
          onClick={() => addToCart(p, "M")}
          className="flex-1 rounded-lg bg-primary py-2 text-[11px] font-extrabold text-primary-foreground transition hover:opacity-90 active:scale-95"
        >
          QUICK ADD +
        </button>
        <Link
          to={`/studio?productId=${p.id}`}
          className="rounded-lg border border-gold-line bg-gold-soft px-2.5 py-2 text-[11px] font-bold text-primary transition hover:bg-primary/20"
          title="Customize in Studio"
        >
          <Shirt className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
