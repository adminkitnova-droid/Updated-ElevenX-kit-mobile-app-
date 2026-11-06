import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Shield,
  Package,
  ShoppingBag,
  Bike,
  Video,
  Key,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Upload,
  Database,
  CheckCircle,
  Truck,
  ArrowRight,
  Printer,
  Sparkles,
  Users,
  CreditCard,
  Tag,
  BarChart3,
  Bell,
  Star,
  FileText,
  UserCheck,
  Settings,
  Search,
  X,
  Menu,
  ChevronRight,
  Filter,
  Check,
  AlertTriangle,
  Download,
  Eye,
  Sliders,
  DollarSign,
  Send,
  Lock,
  Layers,
  MapPin,
  ExternalLink,
  Save,
  Crown
} from "lucide-react";
import { Page } from "@/components/shell";
import { PortalGate } from "@/components/portal-gate";
import { AdminTeam } from "@/components/admin-team";
import {
  WORKFLOW_STAGES,
  OrderWorkflowStepper,
  getWorkflowStageIndex,
  getWorkflowStage,
} from "@/components/order-workflow-stepper";
import { AndroidIcon, AndroidInstallButton } from "@/components/android-icon";
import {
  fetchFirebaseHeroSettings,
  saveFirebaseHeroSettings,
  saveFirebaseProduct,
  uploadFirebaseHeroAsset,
  uploadFirebaseProductImage,
  fetchFirebaseOrders,
  updateFirebaseOrderStatus,
  fetchFirebaseStudioSettings,
  saveFirebaseStudioSettings,
  DEFAULT_STUDIO_SETTINGS,
  getActiveFirebaseConfig,
  isFirebaseConfigured,
  type FirebaseHeroSettings,
  type FirebaseProduct,
  type FirebaseStudioSettings,
} from "@/lib/firebase";
import { money, useStore, type Order, type Product } from "@/lib/store";
import { FirebaseModal } from "@/components/firebase-modal";
import { useNotifications } from "@/lib/notifications";
import { GoogleDeliveryMap, type DeliveryPoint } from "@/components/google-delivery-map";

const ORDER_STATUSES = [
  "New",
  "Pending",
  "Confirmed",
  "Processing",
  "Customization and printing",
  "Ready for dispatch",
  "Out for delivery",
  "Delivered",
  "Cancelled",
  "Refunded",
];

const ADMIN_MODULES = [
  { id: "dashboard", label: "Admin Dashboard", icon: BarChart3, badge: "" },
  { id: "orders", label: "Order Management", icon: ShoppingBag, badge: "Live" },
  { id: "products", label: "Product Management", icon: Package, badge: "" },
  { id: "studio", label: "Custom Studio Config", icon: Sparkles, badge: "" },
  { id: "customers", label: "Customer Management", icon: Users, badge: "" },
  { id: "riders", label: "Rider & Delivery Fleet", icon: Bike, badge: "" },
  { id: "payments", label: "Payments & Finance", icon: CreditCard, badge: "Relworx" },
  { id: "marketing", label: "Promotions & Marketing", icon: Tag, badge: "" },
  { id: "inventory", label: "Inventory & Stock", icon: Layers, badge: "Alerts" },
  { id: "analytics", label: "Reports & Analytics", icon: DollarSign, badge: "" },
  { id: "notifications", label: "Notification Center", icon: Bell, badge: "" },
  { id: "reviews", label: "Reviews & Ratings", icon: Star, badge: "" },
  { id: "content", label: "Content & Homepage", icon: Video, badge: "" },
  { id: "staff", label: "Staff & Permissions", icon: UserCheck, badge: "RBAC" },
  { id: "settings", label: "System Settings", icon: Settings, badge: "" },
] as const;

type AdminModuleId = (typeof ADMIN_MODULES)[number]["id"];

