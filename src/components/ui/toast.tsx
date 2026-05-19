"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const DEFAULT_TOAST_DURATION_MS = 8000;

const defaultClassNames = {
  toast:
    "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
  description: "group-[.toast]:text-muted-foreground",
  actionButton:
    "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
  cancelButton:
    "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
  error:
    "!bg-red-50 !text-red-950 !border-red-300",
  icon: "group-data-[type=error]:text-red-700",
};

const Toaster = ({
  toastOptions,
  duration = DEFAULT_TOAST_DURATION_MS,
  richColors = true,
  closeButton = true,
  position = "bottom-right",
  ...props
}: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position={position}
      richColors={richColors}
      closeButton={closeButton}
      duration={duration}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...defaultClassNames,
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
