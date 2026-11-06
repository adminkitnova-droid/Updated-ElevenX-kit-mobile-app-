import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot
} from "firebase/firestore";
import {
  getStorage,
  type FirebaseStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import firebaseConfig from "@/../firebase-applet-config.json";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = getFirebaseAuth();
  const currentUser = currentAuth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn("Firestore Notice:", JSON.stringify(errInfo));
}

export interface FirebaseConfigKeys {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

const STORAGE_KEY = "elevenx_firebase_config_override";

export function getActiveFirebaseConfig(): FirebaseConfigKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.apiKey && parsed.projectId) {
        return parsed as FirebaseConfigKeys;
      }
    }
  } catch {}

  const env = import.meta.env;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || "",
    projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || "",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || "",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || "",
    appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId || "",
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || "(default)",
  };
}

export function saveStoredFirebaseConfig(keys: Partial<FirebaseConfigKeys>) {
  const current = getActiveFirebaseConfig();
  const merged: FirebaseConfigKeys = {
    apiKey: keys.apiKey?.trim() || current.apiKey,
    authDomain: keys.authDomain?.trim() || current.authDomain,
    projectId: keys.projectId?.trim() || current.projectId,
    storageBucket: keys.storageBucket?.trim() || current.storageBucket,
    messagingSenderId: keys.messagingSenderId?.trim() || current.messagingSenderId,
    appId: keys.appId?.trim() || current.appId,
    firestoreDatabaseId: keys.firestoreDatabaseId?.trim() || current.firestoreDatabaseId || "(default)",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  window.location.reload();
}

export function clearStoredFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

export function isFirebaseConfigured(): boolean {
  const config = getActiveFirebaseConfig();
  return Boolean(config.apiKey && config.projectId && !config.apiKey.includes("MY_"));
}

export function getFirebaseApp(): FirebaseApp | null {
  if (appInstance) return appInstance;
  const config = getActiveFirebaseConfig();
  if (!config.apiKey || !config.projectId || config.apiKey.includes("MY_")) {
    return null;
  }
  try {
    const existing = getApps();
    if (existing.length) {
      appInstance = existing[0];
    } else {
      appInstance = initializeApp(config);
    }
    return appInstance;
  } catch (err) {
    console.error("Firebase init failed:", err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    authInstance = getAuth(app);
    return authInstance;
  } catch (e) {
    console.error("getFirebaseAuth error:", e);
    return null;
  }
}

export function getFirebaseDb(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    const config = getActiveFirebaseConfig();
    firestoreInstance = config.firestoreDatabaseId
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
    return firestoreInstance;
  } catch (e) {
    console.error("getFirebaseDb error:", e);
    return null;
  }
}

export function getFirebaseStorage(): FirebaseStorage | null {
  if (storageInstance) return storageInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    storageInstance = getStorage(app);
    return storageInstance;
  } catch (e) {
    console.error("getFirebaseStorage error:", e);
    return null;
  }
}

// Bootstrap connections immediately
export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export const db = getFirebaseDb();
export const storage = getFirebaseStorage();

export async function testFirebaseConnection(): Promise<{ ok: boolean; message: string; details?: any }> {
  const isConfigured = isFirebaseConfigured();
  if (!isConfigured) {
    return {
      ok: false,
      message: "Firebase configuration is not active.",
    };
  }
  const firestore = getFirebaseDb();
  if (!firestore) {
    return { ok: false, message: "Could not initialize Firestore client instance." };
  }
  try {
    await getDocFromServer(doc(firestore, "test", "connection"));
    return { ok: true, message: `Connected to Firestore (${firebaseConfig.projectId}) successfully!` };
  } catch (error: any) {
    if (error?.message?.includes("the client is offline")) {
      return { ok: false, message: "Client is offline or network is unreachable." };
    }
    if (error?.code === "permission-denied" || error?.message?.includes("permission")) {
      return { ok: true, message: "Connected to Firebase Firestore project (Security rules active)." };
    }
    return { ok: false, message: error?.message || "Error connecting to Firebase." };
  }
}

