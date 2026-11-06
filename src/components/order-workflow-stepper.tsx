import { ShoppingBag, CheckCircle2, Printer, ShieldCheck, Package, Bike, Truck, ArrowRight, Check } from "lucide-react";

export type WorkflowStageId =
  | "customer_orders"
  | "design_approval"
  | "printing_queue"
  | "quality_control"
  | "packaging"
  | "rider_assignment"
  | "delivery";

export interface WorkflowStageInfo {
  id: WorkflowStageId;
  label: string;
  step: number;
  icon: typeof ShoppingBag;
  color: string;
  description: string;
  actionLabel: string;
}

export const WORKFLOW_STAGES: WorkflowStageInfo[] = [
  {
    id: "customer_orders",
    label: "Customer Orders",
    step: 1,
    icon: ShoppingBag,
    color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    description: "New order placed by customer. Custom kit specifications received.",
    actionLabel: "Approve Design →",
  },
  {
    id: "design_approval",
    label: "Design Approval",
    step: 2,
    icon: CheckCircle2,
    color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    description: "Kit customization reviewed for typography, badge positions & print alignment.",
    actionLabel: "Send to Printing Queue →",
  },
  {
    id: "printing_queue",
    label: "Printing Queue",
    step: 3,
    icon: Printer,
    color: "text-purple-400 bg-purple-500/15 border-purple-500/30",
    description: "Transferred to sublimation & DTF vinyl print department.",
    actionLabel: "Pass to Quality Control →",
  },
  {
    id: "quality_control",
    label: "Quality Control",
    step: 4,
    icon: ShieldCheck,
    color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
    description: "Inspecting fabric stitching, vinyl heat-adhesion & sizing accuracy.",
    actionLabel: "QC Passed: Send to Packaging →",
  },
  {
    id: "packaging",
    label: "Packaging",
    step: 5,
    icon: Package,
    color: "text-orange-400 bg-orange-500/15 border-orange-500/30",
    description: "Sealed in branded ElevenX garment bag with packing slip & authenticity seal.",
    actionLabel: "Packaged: Assign Rider →",
  },
  {
    id: "rider_assignment",
    label: "Rider Assignment",
    step: 6,
    icon: Bike,
    color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",
    description: "Dispatch matching courier rider for delivery route.",
    actionLabel: "Dispatch for Delivery →",
  },
  {
    id: "delivery",
    label: "Delivery",
    step: 7,
    icon: Truck,
    color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    description: "Courier in transit with live GPS navigation. Proof of Delivery pending.",
    actionLabel: "Mark Delivered ✓",
  },
];

export function getWorkflowStageIndex(status: string): number {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("design approv")) return 1;
  if (s.includes("print") || s.includes("customization and print")) return 2;
  if (s.includes("quality") || s.includes("qc")) return 3;
  if (s.includes("packag") || s.includes("pack")) return 4;
  if (s.includes("rider") || s.includes("dispatch") || s.includes("ready for dispatch") || s.includes("assign")) return 5;
  if (s.includes("out for delivery") || s.includes("deliver")) return 6;
  // Default to Customer Orders
  return 0;
}

export function getWorkflowStage(status: string): WorkflowStageInfo {
  const index = getWorkflowStageIndex(status);
  return WORKFLOW_STAGES[index];
}

export function getNextWorkflowStage(status: string): WorkflowStageInfo | null {
  const currentIndex = getWorkflowStageIndex(status);
  if (currentIndex < WORKFLOW_STAGES.length - 1) {
    return WORKFLOW_STAGES[currentIndex + 1];
  }
  return null;
}

interface OrderWorkflowStepperProps {
  status: string;
  onAdvanceStage?: (nextStage: WorkflowStageInfo) => void;
  isAdmin?: boolean;
  compact?: boolean;
}

export function OrderWorkflowStepper({
  status,
  onAdvanceStage,
  isAdmin = false,
  compact = false,
}: OrderWorkflowStepperProps) {
  const currentIndex = getWorkflowStageIndex(status);
  const currentStage = WORKFLOW_STAGES[currentIndex];
  const nextStage = getNextWorkflowStage(status);

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Stage {currentIndex + 1} of 7: <strong className="text-primary">{currentStage.label}</strong>
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {Math.round(((currentIndex + 1) / 7) * 100)}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border">
          <div
            className="h-full bg-gradient-to-r from-primary/80 via-primary to-amber-300 transition-all duration-500 rounded-full"
            style={{ width: `${((currentIndex + 1) / 7) * 100}%` }}
          />
        </div>

        <p className="text-[10px] text-muted-foreground leading-tight">
          {currentStage.description}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gold-line/40 bg-card/80 p-3.5 sm:p-4 space-y-3.5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Custom Kit Production & Fulfillment Pipeline
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h4 className="font-display font-bold text-sm text-foreground">
              Current Stage: <span className="text-primary">{currentStage.label}</span>
            </h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentStage.color}`}>
              Step {currentStage.step}/7
            </span>
          </div>
        </div>

        {isAdmin && onAdvanceStage && (
          <div>
            {nextStage ? (
              <button
                type="button"
                onClick={() => onAdvanceStage(nextStage)}
                className="btn-gold text-[11px] py-1.5 px-3 flex items-center gap-1.5 shadow"
              >
                <span>Advance: {nextStage.label}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <Check className="h-3.5 w-3.5" /> Order Completed
              </span>
            )}
          </div>
        )}
      </div>

      {/* 7-Step Pipeline Visual Track */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[620px] flex items-center justify-between relative">
          {/* Connector Line */}
          <div className="absolute top-4 left-6 right-6 h-1 bg-surface -z-0 rounded-full" />
          <div
            className="absolute top-4 left-6 h-1 bg-gradient-to-r from-primary via-amber-400 to-primary -z-0 transition-all duration-500 rounded-full"
            style={{ width: `${(currentIndex / 6) * 90}%` }}
          />

          {WORKFLOW_STAGES.map((st, idx) => {
            const Icon = st.icon;
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isUpcoming = idx > currentIndex;

            return (
              <div key={st.id} className="relative z-10 flex flex-col items-center text-center group max-w-[80px]">
                {/* Step Circle */}
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 transition-all duration-300 ${
                    isCurrent
                      ? "border-primary bg-primary text-black font-extrabold shadow-[0_0_15px_rgba(201,146,46,0.8)] scale-110"
                      : isCompleted
                      ? "border-primary bg-card text-primary font-bold"
                      : "border-border bg-surface text-muted-foreground"
                  }`}
                  title={`${st.step}. ${st.label}`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Stage Title */}
                <span
                  className={`text-[10px] mt-1.5 font-bold leading-tight ${
                    isCurrent
                      ? "text-primary scale-105"
                      : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {st.label}
                </span>

                <span className="text-[8px] text-muted-foreground font-mono">
                  {idx === 0
                    ? "Orders"
                    : idx === 1
                    ? "Approve"
                    : idx === 2
                    ? "Print"
                    : idx === 3
                    ? "QC"
                    : idx === 4
                    ? "Pack"
                    : idx === 5
                    ? "Rider"
                    : "Delivered"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-surface/80 border border-border text-xs flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-[11px] leading-snug">
          <strong className="text-foreground">Stage Note: </strong>
          {currentStage.description}
        </p>
        <span className="text-[10px] font-mono text-primary font-bold shrink-0">
          ElevenX Fulfillment Engine
        </span>
      </div>
    </div>
  );
}
