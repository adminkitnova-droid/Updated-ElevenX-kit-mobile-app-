import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Page } from "@/components/shell";
import { AccountSection } from "@/components/account-section";
import { OrderWorkflowStepper } from "@/components/order-workflow-stepper";
import { useAuth } from "@/lib/auth";
import { useStore, money, type Order, type CartItem } from "@/lib/store";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Shirt,
  Shield,
  Bike,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  MapPin,
  CreditCard,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export function ProfilePage() {
  const { user, roles } = useAuth();
  const { orders, savedDesigns, update, reloadOrders, addToCart, products } = useStore();
  const navigate = useNavigate();

  const [orderFilter, setOrderFilter] = useState<"all" | "processing" | "transit" | "delivered">("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("deliver")) {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
    if (s.includes("out") || s.includes("transit")) {
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    }
    if (s.includes("prepar") || s.includes("print") || s.includes("process")) {
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    }
    return "bg-gold-soft text-primary border-gold-line/40";
  };

  const filteredOrders = orders.filter((o: any) => {
    if (orderFilter === "all") return true;
    const s = (o.status || "").toLowerCase();
    if (orderFilter === "delivered") return s.includes("delivered");
    if (orderFilter === "transit") return s.includes("out") || s.includes("transit");
    if (orderFilter === "processing") return s.includes("prepar") || s.includes("process") || s.includes("print") || s.includes("confirm");
    return true;
  });

  const handleReorder = (item: any) => {
    const prod = products.find((p) => p.id === item.productId || p.name === item.name) || {
      id: item.productId || 101,
      name: item.name,
      team: "Football Club",
      category: "Club",
      price: item.price,
      size: [item.size || "M"],
      stock: 15,
      image: item.image || "/jersey-arsenal.jpg",
    };

    addToCart(prod, item.size, item.customization);
    toast.success(`Added ${item.name} to bag!`);
    navigate("/cart");
  };

  return (
    <Page>
      {/* Account Info */}
      <AccountSection />

      {/* Portal shortcuts for Admin & Rider */}
      <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/admin"
          className="panel flex items-center justify-between p-4 border-gold-line/40 hover:border-primary transition group"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <b className="text-sm font-bold group-hover:text-primary transition">ElevenX Admin Console</b>
              <p className="text-[11px] text-muted-foreground">Manage products, custom prints, rider dispatch, and orders</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
        </Link>

        <Link
          to="/rider"
          className="panel flex items-center justify-between p-4 border-gold-line/40 hover:border-primary transition group"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <b className="text-sm font-bold group-hover:text-primary transition">Courier & Rider Portal</b>
              <p className="text-[11px] text-muted-foreground">Live Kampala dispatch feed and Google Live Map routes</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
        </Link>
      </div>

      {/* DEDICATED ORDER HISTORY SECTION */}
      <section className="mt-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold tracking-tight">Order History & Saved Kits</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track past jersey customizations, dispatch stages, and instant re-orders synced with Firebase.
            </p>
          </div>

          <button
            onClick={() => reloadOrders()}
            className="text-xs text-primary hover:underline flex items-center gap-1.5 self-start sm:self-center bg-surface px-3 py-1.5 rounded-xl border border-border"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Orders
          </button>
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setOrderFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition whitespace-nowrap ${
              orderFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setOrderFilter("processing")}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition whitespace-nowrap ${
              orderFilter === "processing" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Customizing / Printing
          </button>
          <button
            onClick={() => setOrderFilter("transit")}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition whitespace-nowrap ${
              orderFilter === "transit" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Out for Delivery
          </button>
          <button
            onClick={() => setOrderFilter("delivered")}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition whitespace-nowrap ${
              orderFilter === "delivered" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Delivered
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="panel p-8 text-center text-xs text-muted-foreground space-y-3">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="font-bold text-foreground text-sm">No orders matching this filter</p>
            <p>Every jersey kit you order or customize is permanently recorded here via Firebase Firestore.</p>
            <Link to="/search" className="btn-gold inline-flex items-center gap-2 text-xs py-2 px-4 mt-2">
              Browse Kits <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((o: any) => {
              const isExpanded = expandedOrderId === o.id;

              return (
                <div key={o.id} className="panel p-4 space-y-3.5 border-gold-line/40 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary font-mono font-bold text-xs">
                        #{o.id?.slice(-4) || "KIT"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">#{o.id}</span>
                          <span className="text-[11px] text-muted-foreground">{o.date || "Today"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          Recipient: <b className="text-foreground">{o.customerName}</b> • {o.phone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(o.status)}`}>
                        {o.status.toUpperCase()}
                      </span>
                      <span className="font-display font-extrabold text-sm text-foreground">
                        {money(o.total)}
                      </span>
                    </div>
                  </div>

                  {/* 7-Stage Production & Fulfillment Stepper */}
                  <OrderWorkflowStepper status={o.status} compact={false} />

                  {/* Order Items with Customization Details */}
                  <div className="space-y-2.5">
                    {o.items.map((item: any, idx: number) => {
                      const hasCustomization = Boolean(item.customization);
                      const customName = item.customization?.name;
                      const customNumber = item.customization?.number;

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface/80 border border-border/70"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={item.image || "/jersey-arsenal.jpg"}
                                alt={item.name}
                                className="h-14 w-12 rounded-lg object-contain bg-black/40 border border-border"
                              />
                              {hasCustomization && (
                                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[8px] font-extrabold px-1 rounded-full shadow">
                                  CUSTOM
                                </span>
                              )}
                            </div>

                            <div>
                              <b className="text-xs font-bold text-foreground block">{item.name}</b>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                <span>Size: <strong className="text-foreground">{item.size}</strong></span>
                                <span>•</span>
                                <span>Qty: <strong className="text-foreground">{item.qty}</strong></span>
                                <span>•</span>
                                <span className="text-primary font-semibold">{money(item.price * item.qty)}</span>
                              </div>

                              {hasCustomization && (
                                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-gold-soft border border-gold-line/40 px-2 py-0.5 text-[10px]">
                                  <Sparkles className="h-3 w-3 text-primary" />
                                  <span className="text-foreground">
                                    Print: <b>{customName || "PLAYER"}</b> #{customNumber || "10"}
                                  </span>
                                  {item.customization.font && (
                                    <span className="text-muted-foreground">({item.customization.font})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {hasCustomization && (
                              <button
                                type="button"
                                onClick={() => {
                                  update((s: any) => ({
                                    studio: { ...s.studio, ...item.customization },
                                  }));
                                  navigate(`/studio?productId=${item.productId || 101}`);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline px-2 py-1 rounded-lg border border-primary/30 bg-primary/5"
                              >
                                <Eye className="h-3 w-3" /> View Design
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleReorder(item)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground hover:text-primary px-2.5 py-1 rounded-lg border border-border bg-card hover:border-gold-line transition"
                            >
                              <RotateCcw className="h-3 w-3" /> Re-Order
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expandable Order Details Drawer */}
                  <div className="pt-2 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                      className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>Delivery: <b>{o.address} ({o.zone})</b></span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span>{isExpanded ? "Hide Details" : "View Tracking & Payment"}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 p-3 rounded-xl bg-card border border-border/80 space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Payment Gateway</span>
                            <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                              <CreditCard className="h-3.5 w-3.5" />
                              {o.paymentMethod || "Relworx Mobile Money (MTN / Airtel)"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Assigned Courier</span>
                            <span className="text-foreground font-semibold flex items-center gap-1 mt-0.5">
                              <Bike className="h-3.5 w-3.5 text-primary" />
                              {o.riderId ? `Courier ID: ${o.riderId}` : "Kampala Central Dispatch Fleet"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Delivery Fee: {money(o.deliveryFee || 10000)}</span>
                          <span className="text-emerald-400 font-bold">Verified in Firebase</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Saved Custom Studio Designs Section */}
      <section className="mt-10 mb-6 space-y-3">
        <div className="section-title my-0 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>My Studio Saved Kits ({savedDesigns.length})</span>
        </div>

        {savedDesigns.length === 0 ? (
          <div className="panel p-6 text-center text-xs text-muted-foreground">
            <p>No standalone drafts saved yet.</p>
            <Link to="/studio" className="btn-gold inline-block mt-3 text-xs py-2 px-4">
              OPEN STUDIO & DESIGN A JERSEY
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedDesigns.map((d: any, idx: number) => (
              <div key={d.id ?? idx} className="panel p-3.5 flex items-center justify-between gap-3">
                <div>
                  <b className="text-sm font-bold text-primary">{d.jersey || "Custom Kit"}</b>
                  <p className="text-xs text-foreground mt-0.5">
                    Name: <b>{d.name || "PLAYER"}</b> • #{d.number || "10"}
                  </p>
                  <small className="text-[10px] text-muted-foreground block">
                    Font: {d.font || "Arial"} • Side: {d.side || "Back"}
                  </small>
                </div>
                <Link
                  to={`/studio?productId=${d.productId || 101}`}
                  onClick={() => {
                    update((s: any) => ({
                      studio: { ...s.studio, ...d },
                    }));
                  }}
                  className="btn-gold text-[10px] py-1.5 px-3 shrink-0"
                >
                  Open in Studio
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