// ----------------------------------------------------
// Local fallback persistence for zero-downtime demo mode
// ----------------------------------------------------
const LOCAL_STORAGE_PRODUCTS = "elevenx_fallback_products";
const LOCAL_STORAGE_ORDERS = "elevenx_fallback_orders";
const LOCAL_STORAGE_DESIGNS = "elevenx_fallback_designs";
const LOCAL_STORAGE_HERO = "elevenx_fallback_hero";

export type FirebaseProduct = {
  id: string;
  name: string;
  team?: string;
  price: number;
  image: string;
  frontImage?: string;
  backImage?: string;
  category?: string;
  description?: string;
  sizes?: string[];
  stock?: number;
  active?: boolean;
};

export type FirebaseHeroSettings = {
  videoUrl?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export type FirebaseDesignRecord = Record<string, unknown> & {
  id?: number | string;
  productId?: number | string;
  productImage?: string;
  formatVersion?: "customization.v1";
  name?: string;
  number?: string;
  tag?: string;
  textColor?: string;
  bodyColor?: string;
  sleeveColor?: string;
  collarColor?: string;
  font?: string;
  fontSize?: number;
  artwork?: string;
  artworkImage?: string;
  artworkX?: number;
  artworkY?: number;
  artworkScale?: number;
  side?: string;
  jersey?: string;
};

// Default high-energy sports jersey background video
const DEFAULT_HERO_VIDEO = "/loading-bg.mp4";

export async function fetchFirebaseHeroSettings(): Promise<FirebaseHeroSettings> {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      const snap = await getDocs(collection(firestore, "siteSettings"));
      const docItem = snap.docs.find((d) => d.id === "hero");
      if (docItem?.exists()) {
        const data = docItem.data() as FirebaseHeroSettings;
        return {
          ...data,
          videoUrl: data.videoUrl || DEFAULT_HERO_VIDEO,
        };
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "siteSettings/hero");
    }
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HERO);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        videoUrl: parsed.videoUrl || DEFAULT_HERO_VIDEO,
      };
    }
  } catch {}
  return {
    videoUrl: DEFAULT_HERO_VIDEO,
    title: "WEAR YOUR PASSION.",
    subtitle: "Premium authentic football kits & bespoke personalization. Designed for the pitch and the street.",
    ctaLabel: "EXPLORE KITS →",
    ctaUrl: "/search",
  };
}

export async function saveFirebaseHeroSettings(settings: FirebaseHeroSettings): Promise<string> {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      await setDoc(doc(firestore, "siteSettings", "hero"), { ...settings, updatedAt: Timestamp.now() }, { merge: true });
      return "hero";
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "siteSettings/hero");
    }
  }
  localStorage.setItem(LOCAL_STORAGE_HERO, JSON.stringify(settings));
  return "hero";
}

