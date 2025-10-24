"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg";

export type ModalProps = {
  open: boolean;
  onCloseAction?: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  hideCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  // Optional top-left icon (e.g., /phantom.svg)
  iconSrc?: string;
  // Optional description for accessibility
  description?: string;
  // If true, pressing Escape will not close the modal
  disableEsc?: boolean;
  // If true, clicking the backdrop will not close the modal
  disableBackdropClose?: boolean;
  className?: string;
};

const ANIM_MS = 180;

function useIsomorphicLayoutEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList,
) {
  // Avoid warnings during SSR
  const useLE = typeof window !== "undefined" ? useLayoutEffect : useEffect;
  return useLE(effect, deps);
}

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const selectors = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  return Array.from(
    container.querySelectorAll<HTMLElement>(selectors.join(",")),
  ).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
  );
}

export default function Modal({
  open,
  onCloseAction,
  title,
  children,
  size = "md",
  hideCloseButton = false,
  closeOnBackdrop = true,
  initialFocusRef,
  iconSrc,
  description,
  disableEsc = false,
  disableBackdropClose = false,
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [rendered, setRendered] = useState(open);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const labelledBy = useId();
  const describedBy = useId();

  // Manage portal mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Manage show/hide with simple transition
  useEffect(() => {
    if (open) {
      const t1 = setTimeout(() => setRendered(true), 0);
      const id = requestAnimationFrame(() => setAnimateIn(true));
      return () => {
        clearTimeout(t1);
        cancelAnimationFrame(id);
      };
    } else {
      setTimeout(() => setAnimateIn(false), 0);
      const t = setTimeout(() => setRendered(false), ANIM_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (!rendered) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [rendered]);

  // Save/restore focus
  useIsomorphicLayoutEffect(() => {
    if (open) {
      lastActiveRef.current = (document.activeElement as HTMLElement) ?? null;

      // Focus initial element or first focusable in panel
      const tryFocus = () => {
        const target =
          initialFocusRef?.current ??
          getFocusableElements(panelRef.current).find(
            (el) => el.offsetParent !== null,
          );
        if (target) {
          target.focus();
        } else {
          panelRef.current?.focus();
        }
      };

      const id = setTimeout(tryFocus, 0);
      return () => {
        clearTimeout(id);
      };
    } else {
      if (
        lastActiveRef.current &&
        typeof lastActiveRef.current.focus === "function"
      ) {
        lastActiveRef.current.focus();
      }
      lastActiveRef.current = null;
    }
  }, [open, initialFocusRef]);

  // Keyboard handlers (Escape + focus trap)
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!panelRef.current) return;

      if (e.key === "Escape" && !disableEsc) {
        e.stopPropagation();
        e.preventDefault();
        onCloseAction?.();
        return;
      }

      if (e.key === "Tab") {
        const focusables = getFocusableElements(panelRef.current);
        if (focusables.length === 0) {
          e.preventDefault();
          panelRef.current.focus();
          return;
        }
        const currentIndex = focusables.indexOf(
          document.activeElement as HTMLElement,
        );
        let nextIndex = currentIndex;

        if (e.shiftKey) {
          nextIndex =
            currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
        } else {
          nextIndex =
            currentIndex === focusables.length - 1 ? 0 : currentIndex + 1;
        }

        e.preventDefault();
        focusables[nextIndex]?.focus();
      }
    },
    [onCloseAction, disableEsc],
  );

  // Backdrop click to close
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownTargetRef.current = e.target;
  };
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const startedOnBackdrop = mouseDownTargetRef.current === dialogRef.current;
    const endedOnBackdrop = e.target === dialogRef.current;
    mouseDownTargetRef.current = null;

    if (!closeOnBackdrop || disableBackdropClose) return;
    if (startedOnBackdrop && endedOnBackdrop) {
      onCloseAction?.();
    }
  };

  const sizeClasses = useMemo(() => {
    switch (size) {
      case "sm":
        return "max-w-sm";
      case "lg":
        return "max-w-2xl";
      case "md":
      default:
        return "max-w-lg";
    }
  }, [size]);

  if (!mounted || !rendered) return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? labelledBy : undefined}
      aria-describedby={description ? describedBy : undefined}
      onKeyDown={onKeyDown}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={[
        "fixed inset-0 z-50",
        "flex items-center justify-center",
        "px-4 py-10 sm:px-6",
        "backdrop-blur-[3px]",
      ].join(" ")}
    >
      {/* Backdrop */}
      <div
        className={[
          "absolute inset-0 transition-opacity duration-200 ease-out",
          animateIn ? "opacity-100 bg-black/60" : "opacity-0 bg-black/40",
        ].join(" ")}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={[
          "relative w-full",
          sizeClasses,
          "rounded-2xl border border-white/20 bg-white/85 p-0 shadow-xl ring-1 ring-black/5",
          "dark:border-white/10 dark:bg-zinc-900/90 dark:ring-white/5",
          "transition-all duration-200 ease-out",
          animateIn
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-[0.98]",
          className ?? "",
        ].join(" ")}
        style={{
          backgroundImage:
            "radial-gradient(900px 480px at 0% 0%, rgba(139, 92, 246, 0.14), transparent 60%), radial-gradient(900px 480px at 100% 0%, rgba(16, 185, 129, 0.10), transparent 60%)",
        }}
      >
        {/* Header */}
        {(title || !hideCloseButton || iconSrc) && (
          <div className="flex items-center justify-between gap-4 px-6 pb-3 pt-5">
            <div className="flex min-w-0 items-center gap-3">
              {iconSrc ? (
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 ring-1 ring-inset ring-violet-400/20 dark:bg-violet-400/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={iconSrc}
                    alt=""
                    className="h-5 w-5"
                    aria-hidden="true"
                    draggable={false}
                  />
                </span>
              ) : null}
              {title ? (
                <h2
                  id={labelledBy}
                  className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50"
                  title={title}
                >
                  {title}
                </h2>
              ) : null}
            </div>

            {!hideCloseButton && (
              <button
                type="button"
                aria-label="Close"
                onClick={onCloseAction}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Description */}
        {description ? (
          <p
            id={describedBy}
            className="px-5 text-sm text-zinc-600 dark:text-zinc-400"
          >
            {description}
          </p>
        ) : null}

        {/* Body */}
        <div className="px-6 pb-6 pt-4">{children}</div>

        {/* Soft bottom glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 left-1/2 h-28 w-[70%] -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-400/20"
        />
      </div>
    </div>,
    document.body,
  );
}

/**
 * Modal.Actions
 * A helper for arranging footer actions when needed.
 */
export function ModalActions({
  children,
  align = "end",
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end" | "between";
}) {
  const justify =
    align === "start"
      ? "justify-start"
      : align === "center"
        ? "justify-center"
        : align === "between"
          ? "justify-between"
          : "justify-end";
  return (
    <div className={`mt-4 flex items-center gap-3 px-5 pb-5 pt-2 ${justify}`}>
      {children}
    </div>
  );
}
