import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  createFirebaseOrder,
  fetchFirebaseDesigns,
  fetchFirebaseOrders,
  fetchFirebaseProducts,
  saveFirebaseCart,
  saveFirebaseDesign,
  type FirebaseProduct,
} from "@/lib/firebase";

export type Product = {
  id: number;
  name: string;
  team: string;
  category: string;
  price: number;
  size: string[];
  stock: number;
  image: string;
  frontImage?: string;
  backImage?: string;
  active?: boolean;
  description?: string;
};

export type Design = {
  mode: string;
  jersey: string;
  name: string;
  number: string;
  tag: string;
  textColor: string;
  bodyColor: string;
  sleeveColor: string;
  collarColor: string;
  pattern: string;
  font: string;
  fontSize: number;
  artwork: string;
  artworkImage: string;
  artworkX: number;
  artworkY: number;
  artworkScale: number;
  side: string;
  formatVersion?: "customization.v1";
  productId?: number;
  productImage?: string;
  frontImage?: string;
  backImage?: string;
  id?: number | string;
  editorCategory?: "normal" | "premium";
  accessFee?: number;
  customizationFee?: number;
  totalCustomizationCost?: number;
  numberStyle?: string;
  textEffect?: string;
  frame?: string;
  textBackground?: string;
  sleevePatches?: string[];
  badgePreset?: string;
};

export type CartItem = {
  product: Product;
  qty: number;
  size: string;
  image: string;
  customization?: Design;
};

export type OrderItem = {
  productId: number;
  name: string;
  size: string;
  qty: number;
  price: number;
  image: string;
  customization?: Design;
};

export type Order = {
  id: string;
  date: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  status: string;
  deliveryStatus: string;
  customerName: string;
  phone: string;
  address: string;
  zone: string;
  riderId: string | null;
  userId: string;
  items: OrderItem[];
};

export type Zone = {
  id: number;
  name: string;
  fee: number;
  eta: string;
  active: boolean;
};

export type CheckoutDetails = {
  name: string;
  phone: string;
  address: string;
  zone: string;
  destination?: { lat: number; lon: number; label: string };
  distanceKm?: number;
  deliveryFee?: number;
  paymentMethod?: string;
};

export const defaultDesign = (): Design => ({
  mode: "Basic",
  jersey: "Arsenal",
  name: "",
  number: "10",
  tag: "",
  textColor: "#ffffff",
  bodyColor: "#b8202e",
  sleeveColor: "#b8202e",
  collarColor: "#ffffff",
  pattern: "Plain",
  font: "Arial",
  fontSize: 64,
  artwork: "",
  artworkImage: "",
  artworkX: 50,
  artworkY: 42,
  artworkScale: 1,
  side: "Back",
  editorCategory: "normal",
  accessFee: 0,
  customizationFee: 0,
  totalCustomizationCost: 0,
  numberStyle: "standard",
  textEffect: "none",
  frame: "none",
  textBackground: "none",
  sleevePatches: [],
});

type Local = {
  cart: CartItem[];
  favourites: number[];
  viewed: number[];
  savedDesigns: Design[];
  studio: Design;
};

const initial = (): Local => ({
  cart: [],
  favourites: [],
  viewed: [],
  savedDesigns: [],
  studio: defaultDesign(),
});

const KEY = "elevenx_store_state_v2";

export const money = (n: number) => "UGX " + Number(n || 0).toLocaleString("en-UG");

export function cartTotals(cart: CartItem[]) {
  return {
    count: cart.reduce((s, x) => s + x.qty, 0),
    total: cart.reduce((s, x) => {
      const customCost = x.customization?.totalCustomizationCost || 0;
      return s + (x.product.price + customCost) * x.qty;
    }, 0),
  };
}

export const fallbackZones: Zone[] = [
  { id: 1, name: "Kampala Central & CBD", fee: 10000, eta: "1 - 2 hours", active: true },
  { id: 2, name: "Kololo, Nakasero & Kamwokya", fee: 10000, eta: "1 - 2 hours", active: true },
  { id: 3, name: "Ntinda, Bukoto, Naguru, Kiwatule", fee: 12000, eta: "2 - 3 hours", active: true },
  { id: 4, name: "Bugolobi, Muyenga, Kansanga, Ggaba", fee: 12000, eta: "2 - 3 hours", active: true },
  { id: 5, name: "Entebbe Road & Entebbe Town", fee: 20000, eta: "Same day", active: true },
  { id: 6, name: "Wakiso, Kira, Nansana", fee: 15000, eta: "Same day", active: true },
  { id: 7, name: "Mukono Town & Seeta", fee: 18000, eta: "Same day", active: true },
  { id: 8, name: "Upcountry (Jinja, Mbarara, Gulu)", fee: 25000, eta: "Next day courier", active: true },
];

