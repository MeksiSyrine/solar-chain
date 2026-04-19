import { Component, EventEmitter, Input, Output } from "@angular/core";
import { NgClass, NgFor } from "@angular/common";

@Component({
  selector: "app-star-rating",
  standalone: true,
  imports: [NgFor, NgClass],
  templateUrl: "./star-rating.component.html"
})
export class StarRatingComponent {
  @Input() rating = 0;
  @Input() readonly = false;
  @Input() size: "sm" | "md" | "lg" = "md";

  @Output() readonly ratingChange = new EventEmitter<number>();

  readonly stars = [1, 2, 3, 4, 5];
  hoverRating = 0;

  get sizeClass(): string {
    if (this.size === "sm") {
      return "text-sm";
    }
    if (this.size === "lg") {
      return "text-3xl";
    }
    return "text-xl";
  }

  get displayRating(): number {
    if (this.readonly) {
      return this.rating;
    }
    return this.hoverRating || this.rating;
  }

  getStarFill(starIndex: number): 0 | 50 | 100 {
    const value = this.readonly ? this.rating : this.displayRating;
    const diff = value - (starIndex - 1);

    if (diff >= 1) {
      return 100;
    }
    if (diff >= 0.5) {
      return 50;
    }
    return 0;
  }

  onMouseEnter(star: number): void {
    if (this.readonly) {
      return;
    }
    this.hoverRating = star;
  }

  onMouseLeave(): void {
    if (this.readonly) {
      return;
    }
    this.hoverRating = 0;
  }

  onSelect(star: number): void {
    if (this.readonly) {
      return;
    }
    this.ratingChange.emit(star);
  }
}
