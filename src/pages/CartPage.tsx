import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingBag, ArrowRight, Truck, CreditCard, ShieldCheck, Smartphone, CheckCircle, RefreshCw } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { GoogleDeliveryMap, type DeliveryPoint } from "@/components/google-delivery-map";
import { Page } from "@/components/shell";
import { useAuth } from "@/lib/auth";
import { money, useStore } from "@/lib/store";
import { processRelworxPayment, detectUgandanProvider } from "@/lib/relworx";
import { useNotifications } from "@/lib/notifications";
import { toast } from "sonner";

export function CartPage() {
  const { cart, cartCount, total, changeQty, checkout, zones } = useStore();
  const { user } = useAuth();
  const { sendPushNotification } = useNotifications();
  const navigate = useNavigate();

  const [d, setD] = useState<{
    name: string;
    phone: string;
    relworxPhone: string;
    address: string;
    zone: string;
    destination?: DeliveryPoint;
    distanceKm?: number;
    deliveryFee?: number;
  }>({
    name: user?.displayName || user?.user_metadata?.full_name || "",
    phone: user?.user_metadata?.phone || "",
    relworxPhone: "",
    address: user?.user_metadata?.address || "",
    zone: "Kampala Central & CBD",
  });

  const [busy, setBusy] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"form" | "relworx_prompt" | "success">("form");
  const [relworxRef, setRelworxRef] = useState<string>("");

  useEffect(() => {
    if (user) {
      setD((prev) => ({
        ...prev,
        name: prev.name || user.displayName || user.user_metadata?.full_name || "",
        phone: prev.phone || user.user_metadata?.phone || "",
        relworxPhone: prev.relworxPhone || user.user_metadata?.phone || "",
        address: prev.address || user.user_metadata?.address || "",
      }));
    }
  }, [user]);

  const activeZones = zones.filter((z: any) => z.active);
  const selectedZone = activeZones.find((z: any) => z.name === d.zone) || activeZones[0];
  const deliveryFee = d.deliveryFee ?? (selectedZone ? selectedZone.fee : 10000);
  const grandTotal = total + deliveryFee;

  const detectedNetwork = detectUgandanProvider(d.relworxPhone || d.phone);

  const handlePlaceOrder = async () => {
    if (!d.name.trim()) {
      toast.error("Please enter your recipient name.");
      return;
    }
    const payPhone = d.relworxPhone.trim() || d.phone.trim();
    if (!payPhone) {
      toast.error("Please enter your Ugandan mobile money number (MTN or Airtel).");
      return;
    }
    if (!d.address.trim()) {
      toast.error("Please enter your delivery street or dropoff address.");
      return;
    }

    setBusy(true);
    setPaymentStep("relworx_prompt");

    try {
      // Process real Relworx payment
      const paymentRes = await processRelworxPayment({
        phone: payPhone,
        amount: grandTotal,
        currency: "UGX",
        orderId: "TEMP-" + Date.now(),
        customerName: d.name,
      });

      if (!paymentRes.success) {
        toast.error("Relworx payment failed. Please check your phone.");
        setPaymentStep("form");
        return;
      }

      setRelworxRef(paymentRes.reference);

      // Place order and sync into Firebase Firestore
      const orderId = await checkout({
        name: d.name,
        phone: payPhone,
        address: d.address,
        zone: d.zone,
        deliveryFee,
        destination: d.destination ? { lat: d.destination.lat, lon: d.destination.lng, label: d.destination.label } : undefined,
        paymentMethod: `Relworx (${paymentRes.provider}) - Ref: ${paymentRes.reference}`,
      });

      if (orderId) {
        setPaymentStep("success");
        sendPushNotification(
          "Order Confirmed & Paid! 🎉",
          `Order #${orderId} paid via Relworx ${paymentRes.provider}. We are preparing your jerseys for dispatch!`,
          orderId,
          "order"
        );
        setTimeout(() => {
          navigate("/profile");
        }, 1800);
      }
    } catch (err: any) {
      toast.error(err.message || "Checkout error");
      setPaymentStep("form");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <div className="section-title">
        Your Shopping Bag <span className="gold">({cartCount})</span>
      </div>

      {cart.length === 0 ? (
        <div className="panel p-10 text-center space-y-4">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/60" />
          <h2 className="font-display text-2xl font-bold">Your bag is empty</h2>
          <p className="muted text-xs max-w-sm mx-auto">
            Browse our match-day collection or jump straight into the studio to personalize your dream kit.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/search" className="btn-gold text-xs py-2.5 px-5">
              EXPLORE KITS
            </Link>
            <Link to="/studio" className="btn-outline text-xs py-2.5 px-5 m-0">
              CUSTOM STUDIO
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Item List */}
          <div className="lg:col-span-7 space-y-3">
            {cart.map((item: any, i: number) => (
              <div key={`${item.product.id}_${item.size}_${i}`} className="panel flex items-start gap-3.5 p-3.5">
                <ProductImage
                  src={item.image}
                  alt={item.product.name}
                  className="!w-[85px] !h-[105px] shrink-0 rounded-xl object-contain bg-surface"
                />
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <b className="text-sm font-bold line-clamp-1">{item.product.name}</b>
                      <p className="text-[11px] text-muted-foreground">
                        Size: <span className="font-bold text-foreground">{item.size}</span>
                      </p>
                    </div>
                    <button
                      aria-label="Remove item"
                      className="text-muted-foreground hover:text-red-400 p-1"
                      onClick={() => changeQty(i, -item.qty)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {item.customization && (
                    <div className="my-1 rounded-lg bg-surface/80 p-2 border border-border/60 text-[10px] space-y-0.5">
                      <p className="font-bold text-primary">✨ Custom Print Details:</p>
                      <p className="text-foreground">
                        Name: <b>{item.customization.name || "None"}</b> • No: <b>#{item.customization.number || "10"}</b>
                        {item.customization.tag && ` • Tag: ${item.customization.tag}`}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <strong className="gold font-display text-base">
                      {money(item.product.price * item.qty)}
                    </strong>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-0.5">
                      <button
                        className="text-xs font-bold text-primary hover:opacity-75"
                        onClick={() => changeQty(i, -1)}
                      >
                        −
                      </button>
                      <span className="text-xs font-semibold px-1">{item.qty}</span>
                      <button
                        className="text-xs font-bold text-primary hover:opacity-75"
                        onClick={() => changeQty(i, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout & Delivery Summary */}
          <div className="lg:col-span-5 space-y-4">
            <div className="panel space-y-3 p-4">
              <h2 className="font-display text-lg font-bold border-b border-border pb-2">
                Delivery & Relworx Mobile Money
              </h2>

              <div>
                <label className="field-label text-xs">Recipient Full Name</label>
                <input
                  className="field text-xs py-2"
                  placeholder="e.g. Brian Kasirye"
                  value={d.name}
                  onChange={(e) => setD({ ...d, name: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label text-xs">Contact Phone Number</label>
                <input
                  className="field text-xs py-2"
                  inputMode="tel"
                  placeholder="0772 123 456 or 0701 234 567"
                  value={d.phone}
                  onChange={(e) => setD({ ...d, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label text-xs">Delivery Area / Region</label>
                <select
                  className="field text-xs py-2"
                  value={d.zone}
                  onChange={(e) => setD({ ...d, zone: e.target.value })}
                >
                  {activeZones.map((z: any) => (
                    <option key={z.id} value={z.name}>
                      {z.name} (+{money(z.fee)} • {z.eta})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label text-xs">Exact Street Address / Landmark</label>
                <input
                  className="field text-xs py-2"
                  placeholder="Apartment, Street name, or Landmark"
                  value={d.address}
                  onChange={(e) => setD({ ...d, address: e.target.value })}
                />
              </div>

              {/* Live Google Map Destination Selector */}
              <div>
                <GoogleDeliveryMap
                  value={d.destination || null}
                  onChange={(point, route) => {
                    setD((prev) => ({
                      ...prev,
                      destination: point,
                      distanceKm: route.distanceKm,
                      address: point.label,
                    }));
                  }}
                />
              </div>

              {/* Relworx Mobile Money Gateway (STRICTLY REAL NO CASH) */}
              <div className="rounded-xl border border-primary/50 bg-[#1f1b13] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Relworx Mobile Money Checkout</span>
                  </div>
                  <span className="text-[10px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-full">
                    {detectedNetwork}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Cash on delivery is discontinued. All orders are safely paid via <b>Relworx Mobile Money</b> (MTN / Airtel Uganda) before dispatch.
                </p>

                <div>
                  <label className="field-label text-[10px]">Mobile Money Number (Uganda)</label>
                  <input
                    type="tel"
                    required
                    className="field font-mono text-xs py-2"
                    placeholder="0772 123 456 or 0701 234 567"
                    value={d.relworxPhone || d.phone}
                    onChange={(e) => setD({ ...d, relworxPhone: e.target.value })}
                  />
                </div>
              </div>

              {/* Payment prompt overlay */}
              {paymentStep === "relworx_prompt" && (
                <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1 animate-pulse">
                  <div className="flex items-center gap-2 font-bold">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Relworx USSD Push Initiated...</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Check your phone screen for the {detectedNetwork} prompt to authorize <b>{money(grandTotal)}</b>.
                  </p>
                </div>
              )}

              {paymentStep === "success" && (
                <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Payment verified! Ref: <b>{relworxRef}</b>. Redirecting...</span>
                </div>
              )}

              {/* Breakdown */}
              <div className="pt-2 border-t border-border space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{money(total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery ({selectedZone?.name}):</span>
                  <span>{money(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-display text-base font-bold text-foreground pt-1 border-t border-border/60">
                  <span>Total Due:</span>
                  <span className="text-primary">{money(grandTotal)}</span>
                </div>
              </div>

              <button
                className="btn-gold full text-xs py-3.5 flex items-center justify-center gap-2"
                disabled={busy}
                onClick={handlePlaceOrder}
              >
                {busy ? "PROCESSING RELWORX PAYMENT..." : `PAY WITH RELWORX • ${money(grandTotal)}`}
                {!busy && <ArrowRight className="h-4 w-4" />}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground text-center">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>100% Secure Relworx Mobile Money Escrow & Firebase Storage.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