export async function uploadFirebaseHeroAsset(file: File): Promise<string> {
  const stor = getFirebaseStorage();
  if (stor) {
    try {
      const ref = storageRef(stor, `site/hero/${crypto.randomUUID()}-${file.name}`);
      const snap = await uploadBytes(ref, file, { contentType: file.type });
      return await getDownloadURL(snap.ref);
    } catch (err) {
      console.warn("Storage upload failed, falling back to data URL:", err);
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadFirebaseProductImage(file: File): Promise<string> {
  const stor = getFirebaseStorage();
  if (stor) {
    try {
      const ref = storageRef(stor, `products/${crypto.randomUUID()}-${file.name}`);
      const snap = await uploadBytes(ref, file, { contentType: file.type });
      return await getDownloadURL(snap.ref);
    } catch (err) {
      console.warn("Product image upload failed, falling back to data URL:", err);
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadFirebaseUserAvatar(userId: string, file: File): Promise<string> {
  const stor = getFirebaseStorage();
  if (stor) {
    try {
      const ref = storageRef(stor, `users/${userId}/avatar/${crypto.randomUUID()}-${file.name}`);
      const snap = await uploadBytes(ref, file, { contentType: file.type });
      return await getDownloadURL(snap.ref);
    } catch (err) {
      console.warn("Avatar storage upload notice, falling back to data URL:", err);
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function updateUserFirestoreProfile(userId: string, data: Record<string, any>): Promise<void> {
  const firestore = getFirebaseDb();
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (firestore) {
    try {
      await setDoc(doc(firestore, "users", userId), payload, { merge: true });
      return;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
    }
  }

  try {
    const key = `elevenx_profile_${userId}`;
    const raw = localStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : {};
    localStorage.setItem(key, JSON.stringify({ ...existing, ...payload }));
  } catch {}
}

export async function fetchUserFirestoreProfile(userId: string): Promise<Record<string, any> | null> {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      const snap = await getDoc(doc(firestore, "users", userId));
      if (snap.exists()) {
        return snap.data();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${userId}`);
    }
  }

  try {
    const key = `elevenx_profile_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function fetchFirebaseProducts(): Promise<FirebaseProduct[]> {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      const snap = await getDocs(collection(firestore, "products"));
      if (!snap.empty) {
        return snap.docs.map((docSnap) => {
          const val = docSnap.data();
          const image = String(val.imageUrl ?? val.image ?? val.photoURL ?? "");
          return {
            id: String(val.id ?? docSnap.id),
            name: String(val.name ?? "Football Jersey"),
            team: val.team ? String(val.team) : undefined,
            price: Number(val.price ?? 180000),
            image,
            frontImage: val.frontImage ? String(val.frontImage) : image,
            backImage: val.backImage ? String(val.backImage) : image,
            category: val.category ? String(val.category) : "Jerseys",
            description: val.description ? String(val.description) : undefined,
            sizes: Array.isArray(val.sizes) ? val.sizes : ["S", "M", "L", "XL"],
            stock: Number(val.stock ?? 25),
            active: val.active !== false,
          };
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "products");
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PRODUCTS);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}

  return [
    {
      id: "101",
      name: "Arsenal Home Jersey 24/25",
      team: "Arsenal",
      category: "Club",
      price: 180000,
      image: "/jersey-arsenal.jpg",
      frontImage: "/jersey-arsenal.jpg",
      backImage: "/jersey-arsenal.jpg",
      sizes: ["S", "M", "L", "XL", "XXL"],
      stock: 24,
      active: true,
      description: "Official Arsenal 2024/2025 home kit featuring classic red and white silhouette, moisture-wicking fabric and premium embroidered crest.",
    },
    {
      id: "102",
      name: "Manchester United Home Kit",
      team: "Manchester United",
      category: "Club",
      price: 180000,
      image: "/jersey-manutd.jpg",
      frontImage: "/jersey-manutd.jpg",
      backImage: "/jersey-manutd.jpg",
      sizes: ["S", "M", "L", "XL"],
      stock: 18,
      active: true,
      description: "Manchester United iconic crimson red home jersey with subtle side gradient lines and breathable stadium mesh.",
    },
    {
      id: "103",
      name: "Nigeria Super Eagles Kit",
      team: "Nigeria",
      category: "National",
      price: 195000,
      image: "/jersey-nigeria.jpg",
      frontImage: "/jersey-nigeria.jpg",
      backImage: "/jersey-nigeria.jpg",
      sizes: ["S", "M", "L", "XL"],
      stock: 15,
      active: true,
      description: "World famous Nigerian Naija geometric patterns inspired by traditional agbada robes and modern Afrobeat culture.",
    },
    {
      id: "104",
      name: "Real Madrid Home Kit",
      team: "Real Madrid",
      category: "Club",
      price: 180000,
      image: "/jersey-realmadrid.jpg",
      frontImage: "/jersey-realmadrid.jpg",
      backImage: "/jersey-realmadrid.jpg",
      sizes: ["S", "M", "L", "XL", "XXL"],
      stock: 30,
      active: true,
      description: "Pure all-white Real Madrid home kit with gold accents and houndstooth pattern woven through the fabric.",
    },
    {
      id: "105",
      name: "Uganda Cranes Match Kit",
      team: "Uganda Cranes",
      category: "National",
      price: 175000,
      image: "/jersey-uganda.jpg",
      frontImage: "/jersey-uganda.jpg",
      backImage: "/jersey-uganda.jpg",
      sizes: ["S", "M", "L", "XL"],
      stock: 22,
      active: true,
      description: "National Pride of Uganda: bold yellow, red and black stripes with the majestic Grey Crowned Crane badge.",
    },
  ];
}

export async function saveFirebaseProduct(product: Partial<FirebaseProduct>): Promise<string> {
  const id = String(product.id || crypto.randomUUID());
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      await setDoc(doc(firestore, "products", id), { ...product, id, updatedAt: Timestamp.now() }, { merge: true });
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `products/${id}`);
    }
  }

  try {
    const list = await fetchFirebaseProducts();
    const idx = list.findIndex((p) => p.id === id);
    const updated: FirebaseProduct = {
      id,
      name: product.name || "Football Jersey",
      team: product.team,
      price: product.price || 180000,
      image: product.image || "/jersey-arsenal.jpg",
      frontImage: product.frontImage || product.image || "/jersey-arsenal.jpg",
      backImage: product.backImage || product.image || "/jersey-arsenal.jpg",
      category: product.category || "Jerseys",
      description: product.description,
      sizes: product.sizes || ["S", "M", "L", "XL"],
      stock: product.stock ?? 20,
      active: product.active !== false,
    };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS, JSON.stringify(list));
  } catch {}
  return id;
}

export async function saveFirebaseDesign(userId: string, design: FirebaseDesignRecord): Promise<string> {
  const designId = String(design.id || crypto.randomUUID());
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      // Save to user's savedDesigns subcollection
      const userDesignRef = doc(firestore, "users", userId, "savedDesigns", designId);
      await setDoc(userDesignRef, { ...design, id: designId, userId, updatedAt: Timestamp.now() }, { merge: true });
      // Also mirror to top-level savedDesigns for fast indexing
      try {
        await setDoc(doc(firestore, "savedDesigns", designId), { ...design, id: designId, userId, updatedAt: Timestamp.now() }, { merge: true });
      } catch {}
      return designId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${userId}/savedDesigns/${designId}`);
    }
  }

  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_DESIGNS}_${userId}`) || "[]";
    const list: FirebaseDesignRecord[] = JSON.parse(raw);
    const existing = list.findIndex((d) => String(d.id) === designId);
    if (existing >= 0) {
      list[existing] = { ...design, id: designId };
    } else {
      list.unshift({ ...design, id: designId });
    }
    localStorage.setItem(`${LOCAL_STORAGE_DESIGNS}_${userId}`, JSON.stringify(list));
  } catch {}
  return designId;
}

export async function fetchFirebaseDesigns(userId: string): Promise<FirebaseDesignRecord[]> {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      const q = query(collection(firestore, "users", userId, "savedDesigns"), orderBy("updatedAt", "desc"), limit(20));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      // Fallback check legacy designs subcollection
      const legacyQ = query(collection(firestore, "users", userId, "designs"), orderBy("updatedAt", "desc"), limit(20));
      const legacySnap = await getDocs(legacyQ);
      return legacySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, `users/${userId}/savedDesigns`);
    }
  }

  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_DESIGNS}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function saveFirebaseCart(userId: string, cart: unknown[]) {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      await setDoc(doc(firestore, "users", userId, "cart", "current"), { items: cart, updatedAt: Timestamp.now() }, { merge: true });
      return;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${userId}/cart/current`);
    }
  }
}

export async function createFirebaseOrder(userId: string, order: Record<string, unknown>): Promise<string> {
  const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      const userOrderRef = doc(firestore, "users", userId, "orders", orderId);
      await setDoc(userOrderRef, { ...order, id: orderId, userId, createdAt: Timestamp.now() });
      return orderId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${userId}/orders/${orderId}`);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS) || "[]";
    const list = JSON.parse(raw);
    list.unshift({
      ...order,
      id: orderId,
      userId,
      createdAt: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
    });
    localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(list));
  } catch {}
  return orderId;
}

