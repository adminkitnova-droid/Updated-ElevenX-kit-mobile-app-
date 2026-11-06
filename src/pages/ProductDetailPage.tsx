import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Page } from "@/components/shell";
import { ProductImage } from "@/components/product-image";
import { money, useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { GlassLoginModal } from "@/components/glass-login-modal";
import { ArrowLeft, Check, Heart, ShieldCheck, Shirt, ShoppingBag, Sparkles, Truck } from "lucide-react";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addToCart, favourites, toggleFav, markViewed } = useStore();
  const { user } = useAuth();

  const product = products.find((p: any) => String(p.id) === id) || products[0];
  const [selectedSize, setSelectedSize] = useState("M");
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (product) markViewed(product.id);
  }, [product?.id]);

  if (!product) {
    return (
      <Page>
        <div className="panel p-8 text-center space-y-3">
          <p className="font-display text-xl">Product Not Found</p>
          <Link to="/search" className="btn-gold inline-block text-xs py-2 px-4">
            Back to Catalog
          </Link>
        </div>
      </Page>
    );
  }

  const isFav = favourites.includes(product.id);
  const currentImage = activeSide === "front" ? product.frontImage || product.image : product.backImage || product.image;

  const handleAddToCartClick = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    executeAddToCart();
  };

  const executeAddToCart = () => {
    addToCart(product, selectedSize);
  };

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={() => toggleFav(product.id)}
          className="inline-flex items-center gap-1 text-xs text-primary"
        >
          <Heart className="h-4 w-4" fill={isFav ? "currentColor" : "none"} />
          {isFav ? "Saved to Wishlist" : "Save"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gallery / Image view */}
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-gold-line/40 bg-card/60 p-2 shadow-xl">
            <ProductImage src={currentImage} alt={product.name} className="!aspect-square w-full rounded-xl object-contain" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 rounded-full bg-background/80 px-3 py-1.5 backdrop-blur-md border border-border">
              <button
                onClick={() => setActiveSide("front")}
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition ${
                  activeSide === "front" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                FRONT VIEW
              </button>
              <button
                onClick={() => setActiveSide("back")}
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition ${
                  activeSide === "back" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                BACK VIEW
              </button>
            </div>
          </div>
        </div>

        {/* Details & Actions */}
        <div className="space-y-4">
          <div>
            <span className="pill text-[10px] font-bold">{product.team} • {product.category}</span>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold mt-2">{product.name}</h1>
            <p className="font-display text-2xl text-primary font-bold mt-1">{money(product.price)}</p>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {product.description || "Authentic high-performance match kit crafted from breathable polyester with aero-ready ventilation channels and woven crest."}
          </p>

          {/* Size Selector */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold">Select Size:</span>
              <span className="text-muted-foreground text-[11px]">True to athletic fit</span>
            </div>
            <div className="flex gap-2">
              {product.size.map((sz: string) => (
                <button
                  key={sz}
                  onClick={() => setSelectedSize(sz)}
                  className={`h-10 w-12 rounded-xl border text-xs font-bold transition flex items-center justify-center ${
                    selectedSize === sz
                      ? "border-primary bg-primary text-primary-foreground shadow"
                      : "border-border bg-card text-muted-foreground hover:border-gold-line hover:text-foreground"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              onClick={handleAddToCartClick}
              className="btn-gold full flex items-center justify-center gap-2 py-3.5 text-xs"
            >
              <ShoppingBag className="h-4 w-4" />
              ADD TO CART • {money(product.price)}
            </button>

            <Link
              to={`/studio?productId=${product.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold-line bg-gold-soft py-3 text-xs font-bold text-primary hover:bg-primary/20 transition"
            >
              <Sparkles className="h-4 w-4" />
              CUSTOMIZE THIS JERSEY IN STUDIO
            </Link>
          </div>

          {/* Shipping & Authenticity info */}
          <div className="rounded-xl border border-border bg-card/40 p-3.5 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <Truck className="h-4 w-4 text-primary" />
              <span className="font-medium">Same-Day Delivery across Kampala & Entebbe</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="font-medium">Official ElevenX Guarantee • Easy Exchanges</span>
            </div>
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
