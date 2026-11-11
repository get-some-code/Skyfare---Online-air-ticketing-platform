"use client";

import { useEffect, useRef } from "react";

import { Icon } from "@/components/ui/icon";

interface PreviewDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function PreviewDialog({
  open,
  title,
  message,
  onClose,
}: PreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="preview-dialog"
      aria-labelledby="preview-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="preview-dialog__content">
        <button
          type="button"
          className="icon-button preview-dialog__close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="x" />
        </button>
        <span className="eyebrow eyebrow--blue">SkyFare preview</span>
        <h2 id="preview-dialog-title">{title}</h2>
        <p>{message}</p>
        <button type="button" className="button button--primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </dialog>
  );
}