export async function fetchFirebaseOrders(userId?: string): Promise<Record<string, unknown>[]> {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      if (userId) {
        const q = query(collection(firestore, "users", userId, "orders"), orderBy("createdAt", "desc"), limit(50));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        const q = query(collectionGroup(firestore, "orders"), orderBy("createdAt", "desc"), limit(50));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, userId ? `users/${userId}/orders` : "orders");
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS);
    if (raw) {
      const list = JSON.parse(raw);
      if (userId) return list.filter((o: any) => o.userId === userId);
      return list;
    }
  } catch {}

  return [];
}

export async function updateFirebaseOrderStatus(orderId: string, status: string, deliveryStatus?: string, riderId?: string) {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      const orders = await getDocs(collectionGroup(firestore, "orders"));
      const match = orders.docs.find((d) => d.id === orderId);
      if (match) {
        await setDoc(
          match.ref,
          {
            status,
            ...(deliveryStatus ? { deliveryStatus } : {}),
            ...(riderId ? { riderId } : {}),
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );
        return true;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS) || "[]";
    const list = JSON.parse(raw);
    const match = list.find((o: any) => o.id === orderId);
    if (match) {
      match.status = status;
      if (deliveryStatus) match.deliveryStatus = deliveryStatus;
      if (riderId) match.riderId = riderId;
      localStorage.setItem(LOCAL_STORAGE_ORDERS, JSON.stringify(list));
      return true;
    }
  } catch {}
  return true;
}

