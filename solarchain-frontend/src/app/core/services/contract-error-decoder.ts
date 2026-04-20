import { Interface, InterfaceAbi } from "ethers";
import energyMarketArtifact from "../../../assets/contracts/EnergyMarket.json";
import energyTokenArtifact from "../../../assets/contracts/EnergyToken.json";

const marketInterface = new Interface((energyMarketArtifact as { abi: InterfaceAbi }).abi);
const tokenInterface = new Interface((energyTokenArtifact as { abi: InterfaceAbi }).abi);

const FRIENDLY_MESSAGES: Record<string, (args: readonly unknown[]) => string> = {
  ERC20InsufficientBalance: (args) => {
    const balance = toPrintable(args[1]);
    const needed = toPrintable(args[2]);
    return `Solde SKWH insuffisant (vous avez ${balance}, il faut ${needed}).`;
  },
  ERC20InsufficientAllowance: () =>
    "Autorisation insuffisante, veuillez approuver davantage de SKWH.",
  InvalidAmount: () => "Quantite invalide.",
  InvalidPrice: () => "Prix invalide.",
  TokenTransferFailed: () => "Echec du transfert SKWH."
};

export function decodeContractError(error: unknown): string {
  const data = extractRevertData(error);

  if (data) {
    const marketDecoded = tryDecodeError(marketInterface, data);
    if (marketDecoded) {
      return marketDecoded;
    }

    const tokenDecoded = tryDecodeError(tokenInterface, data);
    if (tokenDecoded) {
      return tokenDecoded;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Transaction refusee. Verifiez les parametres puis reessayez.";
}

function tryDecodeError(iface: Interface, data: string): string | null {
  try {
    const parsed = iface.parseError(data);
    if (!parsed) {
      return null;
    }

    const formatter = FRIENDLY_MESSAGES[parsed.name];
    if (!formatter) {
      return null;
    }

    return formatter(parsed.args as readonly unknown[]);
  } catch {
    return null;
  }
}

function extractRevertData(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const maybeError = error as {
    data?: unknown;
    error?: { data?: unknown };
    info?: { error?: { data?: unknown } };
    revert?: { data?: unknown };
  };

  const candidates = [
    maybeError.data,
    maybeError.error?.data,
    maybeError.info?.error?.data,
    maybeError.revert?.data
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("0x")) {
      return candidate;
    }
  }

  return null;
}

function toPrintable(value: unknown): string {
  if (typeof value === "bigint") {
    return value.toString();
  }

  return String(value ?? "0");
}
