import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
  
export interface ProducerProfileData {
  name: string;
  location: string;
  description: string;
  capacityKwp: number;
  installYear: number;
  imageHash: string;
  producerAddress: string;
  createdAt: string;
}

@Injectable({ providedIn: "root" })
export class IpfsService {
  private readonly profileCache = new Map<string, ProducerProfileData>();

  validateImageFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSizeBytes = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: "Format invalide. Utilisez JPG, PNG ou WEBP."
      };
    }

    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: "Image trop lourde. Taille maximale: 5MB."
      };
    }

    return { valid: true };
  }

  async uploadImage(file: File): Promise<string> {
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || "Image invalide.");
    }

    if (!environment.jwt) {
      throw new Error("PINATA JWT manquant. Configurez NG_APP_PINATA_JWT.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${environment.jwt}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await this.safeReadError(response);
      throw new Error(`Echec upload image Pinata: ${errorText}`);
    }

    const payload = (await response.json()) as { IpfsHash?: string };
    if (!payload.IpfsHash) {
      throw new Error("Reponse Pinata invalide: IpfsHash absent pour l image.");
    }

    return payload.IpfsHash;
  }

  async uploadProfileJSON(profile: ProducerProfileData): Promise<string> {
    if (!environment.jwt) {
      throw new Error("PINATA JWT manquant. Configurez NG_APP_PINATA_JWT.");
    }

    const body = {
      pinataContent: profile,
      pinataMetadata: {
        name: `SolarChain-Profile-${profile.producerAddress}`
      }
    };

    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${environment.jwt}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await this.safeReadError(response);
      throw new Error(`Echec upload profil Pinata: ${errorText}`);
    }

    const payload = (await response.json()) as { IpfsHash?: string };
    if (!payload.IpfsHash) {
      throw new Error("Reponse Pinata invalide: IpfsHash absent pour le profil.");
    }

    return payload.IpfsHash;
  }

  async fetchProfile(cid: string): Promise<ProducerProfileData | null> {
    const normalizedCid = cid.trim();
    if (!normalizedCid) {
      return null;
    }

    const cached = this.profileCache.get(normalizedCid);
    if (cached) {
      return cached;
    }

    const gateways = [environment.gateway, environment.fallbackGateway];

    for (const gateway of gateways) {
      try {
        const response = await fetch(`${gateway}${normalizedCid}`);
        if (!response.ok) {
          continue;
        }

        const data = (await response.json()) as ProducerProfileData;
        if (!data || typeof data !== "object") {
          continue;
        }

        this.profileCache.set(normalizedCid, data);
        return data;
      } catch {
        // Try next gateway.
      }
    }

    return null;
  }

  getImageUrl(imageCid: string): string {
    const normalizedCid = imageCid.trim();
    if (!normalizedCid) {
      return "";
    }

    return `${environment.gateway}${normalizedCid}`;
  }

  private async safeReadError(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return `HTTP ${response.status}`;
    }
  }
}
