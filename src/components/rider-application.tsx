import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/shell";
import { useAuth } from "@/lib/auth";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Bike, CheckCircle, Clock } from "lucide-react";

export function RiderApplication() {
  const { user, loginDemo } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", area: "Kampala Central" });

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }
    const db = getFirebaseDb();
    if (db) {
      try {
        await setDoc(
          doc(db, "rider_applications", user.id),
          {
            user_id: user.id,
            ...form,
            status: "pending",
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {}
    }
    setSubmitted(true);
    toast.success("Rider application submitted! Our operations team will review it.");
  };

  return (
    <Page>
      <div className="section-title">ElevenX Dispatch Rider Portal</div>
      {submitted ? (
        <div className="panel p-6 text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold">Application Pending Review</h2>
          <p className="muted text-xs">
            Thank you, {form.full_name}. We have logged your request for <b>{form.area}</b>. You will be activated once verified.
          </p>
          <div className="pt-2">
            <button
              onClick={() => loginDemo("rider")}
              className="btn-gold text-xs py-2 px-4"
            >
              Test with Demo Rider Account Now
            </button>
          </div>
        </div>
      ) : (
        <form className="panel space-y-3 p-5" onSubmit={apply}>
          <div className="flex items-center gap-2 mb-2">
            <Bike className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">Apply to Join Delivery Fleet</h2>
          </div>
          <p className="muted text-xs">Earn daily delivering customized kits and merchandise across Kampala and Entebbe.</p>

          <div>
            <label className="field-label text-xs">Full Legal Name</label>
            <input
              className="field text-xs py-2"
              required
              placeholder="e.g. Samuel Mugerwa"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="field-label text-xs">Active Phone / WhatsApp</label>
            <input
              className="field text-xs py-2"
              required
              placeholder="+256 7..."
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="field-label text-xs">Primary Operating Zone</label>
            <select
              className="field text-xs py-2"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            >
              <option value="Kampala Central">Kampala Central & CBD</option>
              <option value="Kololo / Nakasero">Kololo / Nakasero / Kamwokya</option>
              <option value="Ntinda / Kiwatule">Ntinda / Kiwatule / Kira</option>
              <option value="Bugolobi / Muyenga">Bugolobi / Muyenga / Kansanga</option>
              <option value="Entebbe Highway">Entebbe Highway / Kajjansi</option>
            </select>
          </div>

          <button className="btn-gold full text-xs py-2.5">SUBMIT RIDER APPLICATION</button>
        </form>
      )}
    </Page>
  );
}
