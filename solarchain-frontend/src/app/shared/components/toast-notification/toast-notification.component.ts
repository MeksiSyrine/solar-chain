import { Component, inject } from "@angular/core";
import { NgClass } from "@angular/common";
import { MAT_SNACK_BAR_DATA } from "@angular/material/snack-bar";

type ToastVariant = "success" | "error" | "info";

export interface ToastNotificationData {
  title?: string;
  message: string;
  variant?: ToastVariant;
}

@Component({
  selector: "app-toast-notification",
  standalone: true,
  imports: [NgClass],
  template: `
    <div
      class="flex min-w-[250px] items-start gap-3"
      [ngClass]="{
        'text-green-300': variant === 'success',
        'text-rose-300': variant === 'error',
        'text-solar-300': variant === 'info'
      }"
    >
      <span class="mt-0.5 text-lg">{{ icon }}</span>
      <div>
        <p *ngIf="title" class="text-sm font-semibold text-text-primary">{{ title }}</p>
        <p class="text-sm text-text-secondary">{{ message }}</p>
      </div>
    </div>
  `
})
export class ToastNotificationComponent {
  private readonly data = inject<ToastNotificationData>(MAT_SNACK_BAR_DATA);

  get title(): string {
    return this.data.title || "Notification";
  }

  get message(): string {
    return this.data.message;
  }

  get variant(): ToastVariant {
    return this.data.variant || "info";
  }

  get icon(): string {
    if (this.variant === "success") {
      return "✓";
    }
    if (this.variant === "error") {
      return "⚠";
    }
    return "ℹ";
  }
}
