"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface TableProps extends React.ComponentProps<"table"> {
  /**
   * Optional ref to the scroll container element.
   * Use this for sticky scrollbar integration.
   */
  containerRef?: React.RefObject<HTMLDivElement | null>;
  /**
   * Optional max height for the table container.
   * When set, enables vertical scrolling within the container,
   * which is required for sticky headers to work properly.
   * Use viewport units like "calc(100vh - 300px)" or fixed values like "600px".
   */
  maxHeight?: string;
}

function Table({ className, containerRef, maxHeight, ...props }: TableProps) {
  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      // When maxHeight is set, we enable vertical scrolling for sticky headers.
      // For horizontal scrolling at page level: make container match table width
      // so it doesn't constrain the table horizontally.
      className={cn(
        "relative",
        maxHeight && "overflow-y-auto"
      )}
      style={{
        ...(maxHeight ? { maxHeight } : {}),
        // Make container as wide as its content (the table)
        // This allows the table's full width to propagate to the page level
        width: "fit-content",
        minWidth: "100%",
      }}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b",
        // Story 19.13: Sticky header - stays visible when scrolling down
        // z-30 ensures header is above body content and sticky columns (z-10/z-20)
        // Shadow provides visual separation when content scrolls behind
        "sticky top-0 z-30 bg-background shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)]",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-12 px-4 text-center align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        // Story 19.13: Ensure header cells have background for sticky headers
        "bg-background",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-4 align-middle text-center whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