export const ORDER_SELECT = "*";

type Ctx = Local & {
  update: (fn: (s: Local) => Partial<Local>) => void;
  products: Product[];
  allProducts: Product[];
  productsLoading: boolean;
  reloadProducts: () => Promise<void>;
  zones: Zone[];
  orders: Order[];
  reloadOrders: () => Promise<void>;
  cartCount: number;
  total: number;
  addToCart: (p: Product, size?: string, customization?: Design) => void;
  changeQty: (i: number, d: number) => void;
  toggleFav: (id: number) => void;
  markViewed: (id: number) => void;
  checkout: (d: CheckoutDetails) => Promise<string | null>;
  syncStudioToCloud: (designOverride?: Design) => Promise<string | null>;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<Local>(initial);
  const [loaded, setLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [zones] = useState<Zone[]>(fallbackZones);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    try {
      const x = JSON.parse(localStorage.getItem(KEY) || "{}");
      setState((s) => ({
        cart: Array.isArray(x.cart) ? x.cart.filter((c: CartItem) => c?.product?.id) : s.cart,
        favourites: x.favourites ?? [],
        viewed: x.viewed ?? [],
        savedDesigns: x.savedDesigns ?? [],
        studio: x.studio ?? s.studio,
      }));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, loaded]);

  const reloadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const fbProducts = await fetchFirebaseProducts();
      const mapped: Product[] = fbProducts.map((p, idx) => ({
        id: Number(p.id) || 100 + idx,
        name: p.name,
        team: p.team || "Football Team",
        category: p.category || "Jerseys",
        price: p.price,
        size: p.sizes || ["S", "M", "L", "XL"],
        stock: p.stock ?? 20,
        image: p.image,
        frontImage: p.frontImage || p.image,
        backImage: p.backImage || p.image,
        active: p.active !== false,
        description: p.description,
      }));
      setProducts(mapped);
    } catch (err) {
      console.warn("Product fetch notice:", err);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadProducts();
  }, [reloadProducts]);

  // Sync saved designs from Firebase when user is active
  useEffect(() => {
    if (!loaded) return;
    const uid = user?.id || localStorage.getItem("elevenx_guest_id") || "guest";
    void fetchFirebaseDesigns(uid)
      .then((designs) => {
        if (designs.length) {
          setState((s) => ({
            ...s,
            savedDesigns: designs as Design[],
          }));
        }
      })
      .catch(() => undefined);
  }, [loaded, user]);

  // Sync studio customization to Firestore savedDesigns
  const syncStudioToCloud = useCallback(async (designOverride?: Design): Promise<string | null> => {
    const currentDesign = designOverride || state.studio;
    const userId = user?.id || (localStorage.getItem("elevenx_guest_id") ?? (() => {
      const gid = "guest_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("elevenx_guest_id", gid);
      return gid;
    })());

    const designId = String(currentDesign.id || "DSG-" + Date.now());
    const payload = {
      ...currentDesign,
      id: designId,
      formatVersion: "customization.v1" as const,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveFirebaseDesign(userId, payload);
      setState((prev) => {
        const existingIdx = prev.savedDesigns.findIndex((d) => String(d.id) === designId);
        const nextSaved = [...prev.savedDesigns];
        if (existingIdx >= 0) {
          nextSaved[existingIdx] = payload;
        } else {
          nextSaved.unshift(payload);
        }
        return {
          ...prev,
          studio: { ...prev.studio, id: designId },
          savedDesigns: nextSaved,
        };
      });
      return designId;
    } catch (err) {
      console.warn("Could not sync design to Firestore savedDesigns:", err);
      return null;
    }
  }, [state.studio, user]);

  // Auto-sync whenever user transitions between Normal and Premium Editor
  const prevEditorCategoryRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!loaded) return;
    const currentCat = state.studio?.editorCategory || "normal";
    if (prevEditorCategoryRef.current && prevEditorCategoryRef.current !== currentCat) {
      // Transition occurred between Normal and Premium Editor
      void syncStudioToCloud({
        ...state.studio,
        editorCategory: currentCat,
      }).then(() => {
        toast.info(
          `Switched to ${currentCat === "premium" ? "Premium" : "Normal"} Editor — customizations synced to cloud!`
        );
      });
    }
    prevEditorCategoryRef.current = currentCat;
  }, [state.studio?.editorCategory, loaded, syncStudioToCloud]);

  // Sync cart to Firebase
  useEffect(() => {
    if (loaded && user) {
      void saveFirebaseCart(user.id, state.cart).catch(() => undefined);
    }
  }, [loaded, user, state.cart]);

  const reloadOrders = useCallback(async () => {
    try {
      const list = await fetchFirebaseOrders(user?.id);
      const mapped: Order[] = list.map((item: any) => ({
        id: String(item.id || "ORD-" + Math.floor(Math.random() * 100000)),
        date: item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date().toLocaleDateString()),
        total: Number(item.total || item.subtotal || 0),
        subtotal: Number(item.subtotal || item.total || 0),
        deliveryFee: Number(item.deliveryFee || 0),
        status: String(item.status || "Confirmed"),
        deliveryStatus: String(item.deliveryStatus || "Pending"),
        customerName: String(item.customerName || item.customer?.name || "Customer"),
        phone: String(item.phone || item.customer?.phone || ""),
        address: String(item.address || item.customer?.address || ""),
        zone: String(item.zone || item.customer?.zone || "Kampala"),
        riderId: item.riderId || null,
        userId: String(item.userId || user?.id || ""),
        items: (item.items || []).map((i: any) => ({
          productId: Number(i.productId || i.product?.id || 101),
          name: String(i.name || i.product?.name || "Jersey"),
          size: String(i.size || "M"),
          qty: Number(i.qty || 1),
          price: Number(i.price || i.product?.price || 180000),
          image: String(i.image || i.product?.image || "/jersey-arsenal.jpg"),
          customization: i.customization,
        })),
      }));
      setOrders(mapped);
    } catch (e) {
      console.warn("Orders fetch notice:", e);
    }
  }, [user]);

  useEffect(() => {
    void reloadOrders();
  }, [reloadOrders]);

  const update = useCallback((fn: (s: Local) => Partial<Local>) => {
    setState((s) => ({ ...s, ...fn(s) }));
  }, []);

  const { count, total } = cartTotals(state.cart);

  const addToCart = (p: Product, size = "M", customization?: Design) => {
    update((s) => {
      const i = s.cart.findIndex((x) => x.product.id === p.id && x.size === size);
      const cart = [...s.cart];
      const row = cart[i];
      if (row) {
        cart[i] = { ...row, qty: row.qty + 1, customization: customization ?? row.customization };
      } else {
        cart.push({ product: p, qty: 1, size, image: p.image, customization });
      }
      return { cart };
    });
    toast.success(`${p.name} (${size}) added to cart!`);
  };

  const changeQty = (i: number, d: number) =>
    update((s) => {
      const cart = [...s.cart];
      const row = cart[i];
      if (row) cart[i] = { ...row, qty: row.qty + d };
      return { cart: cart.filter((x) => x.qty > 0) };
    });

  const toggleFav = (id: number) =>
    update((s) => ({
      favourites: s.favourites.includes(id) ? s.favourites.filter((x) => x !== id) : [...s.favourites, id],
    }));

  const markViewed = (id: number) =>
    update((s) => ({
      viewed: [id, ...s.viewed.filter((x) => x !== id)].slice(0, 5),
    }));

  const checkout = async (d: CheckoutDetails) => {
    if (!state.cart.length) {
      toast.error("Your cart is empty");
      return null;
    }
    const currentUserId = user?.id || "guest_" + Date.now();
    const zoneItem = zones.find((z) => z.name === d.zone);
    const deliveryFee = d.deliveryFee ?? (zoneItem ? zoneItem.fee : 10000);
    const finalTotal = total + deliveryFee;

    const orderPayload = {
      customerName: d.name,
      phone: d.phone,
      address: d.destination ? `${d.address} (${d.destination.label})` : d.address,
      zone: d.zone,
      subtotal: total,
      deliveryFee,
      total: finalTotal,
      status: "Confirmed",
      deliveryStatus: "Pending",
      paymentMethod: d.paymentMethod || "Mobile Money / Card",
      items: state.cart.map((c) => ({
        productId: c.product.id,
        name: c.product.name,
        size: c.size,
        qty: c.qty,
        price: c.product.price,
        image: c.image,
        customization: c.customization,
      })),
      date: new Date().toLocaleDateString(),
    };

    const orderId = await createFirebaseOrder(currentUserId, orderPayload);
    update(() => ({ cart: [] }));
    toast.success(`Order #${orderId} successfully placed! Stored in Firebase.`);
    void reloadOrders();
    return orderId;
  };

  return (
    <StoreCtx.Provider
      value={{
        ...state,
        update,
        products: products.filter((p) => p.active !== false),
        allProducts: products,
        productsLoading,
        reloadProducts,
        zones,
        orders,
        reloadOrders,
        cartCount: count,
        total,
        addToCart,
        changeQty,
        toggleFav,
        markViewed,
        checkout,
        syncStudioToCloud,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}