// -------------------------------------------------------------
// Studio Configuration & Multi-Tier Pricing (Normal vs Premium)
// -------------------------------------------------------------
export interface FirebaseStudioSettings {
  normalEditorPrice: number;
  premiumEditorPrice: number;
  normalEditorEnabled: boolean;
  premiumEditorEnabled: boolean;
  nameNumberFee: number;
  sleeveBadgesFee: number;
  customUploadFee: number;
  specialNumberStyleFee: number;
  advancedTextEffectFee: number;
  customFrameFee: number;
  fonts?: { id: string; name: string; tier: "normal" | "premium"; active: boolean }[];
  badges?: { id: string; name: string; tier: "normal" | "premium"; icon: string; price: number }[];
  numberStyles?: { id: string; name: string; tier: "normal" | "premium" }[];
  updatedAt?: any;
}

const LOCAL_STORAGE_STUDIO_SETTINGS = "elevenx_studio_settings_v2";

export const DEFAULT_STUDIO_SETTINGS: FirebaseStudioSettings = {
  normalEditorPrice: 0, // Free normal editor by default
  premiumEditorPrice: 35000, // UGX 35,000 for advanced matchday studio
  normalEditorEnabled: true,
  premiumEditorEnabled: true,
  nameNumberFee: 15000,
  sleeveBadgesFee: 15000,
  customUploadFee: 10000,
  specialNumberStyleFee: 10000,
  advancedTextEffectFee: 8000,
  customFrameFee: 12000,
  fonts: [
    { id: "Arial", name: "Classic Pro", tier: "normal", active: true },
    { id: "Georgia", name: "Heritage Serif", tier: "normal", active: true },
    { id: "Trebuchet MS", name: "Athletic Bold", tier: "normal", active: true },
    { id: "Impact", name: "Impact Stadium 3D", tier: "premium", active: true },
    { id: "Courier New", name: "Digital Cyber Mono", tier: "premium", active: true },
  ],
  badges: [
    { id: "crest_generic", name: "Official Club Crest", tier: "normal", icon: "🛡️", price: 0 },
    { id: "flag_uganda", name: "Uganda Cranes Crest", tier: "normal", icon: "🇺🇬", price: 0 },
    { id: "patch_epl", name: "Premier League Gold Champions Patch", tier: "premium", icon: "👑", price: 15000 },
    { id: "patch_ucl", name: "Champions League Starball Patch", tier: "premium", icon: "⭐", price: 15000 },
    { id: "patch_afcon", name: "AFCON Official Tournament Badge", tier: "premium", icon: "🏆", price: 15000 },
  ],
  numberStyles: [
    { id: "standard", name: "Standard Solid", tier: "normal" },
    { id: "dual-outline", name: "Dual-Outline Pro", tier: "premium" },
    { id: "3d", name: "3D Extruded Stadium", tier: "premium" },
    { id: "gradient", name: "Sunset Gold Gradient", tier: "premium" },
    { id: "honeycomb", name: "Cyber Honeycomb Pattern", tier: "premium" },
    { id: "neon", name: "Matchday Glow Neon", tier: "premium" },
  ],
};