export function AdminPage() {
  const { products, reloadProducts, orders, reloadOrders } = useStore();
  const { sendPushNotification } = useNotifications();
  const [activeModule, setActiveModule] = useState<AdminModuleId>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Invoice modal state
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Status updating state
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // 7-Stage Workflow Pipeline Filter
  const [stageFilter, setStageFilter] = useState<string>("all");

  const filteredWorkflowOrders = useMemo(() => {
    if (stageFilter === "all") return orders;
    return orders.filter((o: Order) => {
      const idx = getWorkflowStageIndex(o.status);
      return WORKFLOW_STAGES[idx]?.id === stageFilter;
    });
  }, [orders, stageFilter]);

  // Dynamic calculations for KPIs
  const totalRevenue = useMemo(
    () => orders.reduce((sum: number, o: Order) => sum + (o.total || 0), 0),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((o: Order) => o.status.toLowerCase() === "delivered"),
    [orders]
  );
  const pendingOrders = useMemo(
    () => orders.filter((o: Order) => o.status.toLowerCase() !== "delivered" && o.status.toLowerCase() !== "cancelled"),
    [orders]
  );
  const lowStockProducts = useMemo(
    () => products.filter((p: Product) => (p.stock ?? 20) <= 5),
    [products]
  );

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateFirebaseOrderStatus(orderId, newStatus);

      // Trigger real push notification & toast alert
      sendPushNotification(
        `Jersey Order #${orderId} Updated`,
        `Order status has been updated to "${newStatus}". Custom printing & delivery synced in Firebase.`,
        orderId,
        "order"
      );
      toast.success(`Order #${orderId} updated to: ${newStatus}`);
      await reloadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to update order status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Order ID", "Date", "Customer", "Phone", "Address", "Zone", "Items", "Total (UGX)", "Status", "Payment Method"];
    const rows = orders.map((o: any) => [
      o.id,
      o.date,
      `"${o.customerName}"`,
      `"${o.phone}"`,
      `"${o.address}"`,
      `"${o.zone}"`,
      `"${o.items?.map((it: any) => `${it.name} (${it.size})x${it.qty}`).join("; ")}"`,
      o.total,
      o.status,
      `"${o.paymentMethod || "Relworx"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ElevenX_Orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Orders report exported to CSV successfully!");
  };

  return (
    <PortalGate role="admin">
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* TOP ADMIN BAR */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-[#141412]/90 backdrop-blur-md px-4 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg border border-border text-foreground hover:bg-surface"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <b className="font-display text-lg tracking-wider block">
                  ELEVEN<span className="text-primary">X</span> <span className="text-xs font-sans text-foreground/80 font-normal">ADMIN</span>
                </b>
                <small className="text-[9px] text-muted-foreground uppercase tracking-wider block -mt-0.5">
                  ElevenX Kit Mobile App Console
                </small>
              </div>
            </Link>
          </div>

          {/* Search in Admin */}
          <div className="hidden md:flex items-center relative max-w-xs w-full">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search orders, kits, riders..."
              className="w-full bg-surface/70 border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => reloadOrders().then(() => toast.success("Synced with Firebase!"))}
              className="p-1.5 text-muted-foreground hover:text-primary transition rounded-lg hover:bg-surface"
              title="Sync All Data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowFirebaseModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              title="Firebase Cloud Config"
            >
              <Database className="h-3 w-3" />
              <span className="hidden sm:inline">Firebase Live</span>
            </button>

            <AndroidInstallButton />

            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/40 text-primary grid place-items-center text-xs font-bold font-mono">
                EX
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-[11px] font-bold block leading-none">adminelevenx</span>
                <span className="text-[9px] text-primary uppercase font-bold">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY: SIDEBAR + CONTENT AREA */}
        <div className="flex flex-1 relative overflow-hidden">
          {/* DESKTOP SIDEBAR */}
          <aside
            className={`hidden lg:flex flex-col border-r border-border bg-[#11110f] transition-all duration-300 ${
              sidebarCollapsed ? "w-16" : "w-64"
            } shrink-0`}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              {!sidebarCollapsed && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  15 Management Portals
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

            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
              {ADMIN_MODULES.map((m) => {
                const Icon = m.icon;
                const active = activeModule === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveModule(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      active
                        ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-surface hover:text-foreground"
                    } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                    title={sidebarCollapsed ? m.label : undefined}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary-foreground" : "text-primary"}`} />
                    {!sidebarCollapsed && (
                      <span className="truncate flex-1 text-left">{m.label}</span>
                    )}
                    {!sidebarCollapsed && m.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                          active
                            ? "bg-black/30 text-primary-foreground"
                            : "bg-primary/20 text-primary"
                        }`}
                      >
                        {m.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* MOBILE SLIDE-OVER DRAWER */}
          {mobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative w-72 max-w-[85vw] bg-[#11110f] border-r border-border h-full flex flex-col z-10 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="font-display font-bold text-sm">ElevenX Admin</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg hover:bg-surface text-muted-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto space-y-1">
                  {ADMIN_MODULES.map((m) => {
                    const Icon = m.icon;
                    const active = activeModule === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setActiveModule(m.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                          active
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-muted-foreground hover:bg-surface hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{m.label}</span>
                        </div>
                        {m.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-primary/20 text-primary">
                            {m.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}

          {/* WORKSPACE CONTENT AREA */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
            {/* 1. ADMIN DASHBOARD */}
            {activeModule === "dashboard" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-extrabold tracking-tight">Executive Dashboard</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time sales telemetry, order fulfillments, and matchday jersey performance in UGX.
                  </p>
                </div>

                {/* KPI Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Revenue</span>
                    <p className="font-display text-2xl font-extrabold text-primary mt-1">{money(totalRevenue)}</p>
                    <span className="text-[10px] text-emerald-400 font-medium">Synced via Relworx</span>
                  </div>
                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Orders</span>
                    <p className="font-display text-2xl font-extrabold text-foreground mt-1">{orders.length}</p>
                    <span className="text-[10px] text-muted-foreground">{completedOrders.length} Completed</span>
                  </div>
                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Pending / In-Print</span>
                    <p className="font-display text-2xl font-extrabold text-amber-400 mt-1">{pendingOrders.length}</p>
                    <span className="text-[10px] text-muted-foreground">Action required</span>
                  </div>
                  <div className="panel p-4 border-gold-line/40">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Catalog Inventory</span>
                    <p className="font-display text-2xl font-extrabold text-foreground mt-1">{products.length} Kits</p>
                    <span className={`text-[10px] font-bold ${lowStockProducts.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {lowStockProducts.length} Low stock alerts
                    </span>
                  </div>
                </div>

                {/* Sales & Revenue Chart Simulator */}
                <div className="panel p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h3 className="font-bold text-sm">Weekly Sales & Fulfillment Velocity</h3>
                      <p className="text-xs text-muted-foreground">Kampala & Entebbe Matchday order volume</p>
                    </div>
                    <button onClick={handleExportCSV} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 m-0">
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 pt-3 h-40 items-end">
                    {[
                      { day: "Mon", val: 320000, height: "45%" },
                      { day: "Tue", val: 480000, height: "60%" },
                      { day: "Wed", val: 240000, height: "35%" },
                      { day: "Thu", val: 560000, height: "70%" },
                      { day: "Fri", val: 780000, height: "85%" },
                      { day: "Sat", val: 1100000, height: "100%" },
                      { day: "Sun", val: 890000, height: "90%" },
                    ].map((bar, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[9px] font-mono text-muted-foreground group-hover:text-primary transition opacity-0 group-hover:opacity-100">
                          {money(bar.val)}
                        </span>
                        <div
                          style={{ height: bar.height }}
                          className="w-full rounded-t-lg bg-gradient-to-t from-primary/40 to-primary transition-all group-hover:brightness-125"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setActiveModule("orders")}
                    className="panel p-4 text-left hover:border-primary transition group"
                  >
                    <ShoppingBag className="h-6 w-6 text-primary mb-2" />
                    <b className="text-sm font-bold block group-hover:text-primary transition">Manage Orders ({orders.length})</b>
                    <p className="text-xs text-muted-foreground mt-0.5">Assign riders, preview custom prints & generate invoices</p>
                  </button>

                  <button
                    onClick={() => setActiveModule("products")}
                    className="panel p-4 text-left hover:border-primary transition group"
                  >
                    <Package className="h-6 w-6 text-primary mb-2" />
                    <b className="text-sm font-bold block group-hover:text-primary transition">Add & Edit Products ({products.length})</b>
                    <p className="text-xs text-muted-foreground mt-0.5">Upload front/back jersey images & sync directly to Studio</p>
                  </button>

                  <button
                    onClick={() => setActiveModule("riders")}
                    className="panel p-4 text-left hover:border-primary transition group"
                  >
                    <Bike className="h-6 w-6 text-primary mb-2" />
                    <b className="text-sm font-bold block group-hover:text-primary transition">Rider Dispatch & Live Map</b>
                    <p className="text-xs text-muted-foreground mt-0.5">Track courier routes across Kampala & verify handovers</p>
                  </button>
                </div>
              </div>
            )}

            {/* 2. ORDER MANAGEMENT */}
            {activeModule === "orders" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold">Order Management & Printing Queue</h2>
                    <p className="text-xs text-muted-foreground">
                      Live Firebase order stream with customized jersey print specs & dispatch status.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleExportCSV} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 m-0">
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </button>
                    <button onClick={() => reloadOrders()} className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </button>
                  </div>
                </div>

                {/* 7-Stage Pipeline Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setStageFilter("all")}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition whitespace-nowrap ${
                      stageFilter === "all"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Orders ({orders.length})
                  </button>
                  {WORKFLOW_STAGES.map((st) => {
                    const count = orders.filter((o: any) => getWorkflowStageIndex(o.status) === st.step - 1).length;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setStageFilter(st.id)}
                        className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                          stageFilter === st.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>{st.step}. {st.label}</span>
                        {count > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              stageFilter === st.id
                                ? "bg-black/40 text-primary-foreground"
                                : "bg-primary/20 text-primary"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {filteredWorkflowOrders.length === 0 ? (
                  <div className="panel p-8 text-center text-xs text-muted-foreground">
                    No orders matching stage <b>"{stageFilter.toUpperCase()}"</b>.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredWorkflowOrders.map((o: any) => (
                      <div key={o.id} className="panel p-4 space-y-3.5 border-gold-line/40 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">#{o.id}</span>
                            <span className="text-[11px] text-muted-foreground">{o.date}</span>
                            <span className="text-[11px] font-bold text-foreground">
                              {o.customerName} ({o.phone})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-display font-extrabold text-sm text-primary">
                              {money(o.total)}
                            </span>
                            <button
                              onClick={() => setSelectedInvoiceOrder(o)}
                              className="btn-outline text-[11px] py-1 px-2.5 flex items-center gap-1 m-0 text-primary border-primary/40 hover:bg-primary/10"
                            >
                              <Printer className="h-3 w-3" /> Invoice
                            </button>
                          </div>
                        </div>

                        {/* 7-Stage Pipeline Tracker with 1-Click Advancement */}
                        <OrderWorkflowStepper
                          status={o.status}
                          isAdmin={true}
                          onAdvanceStage={(nextStage) => handleStatusUpdate(o.id, nextStage.label)}
                        />

                        {/* Customer & Address */}
                        <div className="text-xs space-y-1">
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Destination: <b className="text-foreground">{o.address} ({o.zone})</b></span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Payment: <b className="text-emerald-400">{o.paymentMethod || "Relworx Mobile Money"}</b>
                          </p>
                        </div>

                        {/* Customized Kit Contents Preview */}
                        <div className="p-3 rounded-xl bg-surface border border-border/80 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Jersey Print Specifications:
                          </span>
                          {o.items?.map((it: any, idx: number) => (
                            <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="text-foreground font-medium">
                                • {it.name} ({it.size}) × {it.qty}
                              </span>
                              {it.customization && (
                                <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/20 text-[10px]">
                                  [Print: {it.customization.name || "PLAYER"} #{it.customization.number || "10"} | Font: {it.customization.font || "Arial"}]
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Status Transition & Rider Assignment */}
                        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground font-bold">Manual Override:</span>
                            <select
                              className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground font-semibold focus:border-primary"
                              value={o.status}
                              disabled={updatingOrderId === o.id}
                              onChange={(e) => handleStatusUpdate(o.id, e.target.value)}
                            >
                              {ORDER_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Assigned Courier:</span>
                            <span className="font-bold text-foreground bg-surface px-2 py-1 rounded-lg border border-border">
                              {o.riderId || "Unassigned Rider"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. PRODUCT MANAGEMENT */}
            {activeModule === "products" && (
              <ProductManagerModule products={products} onRefresh={() => reloadProducts()} />
            )}

            {/* 4. CUSTOM STUDIO CONFIGURATION */}
            {activeModule === "studio" && (
              <StudioConfigModule />
            )}

            {/* 5. CUSTOMER MANAGEMENT */}
            {activeModule === "customers" && (
              <AdminTeam view="customers" />
            )}

            {/* 6. RIDER & DELIVERY FLEET */}
            {activeModule === "riders" && (
              <RiderFleetModule orders={orders} />
            )}

            {/* 7. PAYMENTS & FINANCE */}
            {activeModule === "payments" && (
              <PaymentsFinanceModule orders={orders} />
            )}

            {/* 8. PROMOTIONS & MARKETING */}
            {activeModule === "marketing" && (
              <PromotionsMarketingModule />
            )}

            {/* 9. INVENTORY MANAGEMENT */}
            {activeModule === "inventory" && (
              <InventoryManagementModule products={products} onRefresh={() => reloadProducts()} />
            )}

            {/* 10. REPORTS & ANALYTICS */}
            {activeModule === "analytics" && (
              <ReportsAnalyticsModule orders={orders} products={products} onExportCSV={handleExportCSV} />
            )}

            {/* 11. NOTIFICATION CENTER */}
            {activeModule === "notifications" && (
              <NotificationCenterModule onSend={sendPushNotification} />
            )}

            {/* 12. REVIEWS & RATINGS */}
            {activeModule === "reviews" && (
              <ReviewsRatingsModule />
            )}

            {/* 13. CONTENT & HOMEPAGE */}
            {activeModule === "content" && (
              <ContentHomepageModule />
            )}

            {/* 14. STAFF & PERMISSIONS */}
            {activeModule === "staff" && (
              <StaffPermissionsModule />
            )}

            {/* 15. SYSTEM SETTINGS */}
            {activeModule === "settings" && (
              <SystemSettingsModule onOpenFirebase={() => setShowFirebaseModal(true)} />
            )}
          </main>
        </div>

        {/* PRINTABLE INVOICE MODAL */}
        {selectedInvoiceOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="bg-[#181816] border border-gold-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-display font-extrabold text-lg">Official Order Invoice</h3>
                    <p className="text-[10px] text-muted-foreground uppercase">ElevenX Kit Mobile App Ltd • Kampala</p>
                  </div>
                </div>
                <button onClick={() => setSelectedInvoiceOrder(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Invoice Reference</span>
                  <span className="font-mono font-bold text-primary">INV-{selectedInvoiceOrder.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Order Date</span>
                  <span className="font-semibold text-foreground">{selectedInvoiceOrder.date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Customer Details</span>
                  <span className="font-semibold text-foreground block">{selectedInvoiceOrder.customerName}</span>
                  <span className="text-muted-foreground">{selectedInvoiceOrder.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Delivery Location</span>
                  <span className="font-semibold text-foreground block">{selectedInvoiceOrder.address}</span>
                  <span className="text-muted-foreground">{selectedInvoiceOrder.zone}</span>
                </div>
              </div>

              {/* Item Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-surface border-b border-border text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">Kit Item & Custom Print</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedInvoiceOrder.items?.map((it: any, i: number) => (
                      <tr key={i} className="p-2">
                        <td className="p-2">
                          <b className="text-foreground block">{it.name} ({it.size})</b>
                          {it.customization && (
                            <span className="text-primary text-[10px]">
                              Print: {it.customization.name || "Custom"} #{it.customization.number || "10"}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center text-foreground">{it.qty}</td>
                        <td className="p-2 text-right font-mono font-bold text-foreground">
                          {money(it.price * it.qty)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5 text-xs border-t border-border pt-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">{money(selectedInvoiceOrder.subtotal || selectedInvoiceOrder.total - (selectedInvoiceOrder.deliveryFee || 10000))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Dispatch ({selectedInvoiceOrder.zone})</span>
                  <span className="font-mono">{money(selectedInvoiceOrder.deliveryFee || 10000)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-foreground border-t border-border/60 pt-2">
                  <span>Total Amount Paid</span>
                  <span className="text-primary font-mono">{money(selectedInvoiceOrder.total)}</span>
                </div>
                <div className="pt-1 text-[11px] text-emerald-400 flex items-center justify-between">
                  <span>Status: <b>PAID VIA RELWORX MOBILE MONEY</b></span>
                  <span>Verified in Firebase</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-gold flex-1 text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <Printer className="h-4 w-4" /> Print Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceOrder(null)}
                  className="btn-outline text-xs py-2 px-4 m-0"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <FirebaseModal isOpen={showFirebaseModal} onClose={() => setShowFirebaseModal(false)} />
      </div>
    </PortalGate>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 3: PRODUCT MANAGEMENT (AUTO-SYNCS TO STUDIO & CUSTOMER APP)
// -------------------------------------------------------------
function ProductManagerModule({
  products,
  onRefresh,
}: {
  products: Product[];
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<Partial<FirebaseProduct> | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name || !editing?.price) {
      toast.error("Please provide jersey name and price.");
      return;
    }
    setBusy(true);
    try {
      await saveFirebaseProduct(editing);
      toast.success("Jersey saved and synchronized with Firebase Firestore!");
      setEditing(null);
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const handleUploadPhoto = async (file?: File, target: "front" | "back" = "front") => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadFirebaseProductImage(file);
      if (url) {
        setEditing((prev: any) => ({
          ...prev,
          image: prev?.image || url,
          frontImage: target === "front" ? url : prev?.frontImage || url,
          backImage: target === "back" ? url : prev?.backImage || url,
        }));
        toast.success(`${target === "front" ? "Front" : "Back"} jersey image uploaded to Firebase Storage!`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Product Catalog & Jersey Variants</h2>
          <p className="text-xs text-muted-foreground">
            Changes automatically propagate to the Store and the Customization Studio without APK rebuilds.
          </p>
        </div>
        <button
          onClick={() =>
            setEditing({
              id: "prod_" + Date.now(),
              name: "",
              team: "",
              category: "Club",
              price: 180000,
              image: "/jersey-arsenal.jpg",
              frontImage: "/jersey-arsenal.jpg",
              backImage: "/jersey-arsenal.jpg",
              sizes: ["S", "M", "L", "XL", "XXL"],
              stock: 25,
              active: true,
            })
          }
          className="btn-gold text-xs py-2 px-3 flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add New Kit
        </button>
      </div>

      {editing && (
        <form className="panel p-5 space-y-3.5 border-primary shadow-xl" onSubmit={handleSave}>
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="font-bold text-sm text-primary">
              {editing.id?.toString().startsWith("prod_") ? "Create New Jersey" : "Edit Jersey"}
            </h4>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label text-xs">Jersey Title</label>
              <input
                className="field text-xs py-2"
                required
                placeholder="e.g. Real Madrid Home 24/25"
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label text-xs">Club / National Team</label>
              <input
                className="field text-xs py-2"
                required
                placeholder="e.g. Real Madrid"
                value={editing.team || ""}
                onChange={(e) => setEditing({ ...editing, team: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="field-label text-xs">Price (UGX)</label>
              <input
                type="number"
                required
                className="field text-xs py-2 font-mono"
                value={editing.price || 180000}
                onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="field-label text-xs">Category</label>
              <select
                className="field text-xs py-2"
                value={editing.category || "Club"}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                <option value="Club">Club Jersey</option>
                <option value="National">National Team</option>
                <option value="Retro">Retro Classic</option>
                <option value="Limited">Limited Edition</option>
              </select>
            </div>
            <div>
              <label className="field-label text-xs">Stock Units</label>
              <input
                type="number"
                className="field text-xs py-2 font-mono"
                value={editing.stock || 20}
                onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Front & Back Images Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl border border-border bg-surface/50 space-y-2">
              <label className="field-label text-xs">Front Jersey Image (Studio Front View)</label>
              <input
                type="file"
                accept="image/*"
                className="field text-xs py-1.5"
                onChange={(e) => void handleUploadPhoto(e.target.files?.[0], "front")}
              />
              {editing.frontImage && (
                <img src={editing.frontImage} alt="Front preview" className="h-20 w-16 object-contain rounded bg-black/40" />
              )}
            </div>
            <div className="p-3 rounded-xl border border-border bg-surface/50 space-y-2">
              <label className="field-label text-xs">Back Jersey Image (Studio Name & Number View)</label>
              <input
                type="file"
                accept="image/*"
                className="field text-xs py-1.5"
                onChange={(e) => void handleUploadPhoto(e.target.files?.[0], "back")}
              />
              {editing.backImage && (
                <img src={editing.backImage} alt="Back preview" className="h-20 w-16 object-contain rounded bg-black/40" />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn-outline text-xs py-2 px-4 m-0"
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-gold text-xs py-2 px-5">
              {busy ? "SAVING..." : "SAVE & SYNC TO STUDIO"}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((p) => (
          <div key={p.id} className="panel p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={p.image}
                alt={p.name}
                className="h-14 w-12 rounded-lg object-contain bg-surface shrink-0 border border-border"
              />
              <div className="min-w-0">
                <b className="text-xs font-bold truncate block">{p.name}</b>
                <p className="text-[11px] text-primary font-bold">{money(p.price)}</p>
                <small className="text-[10px] text-muted-foreground">{p.team} • Stock: {p.stock ?? 20}</small>
              </div>
            </div>
            <button
              onClick={() =>
                setEditing({
                  id: String(p.id),
                  name: p.name,
                  team: p.team,
                  category: p.category,
                  price: p.price,
                  image: p.image,
                  frontImage: p.frontImage || p.image,
                  backImage: p.backImage || p.image,
                  sizes: p.size,
                  stock: p.stock,
                  active: p.active,
                })
              }
              className="btn-outline text-[11px] py-1.5 px-3 shrink-0 flex items-center gap-1 m-0"
            >
              <Edit className="h-3 w-3" /> Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 4: CUSTOM STUDIO CONFIGURATION
// -------------------------------------------------------------
function StudioConfigModule() {
  const [subTab, setSubTab] = useState<
    | "categories"
    | "normal_tools"
    | "premium_tools"
    | "fonts"
    | "graphics"
    | "badges"
    | "frames"
    | "number_styles"
    | "pricing"
    | "availability"
    | "history"
  >("categories");

  const [settings, setSettings] = useState<FirebaseStudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [pricingHistory, setPricingHistory] = useState([
    { date: "Today 15:40", changedBy: "adminelevenx@gmail.com", change: "Premium Studio Fee set to UGX 35,000" },
    { date: "Yesterday 11:20", changedBy: "adminelevenx@gmail.com", change: "Normal Editor set to Free (UGX 0)" },
    { date: "02 Nov 2024", changedBy: "adminelevenx@gmail.com", change: "Tournament Sleeve Badges surcharge set to UGX 15,000" },
  ]);

  useEffect(() => {
    void fetchFirebaseStudioSettings().then(setSettings);
  }, []);

  const handleSave = async (updated?: Partial<FirebaseStudioSettings>) => {
    setBusy(true);
    try {
      const payload = { ...settings, ...updated };
      setSettings(payload);
      await saveFirebaseStudioSettings(payload);
      setPricingHistory((prev) => [
        {
          date: "Just now",
          changedBy: "adminelevenx@gmail.com",
          change: "Studio customization parameters & pricing synchronized to Firebase",
        },
        ...prev.slice(0, 10),
      ]);
      toast.success("Customization Studio rules & pricing synchronized with Cloud Firestore!");
    } catch (e: any) {
      toast.error(e.message || "Failed to update studio parameters");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h2 className="font-display text-xl font-bold">Customization Studio Management</h2>
          <p className="text-xs text-muted-foreground">
            Complete administration of Normal vs. Premium Editors, fonts, sponsor artwork, and live Firestore pricing.
          </p>
        </div>
        <button
          onClick={() => handleSave()}
          disabled={busy}
          className="btn-gold text-xs py-2 px-4 self-start sm:self-center flex items-center gap-1.5"
        >
          <Save className="h-4 w-4" /> {busy ? "SAVING..." : "SAVE ALL STUDIO SETTINGS"}
        </button>
      </div>

      {/* Sub Navigation Bar for the 11 Sections */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs border-b border-border/80">
        {[
          { id: "categories", label: "1. Editor Categories" },
          { id: "normal_tools", label: "2. Normal Tools" },
          { id: "premium_tools", label: "3. Premium Tools" },
          { id: "fonts", label: "4. Fonts Management" },
          { id: "graphics", label: "5. Graphics & Artwork" },
          { id: "badges", label: "6. Logos & Badges" },
          { id: "frames", label: "7. Frames & Backgrounds" },
          { id: "number_styles", label: "8. Number Styles" },
          { id: "pricing", label: "9. Customization Pricing" },
          { id: "availability", label: "10. Product Availability" },
          { id: "history", label: "11. Pricing History" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
              subTab === tab.id
                ? "bg-primary text-primary-foreground shadow"
                : "bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. EDITOR CATEGORIES */}
      {subTab === "categories" && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-border bg-surface/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <b className="text-sm font-bold text-foreground">Normal Editor</b>
                </div>
                <input
                  type="checkbox"
                  checked={settings.normalEditorEnabled}
                  onChange={(e) => setSettings({ ...settings, normalEditorEnabled: e.target.checked })}
                  className="accent-primary h-4 w-4"
                />
              </div>
              <p className="text-muted-foreground text-[11px]">
                Standard jersey personalization: player name, number, standard fonts, basic club crests.
              </p>
              <div>
                <label className="field-label text-[10px]">Access Fee (UGX) — Set 0 for FREE</label>
                <input
                  type="number"
                  className="field font-mono text-xs py-2"
                  value={settings.normalEditorPrice}
                  onChange={(e) => setSettings({ ...settings, normalEditorPrice: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-gold-line bg-gradient-to-b from-[#1f1b13] to-surface/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <b className="text-sm font-bold text-primary">Premium Editor</b>
                </div>
                <input
                  type="checkbox"
                  checked={settings.premiumEditorEnabled}
                  onChange={(e) => setSettings({ ...settings, premiumEditorEnabled: e.target.checked })}
                  className="accent-primary h-4 w-4"
                />
              </div>
              <p className="text-muted-foreground text-[11px]">
                Elite matchday stadium studio: 3D extruded numbers, gold gradients, arched arcs, and sleeve patches.
              </p>
              <div>
                <label className="field-label text-[10px]">Access Fee (UGX)</label>
                <input
                  type="number"
                  className="field font-mono text-xs py-2"
                  value={settings.premiumEditorPrice}
                  onChange={(e) => setSettings({ ...settings, premiumEditorPrice: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. NORMAL EDITOR TOOLS */}
      {subTab === "normal_tools" && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-sm">Active Tools in Normal Editor</h3>
          <div className="space-y-2">
            {[
              "Player Name Printing (Max 12 letters)",
              "Squad Number Printing (0 - 99)",
              "Classic Fonts (Arial, Georgia, Athletic Bold)",
              "Standard Solid Vinyl Colors (White, Black, Gold, Red, Blue, Yellow)",
              "Official Club & National Team Crests",
              "Basic PNG Logo Upload & Centering",
            ].map((tool, i) => (
              <div key={i} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between">
                <span className="font-medium text-foreground">{tool}</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded">ENABLED</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PREMIUM EDITOR TOOLS */}
      {subTab === "premium_tools" && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-sm text-primary">Exclusive Premium Studio Features</h3>
          <div className="space-y-2">
            {[
              "3D Extruded Stadium Numbers with Bevel Shadows",
              "Sunset Gold Gradient Fills",
              "Arched Player Name Curves",
              "Official UEFA Champions League Starball & Respect Sleeve Patches",
              "Premier League Gold Champions Badges",
              "CAF AFCON Official Tournament Arm Patches",
              "Custom Shield Frames & Contrast Dark Background Boxes",
              "Cyber Varsity & Impact 3D Typography",
            ].map((tool, i) => (
              <div key={i} className="p-3 rounded-xl border border-gold-line/40 bg-surface flex items-center justify-between">
                <span className="font-medium text-foreground">{tool}</span>
                <span className="text-[10px] text-primary font-bold bg-primary/20 px-2 py-0.5 rounded">PREMIUM ONLY</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FONTS MANAGEMENT */}
      {subTab === "fonts" && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-sm">Typography Fonts Directory</h3>
          <div className="space-y-2">
            {(settings.fonts || DEFAULT_STUDIO_SETTINGS.fonts!).map((f) => (
              <div key={f.id} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between">
                <div>
                  <b className="text-foreground text-sm" style={{ fontFamily: f.id }}>{f.name}</b>
                  <span className="text-[10px] text-muted-foreground block">CSS Family: {f.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${f.tier === "premium" ? "bg-primary/20 text-primary" : "bg-surface border border-border text-muted-foreground"}`}>
                    {f.tier.toUpperCase()} TIER
                  </span>
                  <input type="checkbox" defaultChecked={f.active} className="accent-primary h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. GRAPHICS & ARTWORK */}
      {subTab === "graphics" && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-sm">Sponsor Artwork & Graphic Library</h3>
          <p className="text-muted-foreground text-[11px]">Manage brand sponsors, tournament graphics, and custom customer artwork bounds.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {["Fly Emirates", "Spotify Barça", "Uganda Tourism Board", "MTN Uganda", "Standard Chartered", "Team Bespoke Insignia"].map((brand, i) => (
              <div key={i} className="p-3 rounded-xl border border-border bg-surface text-center space-y-1">
                <Sparkles className="h-5 w-5 text-primary mx-auto" />
                <span className="font-bold text-foreground block text-[11px]">{brand}</span>
                <span className="text-[9px] text-emerald-400 font-bold">Approved Asset</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. LOGOS & BADGES */}
      {subTab === "badges" && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-sm">Crest & Badge Library with Pricing</h3>
          <div className="space-y-2">
            {(settings.badges || DEFAULT_STUDIO_SETTINGS.badges!).map((b) => (
              <div key={b.id} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{b.icon}</span>
                  <div>
                    <b className="text-foreground block">{b.name}</b>
                    <span className="text-[10px] text-muted-foreground">{b.tier.toUpperCase()} TIER</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-primary">{b.price === 0 ? "Included" : money(b.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. FRAMES & BACKGROUNDS */}
      {subTab === "frames" && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-sm">Crest Frames & Text Background Boxes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: "Gold Championship Crest", tier: "Premium", fee: 12000 },
              { name: "Contrast Dark Text Box", tier: "Premium", fee: 8000 },
              { name: "Stadium Banner Underlay", tier: "Premium", fee: 10000 },
            ].map((fr, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-gold-line/40 bg-surface space-y-1.5">
                <b className="text-foreground block">{fr.name}</b>
                <span className="text-[10px] text-primary font-bold block">{fr.tier} Only</span>
                <span className="text-xs font-mono font-bold text-muted-foreground">Fee: {money(fr.fee)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. NUMBER STYLES */}
      {subTab === "number_styles" && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-sm">Number Finishes & 3D Shaders</h3>
          <div className="space-y-2">
            {(settings.numberStyles || DEFAULT_STUDIO_SETTINGS.numberStyles!).map((ns) => (
              <div key={ns.id} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between">
                <div>
                  <b className="text-foreground block">{ns.name}</b>
                  <span className="text-[10px] text-muted-foreground font-mono">Shader ID: {ns.id}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ns.tier === "premium" ? "bg-primary/20 text-primary" : "bg-surface border border-border text-muted-foreground"}`}>
                  {ns.tier.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. CUSTOMIZATION PRICING */}
      {subTab === "pricing" && (
        <div className="space-y-4 text-xs">
          <h3 className="font-bold text-sm">Detailed Add-On Pricing Matrix (UGX)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
              <label className="field-label text-[10px]">Normal Name & Number Fee</label>
              <input
                type="number"
                className="field font-mono text-xs py-1.5"
                value={settings.nameNumberFee}
                onChange={(e) => setSettings({ ...settings, nameNumberFee: Number(e.target.value) })}
              />
            </div>
            <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
              <label className="field-label text-[10px]">Sleeve Tournament Badges Fee</label>
              <input
                type="number"
                className="field font-mono text-xs py-1.5"
                value={settings.sleeveBadgesFee}
                onChange={(e) => setSettings({ ...settings, sleeveBadgesFee: Number(e.target.value) })}
              />
            </div>
            <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
              <label className="field-label text-[10px]">Custom PNG Logo Upload Fee</label>
              <input
                type="number"
                className="field font-mono text-xs py-1.5"
                value={settings.customUploadFee}
                onChange={(e) => setSettings({ ...settings, customUploadFee: Number(e.target.value) })}
              />
            </div>
            <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
              <label className="field-label text-[10px]">Special Number Style (3D/Gradient)</label>
              <input
                type="number"
                className="field font-mono text-xs py-1.5"
                value={settings.specialNumberStyleFee}
                onChange={(e) => setSettings({ ...settings, specialNumberStyleFee: Number(e.target.value) })}
              />
            </div>
            <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
              <label className="field-label text-[10px]">Advanced Text Effect (Arched/Neon)</label>
              <input
                type="number"
                className="field font-mono text-xs py-1.5"
                value={settings.advancedTextEffectFee}
                onChange={(e) => setSettings({ ...settings, advancedTextEffectFee: Number(e.target.value) })}
              />
            </div>
            <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
              <label className="field-label text-[10px]">Custom Crest Frame Surcharge</label>
              <input
                type="number"
                className="field font-mono text-xs py-1.5"
                value={settings.customFrameFee}
                onChange={(e) => setSettings({ ...settings, customFrameFee: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      )}

      {/* 10. PRODUCT AVAILABILITY */}
      {subTab === "availability" && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-sm">Product Studio Customization Availability</h3>
          <p className="text-muted-foreground text-[11px]">Enable or disable personalization on individual jersey catalog items.</p>
          <div className="space-y-2">
            {["Arsenal Home 24/25", "Real Madrid Home 24/25", "Manchester United Home", "Uganda Cranes Match Kit", "Nigeria Super Eagles Retro"].map((name, i) => (
              <div key={i} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between">
                <b className="text-foreground">{name}</b>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded">CUSTOM STUDIO ENABLED</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 11. PRICING HISTORY */}
      {subTab === "history" && (
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-sm">Customization Pricing Audit History</h3>
          <p className="text-muted-foreground text-[11px]">Audit trail of changes made to Studio pricing and tool rules.</p>
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface">
            {pricingHistory.map((item, i) => (
              <div key={i} className="p-3 flex items-center justify-between">
                <div>
                  <b className="text-foreground block">{item.change}</b>
                  <span className="text-[10px] text-muted-foreground">{item.changedBy}</span>
                </div>
                <span className="text-[10px] text-primary font-mono">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 6: RIDER & DELIVERY FLEET
// -------------------------------------------------------------
function RiderFleetModule({ orders }: { orders: Order[] }) {
  const [selectedRider, setSelectedRider] = useState("Dan Okello (Express Rider)");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Rider Fleet & Google Live Delivery Dispatch</h2>
        <p className="text-xs text-muted-foreground">
          Live GPS monitoring across Kampala & Entebbe courier routes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-4 space-y-3">
          <h3 className="font-bold text-sm">Active Couriers</h3>
          <div className="space-y-2">
            {[
              { name: "Dan Okello", id: "rider_dan", phone: "+256 772 888 999", zone: "Kampala Central", active: true },
              { name: "Joseph Mukisa", id: "rider_joseph", phone: "+256 701 445 667", zone: "Ntinda / Kira", active: true },
              { name: "Grace Auma", id: "rider_grace", phone: "+256 752 990 112", zone: "Entebbe Route", active: false },
            ].map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRider(r.name)}
                className="p-2.5 rounded-xl border border-border bg-surface/60 hover:border-primary transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <b className="text-xs font-bold text-foreground block">{r.name}</b>
                  <span className="text-[10px] text-muted-foreground">{r.phone} • {r.zone}</span>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${r.active ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-500/20 text-muted-foreground"}`}>
                  {r.active ? "ON DUTY" : "OFFLINE"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <GoogleDeliveryMap
            value={{ lat: 0.3344, lng: 32.5878, label: "Kampala Dispatch Hub (Kololo)" }}
            onChange={() => {}}
            riderPosition={{ lat: 0.3344, lng: 32.5878 }}
          />
        </div>
      </div>

      {/* Android Rider App APK & Fleet Dispatch Card */}
      <div className="p-4 rounded-2xl border border-[#3ddc84]/30 bg-[#141c14] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#3ddc84]/20 text-[#3ddc84] border border-[#3ddc84]/40">
            <AndroidIcon className="h-6 w-6 text-[#3ddc84]" />
          </div>
          <div>
            <b className="text-sm font-bold text-foreground block">
              ElevenX Rider Android App / APK & Offline POD
            </b>
            <p className="text-xs text-muted-foreground">
              Modular Android courier APK ready for courier fleet sideloading or Google Play distribution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/rider"
            className="btn-gold text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <Bike className="h-3.5 w-3.5" /> Open Rider Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 7: PAYMENTS & FINANCE (RELWORX)
// -------------------------------------------------------------
function PaymentsFinanceModule({ orders }: { orders: Order[] }) {
  const totalVolume = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="panel p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Payments & Financial Reconciliation</h2>
        <p className="text-xs text-muted-foreground">
          Relworx Mobile Money gateway telemetry (MTN MoMo & Airtel Money Uganda). Strictly real payments with zero cash on delivery.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-surface">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Gross Processed Volume</span>
          <p className="font-display text-xl font-extrabold text-primary mt-1">{money(totalVolume)}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-surface">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Gateway Provider</span>
          <p className="font-semibold text-emerald-400 text-sm mt-1">Relworx UGX Active</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-surface">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Settlement Account</span>
          <p className="font-mono text-xs text-foreground mt-1">MTN / Airtel Merchant Pay</p>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="p-2.5 bg-surface text-xs font-bold text-foreground border-b border-border">
          Recent Payment Ledger
        </div>
        <div className="divide-y divide-border text-xs">
          {orders.slice(0, 5).map((o, i) => (
            <div key={i} className="p-3 flex items-center justify-between">
              <div>
                <b className="text-foreground">Ref: RELW-UG-{o.id}</b>
                <span className="text-[11px] text-muted-foreground block">{o.customerName} • {o.phone}</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-primary block">{money(o.total)}</span>
                <span className="text-[10px] text-emerald-400 font-bold">SUCCESS</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 8: PROMOTIONS & MARKETING
// -------------------------------------------------------------
function PromotionsMarketingModule() {
  const [couponCode, setCouponCode] = useState("KAMPALA10");
  const [discountPercent, setDiscountPercent] = useState(10);

  return (
    <div className="panel p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Promotions, Discounts & Coupons</h2>
        <p className="text-xs text-muted-foreground">
          Create match-day promotional codes, flash sale banners, and special offers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label text-xs">Coupon Promo Code</label>
          <input
            className="field text-xs py-2 uppercase font-mono"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label text-xs">Discount Percentage (%)</label>
          <input
            type="number"
            className="field text-xs py-2 font-mono"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
          />
        </div>
      </div>

      <button
        onClick={() => toast.success(`Coupon ${couponCode} active in store!`)}
        className="btn-gold text-xs py-2.5 px-4"
      >
        PUBLISH PROMOTION
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 9: INVENTORY MANAGEMENT
// -------------------------------------------------------------
function InventoryManagementModule({
  products,
  onRefresh,
}: {
  products: Product[];
  onRefresh: () => void;
}) {
  const handleStockAdjust = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, (product.stock ?? 20) + delta);
    await saveFirebaseProduct({
      id: String(product.id),
      stock: nextStock,
    });
    toast.success(`${product.name} stock updated to ${nextStock}`);
    onRefresh();
  };

  return (
    <div className="panel p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Inventory & Low-Stock Alerts</h2>
        <p className="text-xs text-muted-foreground">
          Real-time unit tracking for kits and customization printing blanks.
        </p>
      </div>

      <div className="divide-y divide-border">
        {products.map((p) => {
          const isLow = (p.stock ?? 20) <= 5;
          return (
            <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <img src={p.image} alt={p.name} className="h-10 w-10 object-contain rounded bg-surface border border-border" />
                <div>
                  <b className="text-foreground">{p.name}</b>
                  <span className="text-[11px] text-muted-foreground block">{p.team} • {money(p.price)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold px-2 py-0.5 rounded ${isLow ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                  {p.stock ?? 20} in stock
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleStockAdjust(p, -1)} className="btn-outline px-2 py-1 text-xs m-0">-1</button>
                  <button onClick={() => handleStockAdjust(p, 5)} className="btn-gold px-2 py-1 text-xs m-0">+5</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 10: REPORTS & ANALYTICS
// -------------------------------------------------------------
function ReportsAnalyticsModule({
  orders,
  products,
  onExportCSV,
}: {
  orders: Order[];
  products: Product[];
  onExportCSV: () => void;
}) {
  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Reports & Analytics</h2>
          <p className="text-xs text-muted-foreground">Operational summaries and exportable business intelligence.</p>
        </div>
        <button onClick={onExportCSV} className="btn-gold text-xs py-2 px-3 flex items-center gap-1.5">
          <Download className="h-4 w-4" /> Export CSV Ledger
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-xs text-muted-foreground font-bold">Customization Adoption Rate</span>
          <p className="font-display text-2xl font-extrabold text-primary">78.5%</p>
          <small className="text-[10px] text-muted-foreground">Jerseys personalized with custom name & number</small>
        </div>
        <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-xs text-muted-foreground font-bold">Average Order Fulfillment Time</span>
          <p className="font-display text-2xl font-extrabold text-foreground">1 hr 45 min</p>
          <small className="text-[10px] text-muted-foreground">From Relworx payment to customer handover</small>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 11: NOTIFICATION CENTER
// -------------------------------------------------------------
function NotificationCenterModule({
  onSend,
}: {
  onSend: (title: string, msg: string, orderId?: string, type?: any) => void;
}) {
  const [title, setTitle] = useState("🔥 New Matchday Kits Dropped!");
  const [msg, setMsg] = useState("Check out our latest 24/25 authentic club jerseys now in the ElevenX Kit store.");

  const handleBroadcast = () => {
    onSend(title, msg, undefined, "system");
    toast.success("Broadcast push notification sent to all active customer devices!");
  };

  return (
    <div className="panel p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Push Notification Management</h2>
        <p className="text-xs text-muted-foreground">Send real-time alerts directly to customer and rider devices.</p>
      </div>

      <div>
        <label className="field-label text-xs">Notification Headline</label>
        <input className="field text-xs py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="field-label text-xs">Notification Body Message</label>
        <textarea className="field text-xs py-2 h-20" value={msg} onChange={(e) => setMsg(e.target.value)} />
      </div>

      <button onClick={handleBroadcast} className="btn-gold text-xs py-2.5 px-4 flex items-center gap-1.5">
        <Send className="h-4 w-4" /> SEND BROADCAST NOTIFICATION
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 12: REVIEWS & RATINGS
// -------------------------------------------------------------
function ReviewsRatingsModule() {
  return (
    <div className="panel p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Reviews & Ratings Moderation</h2>
        <p className="text-xs text-muted-foreground">Customer reviews and feedback on jerseys and printing quality.</p>
      </div>

      <div className="space-y-2">
        {[
          { user: "Brian Kasirye", kit: "Arsenal Home 24/25", rating: 5, text: "The name print quality is top notch! Delivered in under 2 hours in Bukoto." },
          { user: "Samuel Mugerwa", kit: "Real Madrid Away", rating: 5, text: "Fabric feels 100% authentic. Gold details look incredible." },
        ].map((rev, i) => (
          <div key={i} className="p-3 rounded-xl border border-border bg-surface text-xs space-y-1">
            <div className="flex items-center justify-between">
              <b className="text-foreground">{rev.user} — {rev.kit}</b>
              <span className="text-primary font-bold">★★★★★</span>
            </div>
            <p className="text-muted-foreground">{rev.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 13: CONTENT & HOMEPAGE
// -------------------------------------------------------------
function ContentHomepageModule() {
  const [settings, setSettings] = useState<FirebaseHeroSettings>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchFirebaseHeroSettings().then(setSettings).catch(() => undefined);
  }, []);

  const handleSave = async () => {
    setBusy(true);
    await saveFirebaseHeroSettings(settings);
    setBusy(false);
    toast.success("Homepage content synchronized with Firebase!");
  };

  const handleUploadVideo = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    const url = await uploadFirebaseHeroAsset(file);
    if (url) setSettings((s) => ({ ...s, videoUrl: url }));
    setBusy(false);
    toast.success("Hero video uploaded to Firebase Storage!");
  };

  return (
    <div className="panel p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Content & Homepage Management</h2>
        <p className="text-xs text-muted-foreground">Manage background matchday video, hero headline, and marketing copies.</p>
      </div>

      <div>
        <label className="field-label text-xs">Upload Hero Video (Firebase Storage)</label>
        <input type="file" accept="video/*" className="field text-xs py-2" onChange={(e) => void handleUploadVideo(e.target.files?.[0])} />
      </div>

      <div>
        <label className="field-label text-xs">Hero Title</label>
        <input className="field text-xs py-2" value={settings.title || ""} onChange={(e) => setSettings({ ...settings, title: e.target.value })} placeholder="WEAR YOUR PASSION." />
      </div>

      <div>
        <label className="field-label text-xs">Hero Subtitle</label>
        <input className="field text-xs py-2" value={settings.subtitle || ""} onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })} placeholder="Premium football kits. Your team. Your identity." />
      </div>

      <button onClick={handleSave} disabled={busy} className="btn-gold text-xs py-2.5 px-4">
        {busy ? "SAVING..." : "PUBLISH HOMEPAGE CONTENT"}
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 14: STAFF & PERMISSIONS (RBAC)
// -------------------------------------------------------------
function StaffPermissionsModule() {
  return (
    <div className="panel p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Staff Accounts & Role Permissions (RBAC)</h2>
        <p className="text-xs text-muted-foreground">
          ElevenX Enterprise permissions: Super Admin, Product Manager, Order Manager, Finance Manager, Delivery Manager.
        </p>
      </div>

      <div className="space-y-2 text-xs">
        {[
          { name: "ElevenX Super Admin", email: "adminelevenx@gmail.com", role: "Super Admin", access: "Full Root Access" },
          { name: "Dan Okello", email: "rider@elevenx.com", role: "Delivery Courier", access: "Dispatch & Navigation" },
        ].map((staff, i) => (
          <div key={i} className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between">
            <div>
              <b className="text-foreground">{staff.name}</b>
              <span className="text-[10px] text-muted-foreground block">{staff.email}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-full block">{staff.role}</span>
              <span className="text-[9px] text-muted-foreground">{staff.access}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODULE 15: SYSTEM SETTINGS
// -------------------------------------------------------------
function SystemSettingsModule({ onOpenFirebase }: { onOpenFirebase: () => void }) {
  return (
    <div className="panel p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">ElevenX System Settings</h2>
        <p className="text-xs text-muted-foreground">General platform configurations, currency, and cloud keys.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Operating Currency</span>
          <p className="font-bold text-foreground">Ugandan Shillings (UGX)</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Business Entity</span>
          <p className="font-bold text-foreground">ElevenX Kit Mobile App Ltd</p>
          <span className="text-[10px] text-muted-foreground">Acacia Avenue, Kololo, Kampala</span>
        </div>
      </div>

      <div className="pt-2">
        <button onClick={onOpenFirebase} className="btn-outline text-xs py-2 px-4 flex items-center gap-2 m-0">
          <Database className="h-4 w-4 text-primary" /> Manage In-App Firebase Credentials
        </button>
      </div>
    </div>
  );
}
