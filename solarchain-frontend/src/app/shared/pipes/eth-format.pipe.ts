import { Pipe, PipeTransform } from "@angular/core";
import { formatEther } from "ethers";

@Pipe({
  name: "ethFormat",
  standalone: true
})
export class EthFormatPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return "0 ETH";
    }

    const wei = typeof value === "number" ? BigInt(Math.trunc(value)) : BigInt(value);
    const eth = Number(formatEther(wei));
    return `${eth.toFixed(5)} ETH`;
  }
}
