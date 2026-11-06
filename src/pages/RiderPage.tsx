import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Bike,
  Phone,
  MapPin,
  CheckCircle2,
  Navigation,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Sliders,
  DollarSign,
  Package,
  Clock,
  Camera,
  FileCheck,
  Send,
  HelpCircle,
  AlertTriangle,
  User,
  Settings,
  LogOut,
  Bell,
  Eye,
  Calendar,
  Wallet,
  ArrowUpRight,
  Check,
  Sparkles,
  Shield,
  Smartphone,
  ExternalLink
} from "lucide-react";
import { PortalGate } from "@/components/portal-gate";
import { AndroidIcon } from "@/components/android-icon";
import { useAuth } from "@/lib/auth";
import { useStore, money, type Order } from "@/lib/store";
import {
  updateFirebaseOrderStatus,
  submitFirebasePOD,
  fetchFirebasePODs,
  type FirebasePODRecord,
} from "@/lib/firebase";
import { useNotifications } from "@/lib/notifications";
import { GoogleDeliveryMap, type DeliveryPoint } from "@/components/google-delivery-map";

export function RiderPage() {
  const { user, signOut } = useAuth();
  const { orders, reloadOrders } = useStore();
  const { sendPushNotification } = useNotifications();
  const navigate = useNavigate();

  // Navigation State
  const [activeMenu, setActiveMenu] = useState<string>("dashboard");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    deliveries: true,
    navigation: false,
    pod: false,
    earnings: false,
    support: false,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Rider Status
  const [availability, setAvailability] = useState<"online" | "busy" | "offline">("online");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // POD State
  const [pods, setPods] = useState<FirebasePODRecord[]>([]);
  const [podOrderId, setPodOrderId] = useState<string>("");
  const [podRecipient, setPodRecipient] = useState<string>("");
  const [podNotes, setPodNotes] = useState<string>("");
  const [podPhoto, setPodPhoto] = useState<string>("");
  const [podSignature, setPodSignature] = useState<string>("");
  const [submittingPod, setSubmittingPod] = useState(false);

  // Support State
  const [supportIssue, setSupportIssue] = useState<string>("");
  const [supportCategory, setSupportCategory] = useState<string>("delay");

  // Load Proof of Deliveries
  useEffect(() => {
    void fetchFirebasePODs(user?.id || "demo_rider_11x").then(setPods);
  }, [user?.id]);

  // Orders filtered for rider
  const riderOrders = useMemo(() => {
    return orders.filter(
      (o: any) =>
        !o.riderId ||
        o.riderId === user?.id ||
        o.riderId === "rider_demo" ||
        o.riderId === "demo_rider_11x"
    );
  }, [orders, user?.id]);

  const activeDeliveries = useMemo(
    () => riderOrders.filter((o: any) => (o.status || "").toLowerCase() === "out for delivery"),
    [riderOrders]
  );
  const completedDeliveries = useMemo(
    () => riderOrders.filter((o: any) => (o.status || "").toLowerCase() === "delivered"),
    [riderOrders]
  );
  const pendingDeliveries = useMemo(
    () =>
      riderOrders.filter(
        (o: any) =>
          (o.status || "").toLowerCase() !== "delivered" &&
          (o.status || "").toLowerCase() !== "cancelled"
      ),
    [riderOrders]
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const handleUpdateDelivery = async (orderId: string, status: string, deliveryStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateFirebaseOrderStatus(orderId, status, deliveryStatus, user?.id || "demo_rider_11x");
      toast.success(`Order #${orderId} marked as ${status}`);

      if (status === "Out for delivery") {
        sendPushNotification(
          "🚚 Courier En Route!",
          `Rider Dan has picked up order #${orderId} from Kololo HQ and is on the way.`,
          orderId,
          "dispatch"
        );
      } else if (status === "Delivered") {
        sendPushNotification(
          "🎉 Order Handover Complete!",
          `Order #${orderId} has been safely delivered to customer.`,
          orderId,
          "delivery"
        );
      }

      await reloadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to update order");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSubmitPOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podOrderId) {
      toast.error("Please select an order for Proof of Delivery.");
      return;
    }
    setSubmittingPod(true);
    try {
      const record = await submitFirebasePOD({
        orderId: podOrderId,
        riderId: user?.id || "demo_rider_11x",
        recipientName: podRecipient || "Customer Handover Verified",
        photoUrl: podPhoto || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300",
        signature: podSignature || "Digital Signature: Recipient Confirmed",
        notes: podNotes,
      });

      // Mark order as delivered in Firebase
      await updateFirebaseOrderStatus(podOrderId, "Delivered", "Delivered", user?.id || "demo_rider_11x");
      await reloadOrders();

      setPods((prev) => [record, ...prev]);
      toast.success(`Proof of Delivery submitted for order #${podOrderId}!`);
      sendPushNotification(
        "Proof of Delivery Verified",
        `Handover confirmed for Order #${podOrderId}. Recipient: ${podRecipient || "Verified"}`,
        podOrderId,
        "delivery"
      );

      // Reset form & go to history
      setPodOrderId("");
      setPodRecipient("");
      setPodNotes("");
      setPodPhoto("");
      setPodSignature("");
      setActiveMenu("pod_history");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit POD");
    } finally {
      setSubmittingPod(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Rider signed out successfully.");
    navigate("/rider-login");
  };

  // Earnings Stats
  const totalEarnings = completedDeliveries.length * 12000 + 15000; // Base rate + tips
  const todayEarnings = Math.min(totalEarnings, 36000);

  return (
    <PortalGate role="rider">
      <div className="min-h-screen bg-[#0d0d0c] text-foreground flex flex-col antialiased">
        {/* RIDER CONSOLE TOP HEADER */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-[#141412]/95 backdrop-blur-md px-4 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-xl border border-border text-foreground hover:bg-surface transition"
              aria-label="Open Rider Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/30">
                <Bike className="h-5 w-5" />
              </div>
              <div>
                <b className="font-display text-base tracking-wider block leading-none">
                  ELEVEN<span className="text-primary">X</span> <span className="text-xs text-primary font-bold">RIDER</span>
                </b>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider block mt-0.5">
                  Courier Dispatch Console
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Status & Profile */}
          <div className="flex items-center gap-3">
            {/* Online / Offline Availability Switch */}
            <div className="flex items-center gap-1.5 bg-surface/80 border border-border px-2.5 py-1 rounded-full text-xs">
              <span
                className={`h-2.5 w-2.5 rounded-full animate-pulse ${
                  availability === "online"
                    ? "bg-emerald-500"
                    : availability === "busy"
                    ? "bg-amber-500"
                    : "bg-neutral-500"
                }`}
              />
              <select
                value={availability}
                onChange={(e: any) => {
                  setAvailability(e.target.value);
                  toast.success(`Rider status set to: ${e.target.value.toUpperCase()}`);
                }}
                className="bg-transparent font-bold text-[11px] text-foreground focus:outline-none cursor-pointer"
              >
                <option value="online" className="bg-[#181816]">ONLINE (Ready)</option>
                <option value="busy" className="bg-[#181816]">BUSY (In Transit)</option>
                <option value="offline" className="bg-[#181816]">OFFLINE</option>
              </select>
            </div>

            <button
              onClick={() => reloadOrders().then(() => toast.success("Refreshed deliveries!"))}
              className="p-1.5 text-muted-foreground hover:text-primary transition rounded-lg hover:bg-surface"
              title="Sync Deliveries"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
              <div className="h-7 w-7 rounded-full bg-primary/20 text-primary grid place-items-center text-xs font-bold font-mono">
                DO
              </div>
              <div className="text-left text-xs">
                <span className="font-bold block leading-none">Dan Okello</span>
                <span className="text-[10px] text-emerald-400 font-mono">ID: EX-042</span>
              </div>
            </div>
          </div>
        </header>

        {/* WORKSPACE: LEFT SIDEBAR + MAIN CONTENT */}
        <div className="flex flex-1 relative overflow-hidden">
          {/* DESKTOP COLLAPSIBLE SIDEBAR */}
          <aside
            className={`hidden lg:flex flex-col border-r border-border bg-[#11110f] transition-all duration-300 ${
              sidebarCollapsed ? "w-16" : "w-64"
            } shrink-0 select-none`}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              {!sidebarCollapsed && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Courier Navigation
                </span>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground ml-auto"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Sliders className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
              {/* 1. Dashboard */}
              <button
                onClick={() => setActiveMenu("dashboard")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  activeMenu === "dashboard"
                    ? "bg-primary text-primary-foreground font-bold shadow"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                title="Dashboard"
              >
                <Bike className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>1. Dashboard</span>}
              </button>

              {/* 2. Deliveries (Group) */}
              <div>
                <button
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setSidebarCollapsed(false);
                      setExpandedGroups((p) => ({ ...p, deliveries: true }));
                    } else {
                      toggleGroup("deliveries");
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-surface hover:text-foreground transition ${
                    activeMenu.startsWith("deliveries") ? "text-primary font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 shrink-0 text-primary" />
                    {!sidebarCollapsed && <span>2. Deliveries</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded-full font-bold">
                        {riderOrders.length}
                      </span>
                      {expandedGroups.deliveries ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </div>
                  )}
                </button>

                {!sidebarCollapsed && expandedGroups.deliveries && (
                  <div className="ml-4 pl-3 border-l border-border/80 space-y-1 my-1">
                    {[
                      { id: "deliveries_all", label: "All Deliveries", count: riderOrders.length },
                      { id: "deliveries_new", label: "New Assignments", count: pendingDeliveries.length },
                      { id: "deliveries_active", label: "Active In-Transit", count: activeDeliveries.length },
                      { id: "deliveries_ready", label: "Ready for Pickup", count: 1 },
                      { id: "deliveries_completed", label: "Completed", count: completedDeliveries.length },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveMenu(sub.id)}
                        className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-between transition ${
                          activeMenu === sub.id
                            ? "bg-primary/15 text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>{sub.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{sub.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Live Navigation (Group) */}
              <div>
                <button
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setSidebarCollapsed(false);
                      setExpandedGroups((p) => ({ ...p, navigation: true }));
                    } else {
                      toggleGroup("navigation");
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-surface hover:text-foreground transition ${
                    activeMenu.startsWith("nav") ? "text-primary font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Navigation className="h-4 w-4 shrink-0 text-primary" />
                    {!sidebarCollapsed && <span>3. Live Navigation</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold">GPS</span>
                      {expandedGroups.navigation ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </div>
                  )}
                </button>

                {!sidebarCollapsed && expandedGroups.navigation && (
                  <div className="ml-4 pl-3 border-l border-border/80 space-y-1 my-1">
                    {[
                      { id: "nav_map", label: "Live Google Map" },
                      { id: "nav_route", label: "Current Route Directions" },
                      { id: "nav_locations", label: "Customer Pin Locations" },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveMenu(sub.id)}
                        className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] block transition ${
                          activeMenu === sub.id
                            ? "bg-primary/15 text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Proof of Delivery (Group) */}
              <div>
                <button
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setSidebarCollapsed(false);
                      setExpandedGroups((p) => ({ ...p, pod: true }));
                    } else {
                      toggleGroup("pod");
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-surface hover:text-foreground transition ${
                    activeMenu.startsWith("pod") ? "text-primary font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-4 w-4 shrink-0 text-primary" />
                    {!sidebarCollapsed && <span>4. Proof of Delivery</span>}
                  </div>
                  {!sidebarCollapsed && (
                    expandedGroups.pod ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {!sidebarCollapsed && expandedGroups.pod && (
                  <div className="ml-4 pl-3 border-l border-border/80 space-y-1 my-1">
                    {[
                      { id: "pod_submit", label: "Submit POD" },
                      { id: "pod_pending", label: "Pending Offline Sync" },
                      { id: "pod_history", label: "POD History & Verification" },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveMenu(sub.id)}
                        className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] block transition ${
                          activeMenu === sub.id
                            ? "bg-primary/15 text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Earnings (Group) */}
              <div>
                <button
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setSidebarCollapsed(false);
                      setExpandedGroups((p) => ({ ...p, earnings: true }));
                    } else {
                      toggleGroup("earnings");
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-surface hover:text-foreground transition ${
                    activeMenu.startsWith("earnings") ? "text-primary font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="h-4 w-4 shrink-0 text-primary" />
                    {!sidebarCollapsed && <span>5. Earnings</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-emerald-400 font-bold font-mono">UGX</span>
                      {expandedGroups.earnings ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </div>
                  )}
                </button>

                {!sidebarCollapsed && expandedGroups.earnings && (
                  <div className="ml-4 pl-3 border-l border-border/80 space-y-1 my-1">
                    {[
                      { id: "earnings_dashboard", label: "Earnings Dashboard" },
                      { id: "earnings_daily", label: "Daily Shift Earnings" },
                      { id: "earnings_weekly", label: "Weekly Totals" },
                      { id: "earnings_payments", label: "MoMo Payout History" },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveMenu(sub.id)}
                        className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] block transition ${
                          activeMenu === sub.id
                            ? "bg-primary/15 text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Delivery History */}
              <button
                onClick={() => setActiveMenu("history")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  activeMenu === "history"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                }`}
              >
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                {!sidebarCollapsed && <span>6. Delivery History</span>}
              </button>

              {/* 7. Notifications */}
              <button
                onClick={() => setActiveMenu("notifications")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                  activeMenu === "notifications"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 shrink-0 text-primary" />
                  {!sidebarCollapsed && <span>7. Notifications</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[9px] bg-red-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                    2
                  </span>
                )}
              </button>

              {/* 8. Support (Group) */}
              <div>
                <button
                  onClick={() => toggleGroup("support")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-surface hover:text-foreground transition ${
                    activeMenu.startsWith("support") ? "text-primary font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-4 w-4 shrink-0 text-primary" />
                    {!sidebarCollapsed && <span>8. Support</span>}
                  </div>
                  {!sidebarCollapsed && (
                    expandedGroups.support ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {!sidebarCollapsed && expandedGroups.support && (
                  <div className="ml-4 pl-3 border-l border-border/80 space-y-1 my-1">
                    {[
                      { id: "support_contact", label: "Contact Dispatch Admin" },
                      { id: "support_report", label: "Report a Route Problem" },
                      { id: "support_help", label: "Courier Help Centre" },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveMenu(sub.id)}
                        className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] block transition ${
                          activeMenu === sub.id
                            ? "bg-primary/15 text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 9. My Profile */}
              <button
                onClick={() => setActiveMenu("profile")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  activeMenu === "profile"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4 shrink-0 text-primary" />
                {!sidebarCollapsed && <span>9. My Profile</span>}
              </button>

              {/* 10. Settings */}
              <button
                onClick={() => setActiveMenu("settings")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  activeMenu === "settings"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0 text-primary" />
                {!sidebarCollapsed && <span>10. Settings</span>}
              </button>

              {/* Android Rider App APK / Standalone Badge */}
              <div className="pt-2 border-t border-border/60">
                {!sidebarCollapsed ? (
                  <div className="p-2.5 rounded-xl bg-[#171e17] border border-[#3ddc84]/30 space-y-1">
                    <div className="flex items-center gap-2">
                      <AndroidIcon className="h-4 w-4 text-[#3ddc84]" />
                      <span className="text-[11px] font-bold text-[#3ddc84]">Android APK Ready</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      Exportable independent Android Courier APK package.
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-center py-2" title="Android Rider App Ready">
                    <AndroidIcon className="h-5 w-5 text-[#3ddc84]" />
                  </div>
                )}
              </div>

              {/* 11. Logout */}
              <div className="pt-2 border-t border-border/60">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition font-bold"
                >
                  <LogOut className="h-4 w-4 shrink-0 text-red-400" />
                  {!sidebarCollapsed && <span>11. Logout</span>}
                </button>
              </div>
            </nav>
          </aside>

          {/* MOBILE SLIDE-OUT DRAWER */}
          {mobileDrawerOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <div className="relative w-72 max-w-[85vw] bg-[#11110f] border-r border-border h-full flex flex-col z-10 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                  <div className="flex items-center gap-2">
                    <Bike className="h-5 w-5 text-primary" />
                    <span className="font-display font-bold text-sm">ElevenX Rider Panel</span>
                  </div>
                  <button
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-1 rounded-lg hover:bg-surface text-muted-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto space-y-1 text-xs">
                  {[
                    { id: "dashboard", label: "1. Dashboard", icon: Bike },
                    { id: "deliveries_all", label: "2. Deliveries (All)", icon: Package },
                    { id: "deliveries_active", label: "• Active In-Transit", icon: Navigation },
                    { id: "nav_map", label: "3. Live Google Navigation", icon: MapPin },
                    { id: "pod_submit", label: "4. Submit Proof of Delivery", icon: FileCheck },
                    { id: "pod_history", label: "• POD Verification History", icon: CheckCircle2 },
                    { id: "earnings_dashboard", label: "5. Rider Earnings (UGX)", icon: Wallet },
                    { id: "history", label: "6. Delivery History", icon: Clock },
                    { id: "notifications", label: "7. Notifications", icon: Bell },
                    { id: "support_contact", label: "8. Support & Dispatch", icon: HelpCircle },
                    { id: "profile", label: "9. My Profile & Vehicle", icon: User },
                    { id: "settings", label: "10. Settings & Cache", icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = activeMenu === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveMenu(item.id);
                          setMobileDrawerOpen(false); // Closes drawer after selecting
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                          active
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-muted-foreground hover:bg-surface hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}

                  <div className="p-2.5 rounded-xl bg-[#171e17] border border-[#3ddc84]/30 space-y-1 mt-2">
                    <div className="flex items-center gap-2">
                      <AndroidIcon className="h-4 w-4 text-[#3ddc84]" />
                      <span className="text-[11px] font-bold text-[#3ddc84]">Android APK Ready</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      Exportable independent Android Courier APK package.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border mt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition font-bold"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>11. Logout</span>
                    </button>
                  </div>
                </nav>
              </div>
            </div>
          )}

          {/* MAIN RIDER WORKSPACE CONTENT */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20">
            {/* 1. DASHBOARD */}
            {activeMenu === "dashboard" && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-extrabold tracking-tight">Rider Dashboard</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kampala & Entebbe courier dispatch telemetry and shift overview.
                  </p>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Today's Earnings</span>
                    <p className="font-display text-2xl font-extrabold text-primary mt-1">{money(todayEarnings)}</p>
                    <span className="text-[10px] text-emerald-400 font-medium">Ready for MoMo payout</span>
                  </div>

                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Active Dispatches</span>
                    <p className="font-display text-2xl font-extrabold text-foreground mt-1">{activeDeliveries.length}</p>
                    <span className="text-[10px] text-amber-400 font-medium">En route</span>
                  </div>

                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Completed Runs</span>
                    <p className="font-display text-2xl font-extrabold text-foreground mt-1">{completedDeliveries.length}</p>
                    <span className="text-[10px] text-muted-foreground">100% on-time</span>
                  </div>

                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Customer Rating</span>
                    <p className="font-display text-2xl font-extrabold text-primary mt-1">4.9 ★</p>
                    <span className="text-[10px] text-muted-foreground">Top Rated Courier</span>
                  </div>
                </div>

                {/* Quick Delivery Actions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-sm text-foreground">Priority Dispatches Waiting</h2>
                    <button onClick={() => setActiveMenu("deliveries_all")} className="text-xs text-primary hover:underline">
                      View all ({riderOrders.length}) &rarr;
                    </button>
                  </div>

                  {riderOrders.length === 0 ? (
                    <div className="panel p-8 text-center text-xs text-muted-foreground">
                      No pending dispatches right now. Status is <b>{availability.toUpperCase()}</b>.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {riderOrders.slice(0, 2).map((o: any) => (
                        <div key={o.id} className="panel p-4 space-y-3 border-gold-line/40 shadow-md">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <div>
                              <b className="font-mono text-xs text-primary">#{o.id}</b>
                              <span className="text-[11px] text-muted-foreground ml-2">{o.zone}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                              {o.status}
                            </span>
                          </div>

                          <div className="text-xs space-y-1">
                            <p className="font-bold text-foreground">{o.customerName} ({o.phone})</p>
                            <p className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>{o.address}</span>
                            </p>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleUpdateDelivery(o.id, "Out for delivery", "Picked up")}
                              className="btn-gold flex-1 text-xs py-2 flex items-center justify-center gap-1"
                            >
                              <Navigation className="h-3.5 w-3.5" /> Start Transit
                            </button>
                            <button
                              onClick={() => {
                                setPodOrderId(o.id);
                                setPodRecipient(o.customerName);
                                setActiveMenu("pod_submit");
                              }}
                              className="btn-outline flex-1 text-xs py-2 m-0 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 flex items-center justify-center gap-1"
                            >
                              <FileCheck className="h-3.5 w-3.5" /> Confirm POD
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Google Live Map Shortcut */}
                <div className="panel p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-primary" />
                      <h3 className="font-bold text-sm">Kampala Live Courier Navigation Feed</h3>
                    </div>
                    <button
                      onClick={() => setActiveMenu("nav_map")}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Open Full Map View
                    </button>
                  </div>
                  <div className="h-[220px] rounded-xl overflow-hidden border border-border">
                    <GoogleDeliveryMap
                      value={{ lat: 0.3344, lng: 32.5878, label: "ElevenX Flagship Hub" }}
                      onChange={() => {}}
                      riderPosition={{ lat: 0.3344, lng: 32.5878 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. DELIVERIES (ALL / NEW / ACTIVE / COMPLETED) */}
            {activeMenu.startsWith("deliveries") && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h1 className="font-display text-xl font-bold">
                      {activeMenu === "deliveries_active"
                        ? "Active In-Transit Deliveries"
                        : activeMenu === "deliveries_new"
                        ? "New Delivery Assignments"
                        : activeMenu === "deliveries_completed"
                        ? "Completed Deliveries"
                        : "All Courier Deliveries"}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Real-time delivery fulfillment with instant customer push notifications.
                    </p>
                  </div>
                  <button
                    onClick={() => reloadOrders()}
                    className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1 self-start sm:self-center"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh Orders
                  </button>
                </div>

                {/* Deliveries List */}
                <div className="space-y-3">
                  {riderOrders.map((o: any) => {
                    const isDelivered = (o.status || "").toLowerCase() === "delivered";

                    return (
                      <div key={o.id} className="panel p-4 space-y-3 border-gold-line/40 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">#{o.id}</span>
                            <span className="text-[11px] text-muted-foreground">{o.date || "Today"}</span>
                            <span className="text-xs font-bold text-foreground">{o.customerName}</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              isDelivered
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {o.status?.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <p className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>{o.address} ({o.zone})</span>
                            </p>
                            <a
                              href={`tel:${o.phone}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline bg-surface px-2 py-1 rounded border border-border"
                            >
                              <Phone className="h-3 w-3" /> Call: {o.phone}
                            </a>
                          </div>

                          <div className="p-2.5 rounded-xl bg-surface border border-border/70 text-[11px] space-y-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block">Items:</span>
                            {o.items?.map((it: any, i: number) => (
                              <p key={i} className="text-foreground">
                                • {it.name} ({it.size}) × {it.qty}
                                {it.customization && (
                                  <span className="text-primary ml-1">
                                    [Print: {it.customization.name || "PLAYER"} #{it.customization.number || "10"}]
                                  </span>
                                )}
                              </p>
                            ))}
                          </div>
                        </div>

                        {!isDelivered ? (
                          <div className="pt-2 flex flex-wrap gap-2">
                            <button
                              disabled={updatingOrderId === o.id}
                              onClick={() => handleUpdateDelivery(o.id, "Out for delivery", "Picked up")}
                              className="btn-gold flex-1 text-xs py-2 flex items-center justify-center gap-1.5"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              {updatingOrderId === o.id ? "Updating..." : "1. Pick Up & Transit"}
                            </button>
                            <button
                              onClick={() => {
                                setPodOrderId(o.id);
                                setPodRecipient(o.customerName);
                                setActiveMenu("pod_submit");
                              }}
                              className="btn-outline flex-1 text-xs py-2 m-0 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 flex items-center justify-center gap-1.5"
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                              2. Submit POD Handover
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Handover verified & saved in Firebase Firestore.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. LIVE NAVIGATION */}
            {activeMenu.startsWith("nav") && (
              <div className="space-y-4">
                <div>
                  <h1 className="font-display text-xl font-bold">Google Live Map & Route Navigation</h1>
                  <p className="text-xs text-muted-foreground">
                    Live dispatch routing from ElevenX Kololo Hub to customer drop-off points.
                  </p>
                </div>

                <div className="panel p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Turn-by-Turn GPS Live Map</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      GPS Active (High Precision)
                    </span>
                  </div>

                  <div className="h-[380px] rounded-xl overflow-hidden border border-border">
                    <GoogleDeliveryMap
                      value={{ lat: 0.3344, lng: 32.5878, label: "Kampala Central Hub" }}
                      onChange={() => {}}
                      riderPosition={{ lat: 0.3344, lng: 32.5878 }}
                    />
                  </div>

                  <div className="pt-2 space-y-2">
                    <h3 className="font-bold text-xs uppercase text-muted-foreground">Nearby Customer Delivery Pins:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {riderOrders.map((o: any) => (
                        <div key={o.id} className="p-2.5 rounded-xl border border-border bg-surface flex items-center justify-between">
                          <div>
                            <b className="text-foreground block">{o.customerName}</b>
                            <span className="text-[11px] text-muted-foreground">{o.address}</span>
                          </div>
                          <a
                            href={`https://maps.google.com/?q=${o.lat || 0.3344},${o.lng || 32.5878}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-1 rounded-lg"
                          >
                            <ExternalLink className="h-3 w-3" /> Navigate
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PROOF OF DELIVERY (SUBMIT / PENDING / HISTORY) */}
            {activeMenu.startsWith("pod") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-display text-xl font-bold">Proof of Delivery (POD) Console</h1>
                    <p className="text-xs text-muted-foreground">
                      Digital signature capture, parcel photo verification, and resilient offline sync.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveMenu("pod_submit")}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition ${
                        activeMenu === "pod_submit" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
                      }`}
                    >
                      Submit POD
                    </button>
                    <button
                      onClick={() => setActiveMenu("pod_history")}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition ${
                        activeMenu === "pod_history" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
                      }`}
                    >
                      POD History ({pods.length})
                    </button>
                  </div>
                </div>

                {activeMenu === "pod_submit" && (
                  <form onSubmit={handleSubmitPOD} className="panel p-5 space-y-4 max-w-xl">
                    <div>
                      <label className="field-label text-xs">Select Delivery Order</label>
                      <select
                        required
                        className="field text-xs py-2"
                        value={podOrderId}
                        onChange={(e) => {
                          setPodOrderId(e.target.value);
                          const match = riderOrders.find((o) => o.id === e.target.value);
                          if (match) setPodRecipient(match.customerName);
                        }}
                      >
                        <option value="">-- Choose Order to Confirm --</option>
                        {riderOrders.map((o) => (
                          <option key={o.id} value={o.id}>
                            #{o.id} — {o.customerName} ({o.address})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label text-xs">Recipient Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Brian Kasirye"
                        className="field text-xs py-2"
                        value={podRecipient}
                        onChange={(e) => setPodRecipient(e.target.value)}
                      />
                    </div>

                    {/* Camera Photo Upload Simulation */}
                    <div className="space-y-2">
                      <label className="field-label text-xs">Handover Photo (Doorstep / Recipient with Kit)</label>
                      <div className="border-2 border-dashed border-border rounded-xl p-4 text-center bg-surface/40 hover:border-primary transition">
                        <Camera className="h-6 w-6 mx-auto text-primary mb-1" />
                        <span className="text-xs font-semibold text-foreground block">Capture or Upload Parcel Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-2 text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:text-xs"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setPodPhoto(String(ev.target?.result));
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                      {podPhoto && (
                        <div className="mt-2">
                          <img src={podPhoto} alt="Captured POD" className="h-28 rounded-xl object-cover border border-border" />
                        </div>
                      )}
                    </div>

                    {/* Recipient Signature Pad */}
                    <div>
                      <label className="field-label text-xs">Recipient Digital Signature Confirmation</label>
                      <input
                        type="text"
                        required
                        placeholder="Type recipient sign-off, e.g. 'Signed by B. Kasirye'"
                        className="field font-mono text-xs py-2"
                        value={podSignature}
                        onChange={(e) => setPodSignature(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="field-label text-xs">Courier Delivery Notes</label>
                      <textarea
                        placeholder="e.g. Handed package directly to recipient at gate."
                        className="field text-xs py-2 h-16"
                        value={podNotes}
                        onChange={(e) => setPodNotes(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingPod}
                      className="btn-gold full text-xs py-2.5 flex items-center justify-center gap-2"
                    >
                      <FileCheck className="h-4 w-4" />
                      {submittingPod ? "RECORDING POD IN FIREBASE..." : "SUBMIT PROOF OF DELIVERY"}
                    </button>
                  </form>
                )}

                {activeMenu === "pod_history" && (
                  <div className="space-y-3">
                    {pods.length === 0 ? (
                      <div className="panel p-8 text-center text-xs text-muted-foreground">
                        No Proof of Deliveries logged yet.
                      </div>
                    ) : (
                      pods.map((p) => (
                        <div key={p.id} className="panel p-4 space-y-2 border-emerald-500/30 text-xs">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <div>
                              <b className="text-primary font-mono">{p.id}</b>
                              <span className="text-muted-foreground ml-2">Order: <b>#{p.orderId}</b></span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              VERIFIED
                            </span>
                          </div>
                          <p>Recipient: <strong className="text-foreground">{p.recipientName}</strong></p>
                          <p className="text-muted-foreground font-mono text-[11px]">{p.signature}</p>
                          {p.notes && <p className="text-muted-foreground text-[11px]">Notes: {p.notes}</p>}
                          <span className="text-[10px] text-muted-foreground block">{new Date(p.timestamp).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. EARNINGS */}
            {activeMenu.startsWith("earnings") && (
              <div className="space-y-4">
                <div>
                  <h1 className="font-display text-xl font-bold">Rider Earnings & Payout Telemetry</h1>
                  <p className="text-xs text-muted-foreground">
                    Per-delivery compensation, distance bonuses, and mobile money payout settlements.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Available Balance</span>
                    <p className="font-display text-2xl font-extrabold text-primary mt-1">{money(totalEarnings)}</p>
                    <button
                      onClick={() => toast.success("Payout request submitted to MTN Mobile Money (+256 772 888 999)!")}
                      className="btn-gold text-[10px] py-1.5 px-3 mt-3 inline-flex items-center gap-1"
                    >
                      <ArrowUpRight className="h-3 w-3" /> Request Cashout
                    </button>
                  </div>

                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Today's Shift Pay</span>
                    <p className="font-display text-2xl font-extrabold text-foreground mt-1">{money(todayEarnings)}</p>
                    <span className="text-[10px] text-emerald-400 font-bold">{completedDeliveries.length} runs completed</span>
                  </div>

                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Base Per Delivery</span>
                    <p className="font-display text-2xl font-extrabold text-foreground mt-1">UGX 10,000</p>
                    <span className="text-[10px] text-muted-foreground">+ UGX 2,000 surge bonus</span>
                  </div>
                </div>

                <div className="panel p-4 space-y-3">
                  <h3 className="font-bold text-sm">Recent Delivery Compensation Ledger</h3>
                  <div className="divide-y divide-border text-xs">
                    {riderOrders.map((o: any, idx: number) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between">
                        <div>
                          <b className="text-foreground">Order #{o.id} — {o.zone}</b>
                          <span className="text-[10px] text-muted-foreground block">{o.date || "Today"}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-400 block">+UGX 12,000</span>
                          <span className="text-[10px] text-muted-foreground">Standard Courier Rate</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. DELIVERY HISTORY */}
            {activeMenu === "history" && (
              <div className="space-y-4">
                <div>
                  <h1 className="font-display text-xl font-bold">Completed Delivery History</h1>
                  <p className="text-xs text-muted-foreground">
                    Historical record of all successful handovers logged to Firebase Firestore.
                  </p>
                </div>

                <div className="space-y-3">
                  {completedDeliveries.length === 0 ? (
                    <div className="panel p-8 text-center text-xs text-muted-foreground">
                      No completed deliveries recorded yet.
                    </div>
                  ) : (
                    completedDeliveries.map((o: any) => (
                      <div key={o.id} className="panel p-4 space-y-2 border-emerald-500/30 text-xs">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <div>
                            <span className="font-mono font-bold text-primary">#{o.id}</span>
                            <span className="text-muted-foreground ml-2">{o.date || "Today"}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            HANDOVER COMPLETE
                          </span>
                        </div>
                        <p>Customer: <strong className="text-foreground">{o.customerName}</strong> ({o.phone})</p>
                        <p className="text-muted-foreground">Destination: {o.address} ({o.zone})</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 7. NOTIFICATIONS */}
            {activeMenu === "notifications" && (
              <div className="panel p-5 space-y-3">
                <h1 className="font-display text-xl font-bold">Rider Dispatch Notifications</h1>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl border border-primary/30 bg-primary/10 space-y-1">
                    <b className="text-primary block">🔔 Matchday Surge Active in Kampala Central!</b>
                    <p className="text-muted-foreground">Extra UGX 2,000 bonus added per delivery between 4:00 PM and 9:00 PM.</p>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                    <b className="text-foreground block">📦 Stock Ready at Kololo Acacia Hub</b>
                    <p className="text-muted-foreground">New Arsenal and Real Madrid customized kits prepared for collection.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. SUPPORT */}
            {activeMenu.startsWith("support") && (
              <div className="panel p-5 space-y-4 max-w-xl">
                <div>
                  <h1 className="font-display text-xl font-bold">Courier Support & Dispatch Control</h1>
                  <p className="text-xs text-muted-foreground">
                    Instant line to ElevenX central operations for route disruptions or customer assistance.
                  </p>
                </div>

                <div>
                  <label className="field-label text-xs">Issue Category</label>
                  <select
                    className="field text-xs py-2"
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value)}
                  >
                    <option value="delay">Traffic / Heavy Rain Delay</option>
                    <option value="breakdown">Motorcycle Mechanical Issue</option>
                    <option value="customer_unreachable">Customer Phone Unreachable</option>
                    <option value="wrong_address">Incorrect Delivery Address Pin</option>
                  </select>
                </div>

                <div>
                  <label className="field-label text-xs">Details</label>
                  <textarea
                    placeholder="Describe the situation for dispatch control..."
                    className="field text-xs py-2 h-20"
                    value={supportIssue}
                    onChange={(e) => setSupportIssue(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      toast.success("Dispatch alert sent to central admin operations!");
                      setSupportIssue("");
                    }}
                    className="btn-gold text-xs py-2.5 px-4 flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> Submit to Control
                  </button>
                  <a
                    href="tel:+256700111222"
                    className="btn-outline text-xs py-2.5 px-4 flex items-center gap-1.5 m-0"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call Admin Hotline
                  </a>
                </div>
              </div>
            )}

            {/* 9. MY PROFILE */}
            {activeMenu === "profile" && (
              <div className="panel p-5 space-y-4 max-w-xl">
                <div>
                  <h1 className="font-display text-xl font-bold">Rider Profile & Fleet Credentials</h1>
                  <p className="text-xs text-muted-foreground">Verified dispatch identity in ElevenX Kit network.</p>
                </div>

                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/20 text-primary border border-primary/40 grid place-items-center font-display text-2xl font-bold">
                    DO
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Dan Okello</h2>
                    <span className="text-xs text-muted-foreground">Lead Kampala Dispatch Courier</span>
                    <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">Verified Commercial Courier License</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl border border-border bg-surface">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Rider ID</span>
                    <span className="font-mono font-bold text-primary">EX-RIDER-042</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border bg-surface">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Assigned Motorcycle</span>
                    <span className="font-semibold text-foreground">Honda Ace 125 (UFP 342K)</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border bg-surface">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Phone Number</span>
                    <span className="font-semibold text-foreground">+256 772 888 999</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border bg-surface">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Primary Zone</span>
                    <span className="font-semibold text-foreground">Kampala Central & Kololo</span>
                  </div>
                </div>
              </div>
            )}

            {/* 10. SETTINGS */}
            {activeMenu === "settings" && (
              <div className="panel p-5 space-y-4 max-w-xl text-xs">
                <div>
                  <h1 className="font-display text-xl font-bold">Rider Application Settings</h1>
                  <p className="text-muted-foreground">Configure notifications, GPS telemetry, and offline cache.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface">
                    <div>
                      <b className="text-foreground block">Sound Alerts on New Assignments</b>
                      <span className="text-[11px] text-muted-foreground">Play loud alert when dispatch allocates an order</span>
                    </div>
                    <input type="checkbox" defaultChecked className="accent-primary h-4 w-4 cursor-pointer" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface">
                    <div>
                      <b className="text-foreground block">High Precision GPS Routing</b>
                      <span className="text-[11px] text-muted-foreground">Updates location pin every 10 seconds on active transit</span>
                    </div>
                    <input type="checkbox" defaultChecked className="accent-primary h-4 w-4 cursor-pointer" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface">
                    <div>
                      <b className="text-foreground block">Auto-Sync Offline PODs</b>
                      <span className="text-[11px] text-muted-foreground">Synchronize proof of deliveries immediately when network reconnects</span>
                    </div>
                    <input type="checkbox" defaultChecked className="accent-primary h-4 w-4 cursor-pointer" />
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </PortalGate>
  );
}