export async function fetchFirebaseStudioSettings(): Promise<FirebaseStudioSettings> {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      const snap = await getDoc(doc(firestore, "settings", "studio"));
      if (snap.exists()) {
        return { ...DEFAULT_STUDIO_SETTINGS, ...snap.data() } as FirebaseStudioSettings;
      }
    } catch (e) {
      console.warn("Could not load studio settings from Firestore, using cache:", e);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STUDIO_SETTINGS);
    if (raw) return { ...DEFAULT_STUDIO_SETTINGS, ...JSON.parse(raw) };
  } catch {}

  return DEFAULT_STUDIO_SETTINGS;
}

export async function saveFirebaseStudioSettings(settings: Partial<FirebaseStudioSettings>) {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      await setDoc(doc(firestore, "settings", "studio"), { ...settings, updatedAt: Timestamp.now() }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "settings/studio");
    }
  }

  try {
    const current = await fetchFirebaseStudioSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(LOCAL_STORAGE_STUDIO_SETTINGS, JSON.stringify(updated));
  } catch {}
}

// -------------------------------------------------------------
// Proof of Delivery (POD) Module with Offline Cache
// -------------------------------------------------------------
export interface FirebasePODRecord {
  id: string;
  orderId: string;
  riderId: string;
  recipientName: string;
  photoUrl?: string;
  signature?: string;
  notes?: string;
  timestamp: string;
  synced: boolean;
}

const LOCAL_STORAGE_PODS = "elevenx_pods_v1";

export async function submitFirebasePOD(pod: Omit<FirebasePODRecord, "id" | "timestamp" | "synced">): Promise<FirebasePODRecord> {
  const record: FirebasePODRecord = {
    ...pod,
    id: "POD-" + Date.now(),
    timestamp: new Date().toISOString(),
    synced: false,
  };

  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      await setDoc(doc(firestore, "proof_of_delivery", record.id), {
        ...record,
        synced: true,
        createdAt: Timestamp.now(),
      });
      record.synced = true;
    } catch (e) {
      console.warn("Offline POD submission, stored in resilient cache:", e);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PODS) || "[]";
    const list: FirebasePODRecord[] = JSON.parse(raw);
    list.unshift(record);
    localStorage.setItem(LOCAL_STORAGE_PODS, JSON.stringify(list));
  } catch {}

  return record;
}

export async function fetchFirebasePODs(riderId?: string): Promise<FirebasePODRecord[]> {
  const firestore = getFirebaseDb();
  if (firestore) {
    try {
      const snap = await getDocs(collection(firestore, "proof_of_delivery"));
      if (!snap.empty) {
        const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirebasePODRecord));
        if (riderId) return loaded.filter((p) => p.riderId === riderId);
        return loaded;
      }
    } catch (e) {
      console.warn("Could not load PODs from Firestore, using cache:", e);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PODS);
    if (raw) {
      const list: FirebasePODRecord[] = JSON.parse(raw);
      if (riderId) return list.filter((p) => p.riderId === riderId);
      return list;
    }
  } catch {}

  return [];
}

