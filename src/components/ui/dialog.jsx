"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

function useVisibleViewport() {
  const [vp, setVp] = React.useState(() => ({
    height: typeof window !== "undefined" ? window.innerHeight : 800,
    top: 0,
  }));
  React.useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    const update = () => {
      if (vv) setVp({ height: vv.height, top: vv.offsetTop });
      else setVp({ height: window.innerHeight, top: 0 });
    };
    update();
    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
      return () => {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      };
    }
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return vp;
}

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const vp = useVisibleViewport();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const focusRef = React.useRef(null);
  const containerRef = React.useRef(null);

  const scrollFieldIntoView = React.useCallback(() => {
    const container = containerRef.current;
    const el = focusRef.current;
    if (!el || !container || !container.scrollTo) return;
    setTimeout(() => {
      try {
        const cRect = container.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        const offset = eRect.top - cRect.top + container.scrollTop - container.clientHeight * 0.18;
        container.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
      } catch (_) {}
    }, 60);
  }, []);

  // Re-scroll the focused field whenever the visible area changes (keyboard open/close).
  React.useEffect(() => {
    if (isMobile && focusRef.current) scrollFieldIntoView();
  }, [vp, isMobile, scrollFieldIntoView]);

  // Fit the dialog to the visible area above the keyboard on mobile.
  const mobileStyle = isMobile
    ? { top: `${Math.round(vp.top + vp.height * 0.03)}px`, maxHeight: `${Math.round(vp.height * 0.94)}px` }
    : undefined;

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={(node) => { containerRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }}
        onOpenAutoFocus={(e) => { try { e.preventDefault(); } catch (_) {} }}
        onFocusCapture={(e) => {
          const el = e.target;
          if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
            focusRef.current = el;
            scrollFieldIntoView();
          }
        }}
        onBlurCapture={() => { focusRef.current = null; }}
        style={mobileStyle}
        className={cn(
          "fixed inset-x-0 top-[6vh] z-50 mx-auto grid w-[calc(100%-1.5rem)] max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 max-h-[88lvh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%] sm:top-[50%] sm:-translate-y-1/2 sm:rounded-lg",
          className
        )}
        {...props}>
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}