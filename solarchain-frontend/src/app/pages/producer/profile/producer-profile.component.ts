import { Component, DestroyRef, inject } from "@angular/core";
import { NgClass, NgIf } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { IpfsService, ProducerProfileData } from "../../../core/services/ipfs.service";
import { ProducerProfileService } from "../../../core/services/producer-profile.service";
import { Web3Service } from "../../../core/services/web3.service";

@Component({
  selector: "app-producer-profile",
  standalone: true,
  imports: [NgIf, NgClass, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: "./producer-profile.component.html"
})
export class ProducerProfileComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly web3Service = inject(Web3Service);
  readonly ipfsService = inject(IpfsService);
  private readonly producerProfileService = inject(ProducerProfileService);

  readonly currentYear = new Date().getFullYear();

  readonly profileForm = this.formBuilder.group({
    name: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    location: ["", [Validators.required, Validators.maxLength(120)]],
    description: ["", [Validators.required, Validators.maxLength(500)]],
    capacityKwp: ["", [Validators.required, Validators.min(1)]],
    installYear: ["", [Validators.required, Validators.min(1990), Validators.max(this.currentYear)]]
  });

  loading = false;
  saving = false;
  removing = false;
  hasProfile = false;
  showCreateForm = false;
  dragActive = false;
  errorMessage = "";
  uploadStepMessage = "";

  currentProfile: ProducerProfileData | null = null;
  selectedImageFile: File | undefined;
  selectedImagePreview = "";

  get descriptionLength(): number {
    return (this.profileForm.value.description || "").length;
  }

  get hasSelectedImage(): boolean {
    return !!this.selectedImageFile;
  }

  get displayImageUrl(): string {
    if (this.selectedImagePreview) {
      return this.selectedImagePreview;
    }

    if (this.currentProfile?.imageHash) {
      return this.ipfsService.getImageUrl(this.currentProfile.imageHash);
    }

    return "";
  }

  get account(): string {
    return this.web3Service.currentAccount;
  }

  constructor() {
    this.web3Service.account$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadProfileContext().catch(() => undefined);
    });

    this.loadProfileContext().catch(() => undefined);
  }

  shortAddress(address: string): string {
    if (!address) {
      return "-";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  startCreateFlow(): void {
    this.showCreateForm = true;
  }

  prepareEditProfile(): void {
    this.showCreateForm = true;
    this.patchFormFromCurrentProfile();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.setSelectedImage(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    this.setSelectedImage(file);
  }

  async saveProfile(): Promise<void> {
    if (!this.account) {
      this.errorMessage = "Connectez votre wallet pour sauvegarder le profil.";
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = "";

    try {
      const formValue = this.profileForm.getRawValue();
      const profilePayload: ProducerProfileData = {
        name: String(formValue.name || "").trim(),
        location: String(formValue.location || "").trim(),
        description: String(formValue.description || "").trim(),
        capacityKwp: Number(formValue.capacityKwp || 0),
        installYear: Number(formValue.installYear || 0),
        imageHash: this.currentProfile?.imageHash || "",
        producerAddress: this.account,
        createdAt: this.currentProfile?.createdAt || new Date().toISOString()
      };

      this.uploadStepMessage = this.selectedImageFile ? "1/3 Upload image..." : "1/3 Verification donnees...";
      if (this.selectedImageFile) {
        profilePayload.imageHash = await this.ipfsService.uploadImage(this.selectedImageFile);
      }

      this.uploadStepMessage = "2/3 Upload profil...";
      const profileCid = await this.ipfsService.uploadProfileJSON(profilePayload);

      this.uploadStepMessage = "3/3 Transaction...";
      const contract = this.producerProfileService.getContract();
      const tx = await contract.setProfile(profileCid);
      await tx.wait();

      this.snackBar.open("Profil producteur mis a jour.", "OK", {
        duration: 2600,
        panelClass: ["solar-snackbar", "solar-snackbar--success"]
      });

      this.selectedImageFile = undefined;
      this.selectedImagePreview = "";
      await this.loadProfileContext();
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.snackBar.open(this.errorMessage, "Fermer", {
        duration: 4200,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
    } finally {
      this.saving = false;
      this.uploadStepMessage = "";
    }
  }

  async removeProfile(): Promise<void> {
    if (!this.hasProfile || this.removing) {
      return;
    }

    const confirmed = window.confirm("Supprimer ce profil producteur ? Cette action retirera le CID on-chain.");
    if (!confirmed) {
      return;
    }

    this.removing = true;
    this.errorMessage = "";

    try {
      await this.producerProfileService.removeProfile();

      this.snackBar.open("Profil supprime.", "OK", {
        duration: 2500,
        panelClass: ["solar-snackbar", "solar-snackbar--info"]
      });

      this.selectedImageFile = undefined;
      this.selectedImagePreview = "";
      await this.loadProfileContext();
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.snackBar.open(this.errorMessage, "Fermer", {
        duration: 4200,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
    } finally {
      this.removing = false;
    }
  }

  private async loadProfileContext(): Promise<void> {
    const account = this.account;
    this.errorMessage = "";

    if (!account) {
      this.hasProfile = false;
      this.showCreateForm = false;
      this.currentProfile = null;
      this.profileForm.reset();
      return;
    }

    this.loading = true;

    try {
      this.hasProfile = await this.producerProfileService.hasProfile(account);

      if (!this.hasProfile) {
        this.currentProfile = null;
        this.showCreateForm = false;
        this.profileForm.reset({
          name: "",
          location: "",
          description: "",
          capacityKwp: "",
          installYear: ""
        });
        return;
      }

      const profile = await this.producerProfileService.getFullProfile(account);
      this.currentProfile = profile;
      this.showCreateForm = true;
      this.patchFormFromCurrentProfile();
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.hasProfile = false;
      this.currentProfile = null;
    } finally {
      this.loading = false;
    }
  }

  private patchFormFromCurrentProfile(): void {
    const profile = this.currentProfile;
    if (!profile) {
      return;
    }

    this.profileForm.patchValue({
      name: profile.name,
      location: profile.location,
      description: profile.description,
      capacityKwp: String(profile.capacityKwp),
      installYear: String(profile.installYear)
    });
  }

  private setSelectedImage(file: File): void {
    const validation = this.ipfsService.validateImageFile(file);
    if (!validation.valid) {
      this.snackBar.open(validation.error || "Image invalide", "Fermer", {
        duration: 3500,
        panelClass: ["solar-snackbar", "solar-snackbar--error"]
      });
      return;
    }

    this.selectedImageFile = file;
    this.selectedImagePreview = URL.createObjectURL(file);
  }
}
