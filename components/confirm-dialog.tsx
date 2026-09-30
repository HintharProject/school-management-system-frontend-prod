"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  /** Destructive delete-style confirm by default. */
  variant?: "destructive" | "default"
  checkboxLabel?: string
  children?: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  variant = "destructive",
  checkboxLabel,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [confirmed, setConfirmed] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setConfirmed(false)
    }
  }, [open])

  const canConfirm = !checkboxLabel || confirmed

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent onClose={onCancel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {children}

        {checkboxLabel && (
          <div className="flex items-start gap-2.5 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-foreground">
            <Checkbox
              id="confirm-action-checkbox"
              checked={confirmed}
              onCheckedChange={(val) => setConfirmed(val === true)}
              className="mt-0.5"
            />
            <label
              htmlFor="confirm-action-checkbox"
              className="cursor-pointer text-xs font-medium leading-relaxed select-none text-muted-foreground"
            >
              {checkboxLabel}
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={loading || !canConfirm}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

