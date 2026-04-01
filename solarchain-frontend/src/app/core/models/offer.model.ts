export interface Offer {
  id: number;
  producer: string;
  quantityKwh: string;
  pricePerKwhWei: string;
  remainingKwh: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
