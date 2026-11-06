import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ImagePlus,
  Move,
  RotateCcw,
  Save,
  ShoppingBag,
  Sparkles,
  Upload,
  Layers,
  Type,
  Palette,
  Check,
  ChevronDown,
  Shield,
  Crown,
  Star,
  Zap,
  Info,
  CheckCircle2,
  Lock,
  Eye,
  Sliders,
  DollarSign
} from "lucide-react";
import { Page } from "@/components/shell";
import { GlassLoginModal } from "@/components/glass-login-modal";
import { defaultDesign, useStore, type Design, money } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  saveFirebaseDesign,
  fetchFirebaseStudioSettings,
  type FirebaseStudioSettings,
  DEFAULT_STUDIO_SETTINGS,
} from "@/lib/firebase";

// Color Swatches
const COLORS = [
  { name: "White", hex: "#ffffff" },
  { name: "Gold", hex: "#c9922e" },
  { name: "Black", hex: "#111111" },
  { name: "Crimson Red", hex: "#b8202e" },
  { name: "Royal Blue", hex: "#1e40af" },
  { name: "Volt Yellow", hex: "#eab308" },
  { name: "Emerald Green", hex: "#059669" },
  { name: "Silver Grey", hex: "#94a3b8" },
];

export function StudioPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { studio, update, products, savedDesigns, addToCart, syncStudioToCloud } = useStore();
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Settings from Firestore
  const [settings, setSettings] = useState<FirebaseStudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Editor Category selection ("normal" vs "premium")
  const [selectedCategory, setSelectedCategory] = useState<"normal" | "premium">(
    studio.editorCategory || "normal"
  );
  const [hasPickedCategory, setHasPickedCategory] = useState<boolean>(
    Boolean(studio.editorCategory)
  );

  const [activeTab, setActiveTab] = useState<"name" | "style" | "artwork" | "sleeves" | "saved">("name");
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const artworkDrag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  // Load live Firestore studio settings
  useEffect(() => {
    void fetchFirebaseStudioSettings().then((res) => {
      setSettings(res);
      setSettingsLoaded(true);
    });
  }, []);

  const queryProductId = searchParams.get("productId");
  const selectedProduct =
    products.find((p: any) => String(p.id) === queryProductId) ??
    products.find((p: any) => p.id === studio.productId) ??
    products[0];

  const imageForSide = selectedProduct
    ? studio.side === "Front"
      ? selectedProduct.frontImage ?? selectedProduct.image
      : selectedProduct.backImage ?? selectedProduct.image
    : "";

  const set = (patch: Partial<Design>) =>
    update((s: any) => ({
      studio: {
        ...s.studio,
        ...patch,
        productId: selectedProduct?.id,
        productImage: imageForSide,
        frontImage: selectedProduct?.frontImage ?? selectedProduct?.image,
        backImage: selectedProduct?.backImage ?? selectedProduct?.image,
      },
    }));

  useEffect(() => {
    if (selectedProduct && (studio.productId !== selectedProduct.id || studio.productImage !== imageForSide)) {
      set({
        productId: selectedProduct.id,
        productImage: imageForSide,
        jersey: selectedProduct.team,
        frontImage: selectedProduct.frontImage ?? selectedProduct.image,
        backImage: selectedProduct.backImage ?? selectedProduct.image,
      });
    }
  }, [selectedProduct?.id, imageForSide]);

  // Compute live price breakdown based on tier and active add-ons
  const priceBreakdown = useMemo(() => {
    const isPremium = selectedCategory === "premium";
    const accessFee = isPremium ? settings.premiumEditorPrice : settings.normalEditorPrice;

    let toolCharges = 0;
    // Name & Number fee
    if (studio.name || studio.number) {
      toolCharges += isPremium ? 0 : (settings.nameNumberFee || 15000); // Included in premium
    }
    // Uploaded badge fee
    if (studio.artworkImage) {
      toolCharges += settings.customUploadFee || 10000;
    }
    // Special number styles fee
    if (isPremium && studio.numberStyle && studio.numberStyle !== "standard") {
      toolCharges += settings.specialNumberStyleFee || 10000;
    }
    // Advanced text effect
    if (isPremium && studio.textEffect && studio.textEffect !== "none") {
      toolCharges += settings.advancedTextEffectFee || 8000;
    }
    // Sleeve Patches fee
    if (studio.sleevePatches && studio.sleevePatches.length > 0) {
      toolCharges += (settings.sleeveBadgesFee || 15000) * studio.sleevePatches.length;
    }

    const totalCustomizationCost = accessFee + toolCharges;
    const baseJerseyPrice = selectedProduct?.price || 180000;
    const grandTotal = baseJerseyPrice + totalCustomizationCost;

    return {
      accessFee,
      toolCharges,
      totalCustomizationCost,
      baseJerseyPrice,
      grandTotal,
    };
  }, [selectedCategory, settings, studio, selectedProduct]);

  // Handle Dragging
  const startArtworkDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    artworkDrag.current = {
      x: studio.artworkX,
      y: studio.artworkY,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const moveArtwork = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = artworkDrag.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    set({
      artworkX: Math.max(10, Math.min(90, drag.x + ((event.clientX - drag.startX) / rect.width) * 100)),
      artworkY: Math.max(10, Math.min(90, drag.y + ((event.clientY - drag.startY) / rect.height) * 100)),
    });
  };

  const endArtworkDrag = () => {
    artworkDrag.current = null;
  };

  const uploadArtwork = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a PNG or JPG badge image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = String(e.target?.result);
      set({
        artwork: file.name.replace(/\.[^/.]+$/, ""),
        artworkImage: dataUrl,
      });
      toast.success("Badge uploaded to custom canvas!");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDesign = async () => {
    const designToSave: Design = {
      ...studio,
      editorCategory: selectedCategory,
      accessFee: priceBreakdown.accessFee,
      customizationFee: priceBreakdown.toolCharges,
      totalCustomizationCost: priceBreakdown.totalCustomizationCost,
      productId: selectedProduct?.id,
      productImage: imageForSide,
    };

    await syncStudioToCloud(designToSave);
    toast.success("Personalized design saved to Firebase savedDesigns collection!");
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    executeAddToCart();
  };

  const executeAddToCart = () => {
    if (!selectedProduct) return;

    const customizationData: Design = {
      ...studio,
      editorCategory: selectedCategory,
      accessFee: priceBreakdown.accessFee,
      customizationFee: priceBreakdown.toolCharges,
      totalCustomizationCost: priceBreakdown.totalCustomizationCost,
      productId: selectedProduct.id,
      productImage: imageForSide,
    };

    addToCart(selectedProduct, "M", customizationData);
    toast.success(`Custom ${selectedProduct.name} added to cart!`);
    navigate("/cart");
  };

  const fontsForTier = (settings.fonts || DEFAULT_STUDIO_SETTINGS.fonts!).filter(
    (f) => selectedCategory === "premium" || f.tier === "normal"
  );

  const numberStylesForTier = (settings.numberStyles || DEFAULT_STUDIO_SETTINGS.numberStyles!).filter(
    (ns) => selectedCategory === "premium" || ns.tier === "normal"
  );

  const badgesForTier = (settings.badges || DEFAULT_STUDIO_SETTINGS.badges!).filter(
    (b) => selectedCategory === "premium" || b.tier === "normal"
  );

  return (
    <Page>
      {/* 1. UPFRONT EDITOR CHOICE MODAL / BANNER */}
      {!hasPickedCategory ? (
        <div className="mx-auto max-w-2xl py-6 space-y-6">
          <div className="text-center space-y-2">
            <span className="pill text-[10px] font-bold">MATCHDAY CUSTOMIZATION STUDIO</span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              Select Customization Tier
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Choose between standard classic player printing or elite matchday stadium effects.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* CHOICE 1: NORMAL EDITOR */}
            <div
              onClick={() => {
                setSelectedCategory("normal");
                set({ editorCategory: "normal" });
                setHasPickedCategory(true);
              }}
              className="panel p-5 border-2 border-border hover:border-primary transition cursor-pointer space-y-4 rounded-2xl bg-card hover:bg-card/90 shadow-xl group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <Shield className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface border border-border text-foreground font-mono">
                    {settings.normalEditorPrice === 0 ? "FREE ACCESS" : money(settings.normalEditorPrice)}
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition">
                    Normal Editor
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard authentic printing for matchday player names and squad numbers.
                  </p>
                </div>

                <ul className="text-xs space-y-2 text-muted-foreground pt-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Player Name & Squad Number</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>3 Classic Stadium Fonts (Arial, Georgia, Bold)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Standard Solid Color Finishes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Official Club & Nation Crests</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Basic PNG Logo Upload</span>
                  </li>
                </ul>
              </div>

              <button className="btn-outline full text-xs py-2.5 mt-4 group-hover:border-primary group-hover:text-primary transition">
                SELECT NORMAL EDITOR
              </button>
            </div>

            {/* CHOICE 2: PREMIUM EDITOR */}
            <div
              onClick={() => {
                setSelectedCategory("premium");
                set({ editorCategory: "premium" });
                setHasPickedCategory(true);
              }}
              className="panel p-5 border-2 border-gold-line hover:border-primary transition cursor-pointer space-y-4 rounded-2xl bg-gradient-to-b from-[#231e13] to-card shadow-2xl group flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-extrabold uppercase px-3 py-1 rounded-bl-xl shadow">
                MATCHDAY ELITE
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                    <Crown className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary font-mono mr-12 sm:mr-0">
                    {money(settings.premiumEditorPrice)}
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-xl font-bold text-primary">
                    Premium Editor
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bespoke professional studio with 3D extruded numbers, gold gradients, and sleeve patches.
                  </p>
                </div>

                <ul className="text-xs space-y-2 text-foreground/90 pt-1">
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary shrink-0" />
                    <span>All Normal Editor Features Included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary shrink-0" />
                    <span><b>3D Extruded & Gold Gradient</b> Numbers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary shrink-0" />
                    <span><b>Arched Text Arc</b> & Metallic Sheen Effects</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary shrink-0" />
                    <span><b>Tournament Badges</b> (UCL, EPL Gold, AFCON)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary shrink-0" />
                    <span>Custom Crest Frames & Contrast Text Boxes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary shrink-0" />
                    <span>Dual-Sleeve Badge Customization</span>
                  </li>
                </ul>
              </div>

              <button className="btn-gold full text-xs py-2.5 mt-4">
                UNLOCK PREMIUM STUDIO ({money(settings.premiumEditorPrice)})
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. MAIN CUSTOMIZATION STUDIO WORKSPACE */}
      <div className={`space-y-4 ${!hasPickedCategory ? "opacity-30 pointer-events-none blur-xs" : ""}`}>
        {/* Tier Switcher & Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHasPickedCategory(false)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 bg-surface px-2.5 py-1.5 rounded-lg border border-border"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Change Tier
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold">
                  Customization Studio
                </h1>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedCategory === "premium"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface text-muted-foreground border-border"
                  }`}
                >
                  {selectedCategory === "premium" ? "★ PREMIUM STUDIO" : "NORMAL STUDIO"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Personalizing: <strong className="text-foreground">{selectedProduct?.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDesign}
              className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 m-0"
            >
              <Save className="h-3.5 w-3.5" /> Save Design
            </button>
            <button
              onClick={handleAddToCart}
              className="btn-gold text-xs py-1.5 px-4 flex items-center gap-1.5"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Add to Bag ({money(priceBreakdown.grandTotal)})
            </button>
          </div>
        </div>

        {/* Studio Layout: Sidebar Toolbar alongside Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Canvas Section */}
          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col items-center">
            {/* View Switcher: Front vs Back */}
            <div className="mb-3 flex items-center gap-2 bg-surface p-1 rounded-xl border border-border text-xs">
              <button
                type="button"
                onClick={() => set({ side: "Back" })}
                className={`px-4 py-1 rounded-lg font-bold transition ${
                  studio.side === "Back" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
                }`}
              >
                Back View (Name & Number)
              </button>
              <button
                type="button"
                onClick={() => set({ side: "Front" })}
                className={`px-4 py-1 rounded-lg font-bold transition ${
                  studio.side === "Front" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
                }`}
              >
                Front View (Chest Badge)
              </button>
            </div>

            {/* Interactive Jersey Canvas */}
            <div
              ref={canvasRef}
              className="relative aspect-[3/4] w-full max-w-[420px] rounded-3xl bg-[#121210] border border-gold-line/40 shadow-2xl overflow-hidden flex items-center justify-center p-4 select-none"
            >
              {/* Product Background Image (Front or Back) */}
              <img
                src={imageForSide}
                alt={selectedProduct?.name || "Jersey Preview"}
                className="h-full w-full object-contain pointer-events-none drop-shadow-2xl"
              />

              {/* BACK VIEW: Player Name & Squad Number */}
              {studio.side === "Back" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
                  {/* Player Name */}
                  {studio.name && (
                    <div
                      className={`text-center font-bold tracking-widest uppercase transition-all ${
                        studio.textBackground === "dark-box"
                          ? "bg-black/80 px-4 py-1 rounded-lg border border-white/20"
                          : studio.textBackground === "gold-strip"
                          ? "bg-primary text-primary-foreground px-4 py-1 rounded shadow"
                          : ""
                      }`}
                      style={{
                        fontFamily: studio.font || "Arial",
                        color: studio.textBackground === "gold-strip" ? "#111" : (studio.textColor || "#ffffff"),
                        fontSize: `${Math.round(studio.fontSize * 0.42)}px`,
                        textShadow:
                          studio.textEffect === "shadow"
                            ? "3px 3px 6px rgba(0,0,0,0.9)"
                            : studio.textEffect === "metallic"
                            ? "0 0 10px rgba(201,146,46,0.8), 2px 2px 4px #000"
                            : studio.textEffect === "neon"
                            ? "0 0 12px #eab308, 0 0 20px #eab308"
                            : "2px 2px 4px rgba(0,0,0,0.85)",
                        transform: studio.textEffect === "arched" ? "perspective(100px) rotateX(10deg) scaleY(1.1)" : "none",
                      }}
                    >
                      {studio.name}
                    </div>
                  )}

                  {/* 2. Squad Number with Special Styles */}
                  {studio.number && (
                    <div
                      className="text-center font-extrabold tracking-tighter mt-1 transition-all"
                      style={{
                        fontFamily: studio.font || "Arial",
                        fontSize: `${studio.fontSize}px`,
                        lineHeight: "0.9",
                        color:
                          studio.numberStyle === "gradient"
                            ? "transparent"
                            : (studio.textColor || "#ffffff"),
                        backgroundImage:
                          studio.numberStyle === "gradient"
                            ? "linear-gradient(to bottom, #fde047, #ca8a04, #713f12)"
                            : "none",
                        WebkitBackgroundClip: studio.numberStyle === "gradient" ? "text" : "border-box",
                        textShadow:
                          studio.numberStyle === "3d"
                            ? "2px 2px 0 #000, 4px 4px 0 #333, 6px 6px 0 #111"
                            : studio.numberStyle === "dual-outline"
                            ? "0 0 0 3px #000, 0 0 0 6px #c9922e"
                            : studio.numberStyle === "neon"
                            ? "0 0 15px #eab308, 0 0 30px #ca8a04"
                            : "3px 3px 8px rgba(0,0,0,0.9)",
                        WebkitTextStroke:
                          studio.numberStyle === "dual-outline" ? "2px black" : "none",
                      }}
                    >
                      {studio.number}
                    </div>
                  )}

                  {/* 3. Tag Name Below (Lower Back below Jersey Number) */}
                  {studio.tag && (
                    <div
                      className="text-center font-bold tracking-widest uppercase mt-2 transition-all px-3 py-0.5"
                      style={{
                        fontFamily: studio.font || "Arial",
                        color: studio.textColor || "#ffffff",
                        fontSize: `${Math.max(10, Math.round(studio.fontSize * 0.22))}px`,
                        letterSpacing: "0.22em",
                        textShadow: "2px 2px 4px rgba(0,0,0,0.95)",
                        opacity: 0.95,
                        borderTop: "1px solid rgba(255,255,255,0.25)",
                      }}
                    >
                      {studio.tag}
                    </div>
                  )}

                  {/* Frame element if active */}
                  {studio.frame && studio.frame !== "none" && (
                    <div className="absolute inset-x-12 inset-y-16 border-2 border-primary/60 rounded-3xl pointer-events-none" />
                  )}
                </div>
              )}

              {/* FRONT VIEW: Chest Sponsor Badge / Custom Artwork */}
              {studio.side === "Front" && studio.artworkImage && (
                <div
                  onPointerDown={startArtworkDrag}
                  onPointerMove={moveArtwork}
                  onPointerUp={endArtworkDrag}
                  className="absolute cursor-move select-none touch-none p-1 border-2 border-dashed border-primary/80 rounded-xl hover:bg-black/20 transition group"
                  style={{
                    left: `${studio.artworkX}%`,
                    top: `${studio.artworkY}%`,
                    transform: `translate(-50%, -50%) scale(${studio.artworkScale})`,
                  }}
                >
                  <img
                    src={studio.artworkImage}
                    alt="Custom artwork"
                    className="max-h-24 max-w-24 object-contain pointer-events-none drop-shadow-xl"
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 text-primary text-[8px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    Drag to Position
                  </div>
                </div>
              )}
            </div>

            {/* LIVE PRICE BREAKDOWN BAR (Mandatory Requirement) */}
            <div className="w-full max-w-[420px] mt-4 p-3.5 rounded-2xl bg-card border border-gold-line/60 shadow-xl space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-bold text-foreground">Customization Price Breakdown</span>
                <span className="text-[10px] text-primary font-bold uppercase font-mono">
                  {selectedCategory.toUpperCase()} TIER
                </span>
              </div>

              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Base Jersey ({selectedProduct?.name})</span>
                  <span className="font-mono text-foreground">{money(priceBreakdown.baseJerseyPrice)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Studio Tier Access Fee ({selectedCategory === "premium" ? "Premium" : "Normal"})</span>
                  <span className="font-mono text-foreground">
                    {priceBreakdown.accessFee === 0 ? "FREE" : money(priceBreakdown.accessFee)}
                  </span>
                </div>

                {priceBreakdown.toolCharges > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Individual Add-On Features (Print & Badges)</span>
                    <span className="font-mono font-bold">+{money(priceBreakdown.toolCharges)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-1 border-t border-border font-bold text-sm text-foreground">
                  <span>Total Amount Due</span>
                  <span className="font-mono text-primary text-base">{money(priceBreakdown.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Studio Toolbar Sidebar */}
          <div className="lg:col-span-5 order-2 lg:order-1 space-y-4">
            {/* Sidebar Toolbar Header */}
            <div className="panel p-3 rounded-2xl bg-card border border-border flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-display font-bold text-xs uppercase tracking-wider block text-foreground">
                    Studio Toolbar Sidebar
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Customize names, numbers, tags & badges
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedCategory === "premium"
                    ? "bg-primary text-primary-foreground border-primary shadow"
                    : "bg-surface text-muted-foreground border-border"
                }`}
              >
                {selectedCategory === "premium" ? "★ PREMIUM" : "NORMAL"}
              </span>
            </div>

            {/* Sidebar Tool Navigation Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("name")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold transition text-left ${
                  activeTab === "name"
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Type className="h-4 w-4 shrink-0" />
                <span className="truncate">1. Names, Number & Tag</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("style")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold transition text-left ${
                  activeTab === "style"
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Palette className="h-4 w-4 shrink-0" />
                <span className="truncate">2. Typography</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("artwork")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold transition text-left ${
                  activeTab === "artwork"
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span className="truncate">3. Crest & Badges</span>
              </button>
              {selectedCategory === "premium" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("sleeves")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold transition text-left ${
                    activeTab === "sleeves"
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Crown className="h-4 w-4 shrink-0 text-amber-300" />
                  <span className="truncate">4. Sleeve Patches</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold transition text-left ${
                  activeTab === "saved"
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-4 w-4 shrink-0" />
                <span className="truncate">Saved Designs</span>
              </button>
            </div>

            {/* TAB 1: NAME, NUMBER & TAG */}
            {activeTab === "name" && (
              <div className="panel p-4 space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Three-Zone Back Print Configuration</h3>
                  <p className="text-muted-foreground text-[11px]">Configure Jersey Name, Jersey Number, and Tag Name Below for real-time live matchday rendering.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="field-label">1. Jersey Name (Max 14 Letters)</label>
                    <span className="text-[10px] text-muted-foreground">Upper Back</span>
                  </div>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="e.g. MUGERWA"
                    className="field uppercase text-sm font-bold tracking-wider py-2"
                    value={studio.name}
                    onChange={(e) => set({ name: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="field-label">2. Jersey Number (0 - 99)</label>
                    <span className="text-[10px] text-muted-foreground">Center Squad Number</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    placeholder="10"
                    className="field font-mono text-sm font-bold py-2"
                    value={studio.number}
                    onChange={(e) => set({ number: e.target.value })}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="field-label">3. Tag Name Below (Max 16 Letters)</label>
                    <span className="text-[10px] text-primary font-bold">Lower Back</span>
                  </div>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="e.g. FLY EMIRATES / UGANDA / ELEVENX"
                    className="field uppercase text-xs font-semibold tracking-wider py-2"
                    value={studio.tag || ""}
                    onChange={(e) => set({ tag: e.target.value.toUpperCase() })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Rendered cleanly below squad number on the jersey back view.
                  </p>
                </div>

                {/* Color Selector */}
                <div>
                  <label className="field-label">Vinyl Print Color</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => set({ textColor: c.hex })}
                        title={c.name}
                        className={`h-8 w-8 rounded-full border-2 transition ${
                          studio.textColor === c.hex ? "border-primary scale-110 shadow-lg" : "border-border"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Number Size Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="field-label">Number Scale:</span>
                    <span className="font-mono font-bold text-primary">{studio.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={48}
                    max={84}
                    value={studio.fontSize}
                    onChange={(e) => set({ fontSize: Number(e.target.value) })}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: FONTS & SPECIAL EFFECTS */}
            {activeTab === "style" && (
              <div className="panel p-4 space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Typography Fonts & Effects</h3>
                  <p className="text-muted-foreground text-[11px]">
                    {selectedCategory === "premium"
                      ? "Advanced matchday fonts, 3D extruded numbers, and metallic effects."
                      : "Standard fonts available in Normal Editor."}
                  </p>
                </div>

                {/* Fonts */}
                <div>
                  <label className="field-label">Jersey Font Face</label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {fontsForTier.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => set({ font: f.id })}
                        className={`p-2.5 rounded-xl border text-left text-xs transition ${
                          studio.font === f.id
                            ? "border-primary bg-primary/10 text-primary font-bold shadow"
                            : "border-border bg-surface text-muted-foreground hover:border-gold-line hover:text-foreground"
                        }`}
                        style={{ fontFamily: f.id }}
                      >
                        <span className="block text-xs">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground font-sans">
                          {f.tier === "premium" ? "★ Premium Font" : "Standard Font"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* PREMIUM NUMBER STYLES */}
                {selectedCategory === "premium" ? (
                  <div>
                    <label className="field-label">Special Number Styles (Matchday 3D)</label>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {numberStylesForTier.map((ns) => (
                        <button
                          key={ns.id}
                          type="button"
                          onClick={() => set({ numberStyle: ns.id })}
                          className={`p-2 rounded-xl border text-xs text-left transition ${
                            studio.numberStyle === ns.id
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border bg-surface text-muted-foreground"
                          }`}
                        >
                          <span className="block font-semibold">{ns.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-border bg-surface text-muted-foreground text-xs flex items-center justify-between">
                    <span>Unlock 3D Extruded, Honeycomb & Neon Numbers</span>
                    <button
                      onClick={() => {
                        setSelectedCategory("premium");
                        set({ editorCategory: "premium" });
                      }}
                      className="text-primary font-bold hover:underline"
                    >
                      Upgrade to Premium &rarr;
                    </button>
                  </div>
                )}

                {/* PREMIUM TEXT EFFECTS */}
                {selectedCategory === "premium" && (
                  <div>
                    <label className="field-label">Advanced Text Effects & Framing</label>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        { id: "none", name: "Standard Flat" },
                        { id: "arched", name: "Arched Arc" },
                        { id: "shadow", name: "Drop Shadow" },
                        { id: "metallic", name: "Gold Sheen" },
                        { id: "neon", name: "Neon Glow" },
                      ].map((eff) => (
                        <button
                          key={eff.id}
                          type="button"
                          onClick={() => set({ textEffect: eff.id })}
                          className={`p-2 rounded-xl border text-[11px] font-semibold transition ${
                            studio.textEffect === eff.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-surface text-muted-foreground"
                          }`}
                        >
                          {eff.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LOGOS & BADGES */}
            {activeTab === "artwork" && (
              <div className="panel p-4 space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Official Crests & Custom Artwork</h3>
                  <p className="text-muted-foreground text-[11px]">
                    Select verified club badges or upload your bespoke sponsor logo for the chest.
                  </p>
                </div>

                {/* Preset Badges */}
                <div>
                  <label className="field-label">Badge Library</label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {badgesForTier.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() =>
                          set({
                            badgePreset: b.name,
                            side: "Front",
                          })
                        }
                        className="p-2.5 rounded-xl border border-border bg-surface hover:border-primary transition text-left flex items-center gap-2"
                      >
                        <span className="text-lg">{b.icon}</span>
                        <div>
                          <b className="text-xs text-foreground block">{b.name}</b>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {b.price === 0 ? "Included" : money(b.price)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Custom Badge */}
                <div className="space-y-2 pt-1">
                  <label className="field-label">Upload Custom Team Crest or Sponsor Artwork (PNG)</label>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadArtwork(e.target.files?.[0])}
                  />
                  <div
                    onClick={() => fileInput.current?.click()}
                    className="border-2 border-dashed border-border hover:border-primary rounded-xl p-5 text-center cursor-pointer bg-surface/40 transition space-y-1"
                  >
                    <ImagePlus className="h-6 w-6 mx-auto text-primary" />
                    <span className="text-xs font-bold text-foreground block">Select Logo or Sponsor File</span>
                    <span className="text-[10px] text-muted-foreground block">Transparent PNG yields optimal matchday realism</span>
                  </div>

                  {studio.artworkImage && (
                    <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={studio.artworkImage} alt="Artwork" className="h-8 w-8 object-contain" />
                        <span className="text-xs font-bold text-foreground truncate max-w-[120px]">{studio.artwork}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => set({ artworkScale: Math.max(0.6, studio.artworkScale - 0.2) })}
                          className="px-2 py-0.5 rounded bg-card border border-border text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="font-mono text-[10px]">{(studio.artworkScale * 100).toFixed(0)}%</span>
                        <button
                          type="button"
                          onClick={() => set({ artworkScale: Math.min(2.0, studio.artworkScale + 0.2) })}
                          className="px-2 py-0.5 rounded bg-card border border-border text-xs font-bold"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => set({ artworkImage: "", artwork: "" })}
                          className="text-[11px] text-red-400 hover:text-red-300 ml-2 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: SLEEVE PATCHES (PREMIUM ONLY) */}
            {activeTab === "sleeves" && selectedCategory === "premium" && (
              <div className="panel p-4 space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Official Tournament Sleeve Badges</h3>
                  <p className="text-muted-foreground text-[11px]">
                    Authentic thermo-bonded patches applied to the right and left jersey sleeves.
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    { id: "epl_gold", name: "Premier League Gold Champions Patch", price: 15000, icon: "👑" },
                    { id: "ucl_star", name: "UEFA Champions League Starball + Respect", price: 15000, icon: "⭐" },
                    { id: "afcon_badge", name: "CAF Africa Cup of Nations Official Patch", price: 15000, icon: "🏆" },
                    { id: "world_cup", name: "FIFA World Champions Gold Badge", price: 15000, icon: "🥇" },
                  ].map((patch) => {
                    const isSelected = studio.sleevePatches?.includes(patch.name);
                    return (
                      <div
                        key={patch.id}
                        onClick={() => {
                          const current = studio.sleevePatches || [];
                          const updated = isSelected
                            ? current.filter((p) => p !== patch.name)
                            : [...current, patch.name];
                          set({ sleevePatches: updated });
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected ? "border-primary bg-primary/10 shadow" : "border-border bg-surface hover:border-gold-line"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{patch.icon}</span>
                          <div>
                            <b className="text-foreground block">{patch.name}</b>
                            <span className="text-[10px] text-primary font-mono">+{money(patch.price)} per sleeve</span>
                          </div>
                        </div>
                        <input type="checkbox" checked={isSelected} readOnly className="accent-primary h-4 w-4" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: SAVED DESIGNS */}
            {activeTab === "saved" && (
              <div className="panel p-4 space-y-3 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Saved Custom Creations</h3>
                  <p className="text-muted-foreground text-[11px]">Loaded directly from your Firebase account.</p>
                </div>

                {savedDesigns.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No saved drafts yet. Click "Save Design" above to record your kit.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedDesigns.map((d: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between">
                        <div>
                          <b className="text-primary font-bold block">{d.name || "PLAYER"} #{d.number || "10"}</b>
                          <span className="text-[10px] text-muted-foreground">
                            Tier: {d.editorCategory?.toUpperCase() || "NORMAL"} • {d.jersey || "Club Kit"}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            update((s) => ({ studio: { ...s.studio, ...d } }));
                            setSelectedCategory(d.editorCategory || "normal");
                            toast.success("Loaded design onto studio canvas!");
                          }}
                          className="btn-gold text-[10px] py-1 px-2.5"
                        >
                          Load Kit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Glass Login Modal */}
      <GlassLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={executeAddToCart}
      />
    </Page>
  );
}
