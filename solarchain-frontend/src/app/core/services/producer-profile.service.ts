import { Injectable } from "@angular/core";
import { Contract, InterfaceAbi } from "ethers";
import { environment } from "../../../environments/environment";
import producerProfileArtifact from "../../../assets/contracts/ProducerProfile.json";
import { IpfsService, ProducerProfileData } from "./ipfs.service";
import { Web3Service } from "./web3.service";

export interface ProducerProfileWithAddress {
  address: string;
  profile: ProducerProfileData;
}

@Injectable({ providedIn: "root" })
export class ProducerProfileService {
  constructor(
    private readonly web3Service: Web3Service,
    private readonly ipfsService: IpfsService
  ) {}

  getContract(): Contract {
    if (!environment.contracts.producerProfile) {
      throw new Error("Adresse du contrat ProducerProfile non configuree.");
    }

    const runner = this.web3Service.signer ?? this.web3Service.provider;
    if (!runner) {
      throw new Error("Wallet non connecte");
    }

    return new Contract(
      environment.contracts.producerProfile,
      (producerProfileArtifact as { abi: InterfaceAbi }).abi,
      runner
    );
  }

  async getProfileCID(producerAddress: string): Promise<string> {
    const contract = this.getContract();
    return (await contract.profileCID(producerAddress)) as string;
  }

  async hasProfile(producerAddress: string): Promise<boolean> {
    const contract = this.getContract();
    return (await contract.hasProfile(producerAddress)) as boolean;
  }

  async getFullProfile(producerAddress: string): Promise<ProducerProfileData | null> {
    const cid = await this.getProfileCID(producerAddress);
    if (!cid) {
      return null;
    }

    return this.ipfsService.fetchProfile(cid);
  }

  async saveProfile(profileData: ProducerProfileData, imageFile?: File): Promise<string> {
    const contract = this.getContract();

    const account = this.web3Service.currentAccount;
    if (!account) {
      throw new Error("Wallet non connecte");
    }

    const payload: ProducerProfileData = {
      ...profileData,
      producerAddress: account,
      createdAt: profileData.createdAt || new Date().toISOString()
    };

    if (imageFile) {
      const imageHash = await this.ipfsService.uploadImage(imageFile);
      payload.imageHash = imageHash;
    }

    const profileCID = await this.ipfsService.uploadProfileJSON(payload);
    const tx = await contract.setProfile(profileCID);
    await tx.wait();

    return profileCID;
  }

  async removeProfile(): Promise<void> {
    const contract = this.getContract();
    const tx = await contract.removeProfile();
    await tx.wait();
  }

  async getAllProfilesWithData(): Promise<ProducerProfileWithAddress[]> {
    const contract = this.getContract();
    const addresses = (await contract.getAllProducersWithProfile()) as string[];

    const results = await Promise.all(
      addresses.map(async (address) => {
        const profile = await this.getFullProfile(address);
        if (!profile) {
          return null;
        }

        return {
          address,
          profile
        } satisfies ProducerProfileWithAddress;
      })
    );

    return results.filter((item): item is ProducerProfileWithAddress => item !== null);
  }
}
