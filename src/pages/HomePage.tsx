import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Page, ProductCard } from "@/components/shell";
import { fetchFirebaseHeroSettings, type FirebaseHeroSettings } from "@/lib/firebase";
import { useStore } from "@/lib/store";
import { Sparkles, ArrowRight, ShieldCheck, Truck, RefreshCw, Shirt } from "lucide-react";

export function HomePage() {
  const { products, viewed } = useStore();
  const navigate = useNavigate();
  const [hero, setHero] = useState<FirebaseHeroSettings>({});

  useEffect(() => {
    void fetchFirebaseHeroSettings().then(setHero).catch(() => undefined);
  }, []);

  return (
    <Page>
      {/* Hero Banner with Live Video Background */}
      <div className="hero relative overflow-hidden shadow-2xl min-h-[340px] sm:min-h-[400px]">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-40 brightness-75 scale-105 pointer-events-none"
          src={hero.videoUrl || "/loading-bg.mp4"}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30 pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <span className="pill text-[11px] font-bold">2024/2025 MATCH DAY COLLECTION</span>
          <h1 className="mb-2 mt-4 font-display text-[38px] leading-tight tracking-wide md:text-[54px] font-extrabold">
            {hero.title || (
              <>
                WEAR YOUR
                <br />
                <em className="not-italic text-primary">PASSION.</em>
              </>
            )}
          </h1>
          <p className="mb-5 text-[13px] text-muted-foreground sm:text-sm">
            {hero.subtitle || "Premium authentic football kits & bespoke personalization. Designed for the pitch and the street."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to={hero.ctaUrl || "/search"} className="btn-gold inline-flex items-center gap-2 text-xs py-3 px-5">
              {hero.ctaLabel || "SHOP JERSEYS"} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 rounded-xl border border-gold-line bg-card/80 px-4 py-3 text-xs font-bold text-foreground backdrop-blur hover:border-primary transition"
            >
              <Shirt className="h-4 w-4 text-primary" />
              Custom Studio
            </Link>
          </div>
        </div>

        <div className="relative z-10 hidden sm:block text-[110px] opacity-75 select-none drop-shadow-2xl">
          ⚽
        </div>
      </div>

      {/* Trust badges */}
      <div className="my-6 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card/50 p-3 text-center sm:gap-4 sm:p-4">
        <div className="flex flex-col items-center gap-1">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-[11px] font-bold text-foreground">100% Authentic Quality</span>
          <small className="text-[9px] text-muted-foreground hidden sm:block">Grade-A breathable stadium mesh</small>
        </div>
        <div className="flex flex-col items-center gap-1 border-x border-border/60">
          <Truck className="h-5 w-5 text-primary" />
          <span className="text-[11px] font-bold text-foreground">Express Same-Day</span>
          <small className="text-[9px] text-muted-foreground hidden sm:block">Kampala & Entebbe express dispatch</small>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-[11px] font-bold text-foreground">Custom Name & Number</span>
          <small className="text-[9px] text-muted-foreground hidden sm:block">Precision heat-press personalization</small>
        </div>
      </div>

      {/* Shop by Collection */}
      <div className="section-title">Shop by Collection</div>
      <div className="chips">
        {["All", "Club", "National"].map((c) => (
          <button
            key={c}
            className="pill transition hover:scale-105"
            onClick={() => navigate(`/search?category=${c}`)}
          >
            {c === "All" ? "All Jerseys" : c + " Teams"}
          </button>
        ))}
        <Link to="/studio" className="pill active transition hover:scale-105 inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Custom Studio
        </Link>
      </div>

      {/* Featured Jerseys */}
      <div className="section-row mt-6">
        <div className="section-title my-0">Featured Kits</div>
        <Link to="/search" className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="product-grid mt-3">
        {products.slice(0, 4).map((p: any) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>

      {/* Custom Studio Teaser Banner */}
      <section className="my-8 rounded-2xl border border-gold-line bg-gradient-to-r from-card via-[#1c1914] to-card p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="pill text-[10px]">BESPOKE WORKSHOP</span>
          <h2 className="font-display text-2xl md:text-3xl font-bold">Personalize Any Kit in 60 Seconds</h2>
          <p className="text-xs text-muted-foreground max-w-md">
            Type your official player name, pick your squad number, upload custom badges or sponsor crests, and see a live 2D preview.
          </p>
        </div>
        <Link to="/studio" className="btn-gold shrink-0 text-xs py-3 px-6 inline-flex items-center gap-2">
          LAUNCH PERSONALIZATION STUDIO <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Recently Viewed */}
      <div className="section-title">Recently Viewed</div>
      <div className="chips">
        {!viewed.length && (
          <span className="muted">Your recently viewed jerseys will appear here as you browse.</span>
        )}
        {viewed.map((id: number) => {
          const p = products.find((x: any) => x.id === id);
          return p ? (
            <Link key={id} className="pill transition hover:scale-105" to={`/product/${id}`}>
              {p.name}
            </Link>
          ) : null;
        })}
      </div>
    </Page>
  );
}
