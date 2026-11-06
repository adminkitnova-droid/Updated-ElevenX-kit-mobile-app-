import { useState } from "react";
import { Database, Key, CheckCircle2, AlertCircle, RefreshCw, X, Shield, Cloud } from "lucide-react";
import {
  getActiveFirebaseConfig,
  saveStoredFirebaseConfig,
  clearStoredFirebaseConfig,
  testFirebaseConnection,
  isFirebaseConfigured,
  type FirebaseConfigKeys,
} from "@/lib/firebase";
import { toast } from "sonner";

export function FirebaseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const current = getActiveFirebaseConfig();
  const [keys, setKeys] = useState<FirebaseConfigKeys>(current);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testFirebaseConnection();
      setTestResult(res);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || "Connection test failed." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    saveStoredFirebaseConfig(keys);
    toast.success("Firebase configuration saved and applied!");
    onClose();
  };

  const handleReset = () => {
    clearStoredFirebaseConfig();
    toast.info("Reset to default environment settings.");
    onClose();
  };

  const isConfigured = isFirebaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-gold-line bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight">Firebase Cloud Storage & Backend</h2>
              <p className="text-xs text-muted-foreground">Manage your Firebase API keys and cloud storage directly in the app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status banner */}
        <div className={`mt-4 p-3.5 rounded-xl border flex items-start gap-3 ${
          isConfigured
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
        }`}>
          {isConfigured ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-bold">
              {isConfigured ? "Firebase Keys Configured" : "Offline / Demo Resilient Mode"}
            </p>
            <p className="text-muted-foreground">
              {isConfigured
                ? `Connected to project: ${current.projectId}. All Firestore documents and Storage assets sync live.`
                : "The app is running safely in resilient demo mode with full catalog, orders, and studio capabilities. Enter your Firebase keys below to link your live Firestore database and Cloud Storage bucket."}
            </p>
          </div>
        </div>

        {/* Key inputs form */}
        <div className="mt-5 space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
          <div>
            <label className="field-label text-xs font-semibold mb-1">Firebase API Key</label>
            <input
              type="password"
              className="field font-mono text-xs"
              placeholder="AIzaSy..."
              value={keys.apiKey}
              onChange={(e) => setKeys({ ...keys, apiKey: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label text-xs font-semibold mb-1">Firebase Project ID</label>
              <input
                type="text"
                className="field font-mono text-xs"
                placeholder="elevenx-app"
                value={keys.projectId}
                onChange={(e) => setKeys({ ...keys, projectId: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label text-xs font-semibold mb-1">Auth Domain</label>
              <input
                type="text"
                className="field font-mono text-xs"
                placeholder="elevenx.firebaseapp.com"
                value={keys.authDomain}
                onChange={(e) => setKeys({ ...keys, authDomain: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label text-xs font-semibold mb-1">Storage Bucket</label>
              <input
                type="text"
                className="field font-mono text-xs"
                placeholder="elevenx.appspot.com"
                value={keys.storageBucket}
                onChange={(e) => setKeys({ ...keys, storageBucket: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label text-xs font-semibold mb-1">App ID</label>
              <input
                type="text"
                className="field font-mono text-xs"
                placeholder="1:123456789:web:abcdef"
                value={keys.appId}
                onChange={(e) => setKeys({ ...keys, appId: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="field-label text-xs font-semibold mb-1">Messaging Sender ID (Optional)</label>
            <input
              type="text"
              className="field font-mono text-xs"
              placeholder="123456789012"
              value={keys.messagingSenderId}
              onChange={(e) => setKeys({ ...keys, messagingSenderId: e.target.value })}
            />
          </div>
        </div>

        {/* Test connection result */}
        {testResult && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
            testResult.ok ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30" : "bg-red-950/60 text-red-300 border border-red-500/30"
          }`}>
            {testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="btn-outline flex items-center gap-2 text-xs py-2 px-3 m-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-gold text-xs py-2 px-4"
            >
              Save Keys in App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
