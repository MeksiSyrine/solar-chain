export interface MarketTransaction {
  id: number;
  offerId: number;
  producer: string;
  consumer: string;
  quantityKwh: string;
  unitPriceWei: string;
  totalPriceWei: string;
  timestamp: number;
}
