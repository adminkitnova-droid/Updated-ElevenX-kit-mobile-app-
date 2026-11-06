import { useEffect, useRef, useState } from "react";
import { Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveStorageUrl } from "@/lib/images";

export function ProductImage({ src: ref, alt, className }: { src?: string; alt: string; className?: string }) {
  const resolved = resolveStorageUrl(ref || "");
  const [src, setSrc] = useState<string>(resolved);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!ref) {
      setState("error");
      return;
    }
    const target = resolveStorageUrl(ref);
    setSrc(target);
    setState("loading");
  }, [ref]);

  useEffect(() => {
    const el = img.current;
    if (!src) return;
    if (el?.complete) {
      setState(el.naturalWidth ? "ok" : "error");
    }
  }, [src]);

  return (
    <div className={cn("relative aspect-[4/5] w-full overflow-hidden bg-muted rounded-xl", className)}>
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-card" aria-hidden />}
      {state === "error" ? (
        <div role="img" aria-label={alt} className="absolute inset-0 grid place-items-center text-muted-foreground p-3">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Shirt className="h-8 w-8 text-primary/60" />
            <small className="text-[10px] text-muted-foreground">Jersey photo</small>
          </div>
        </div>
      ) : null}
      <img
        ref={img}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setState("ok")}
        onError={() => setState("error")}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          state === "ok" ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
