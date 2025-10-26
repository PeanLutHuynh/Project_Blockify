import { BaseEntity } from "../../../../shared/domain/BaseEntity";

/**
 * PaymentProof Entity - Domain Layer
 * Represents payment proof uploaded by user for non-COD payments
 * Follows OOP principles: Encapsulation, Abstraction, Inheritance
 */
export class PaymentProof extends BaseEntity {
  private _proofId?: number;
  private _orderId: number;
  private _userId: number;
  private _fileUrl: string;
  private _fileType?: string;
  private _note?: string;
  private _status: PaymentProofStatus;
  private _reviewedBy?: number;
  private _reviewedAt?: Date;

  constructor(data: {
    proofId?: number;
    orderId: number;
    userId: number;
    fileUrl: string;
    fileType?: string;
    note?: string;
    status?: PaymentProofStatus;
    reviewedBy?: number;
    reviewedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(data.proofId?.toString() ?? `temp-${Date.now()}`, data.createdAt, data.updatedAt);
    this._proofId = data.proofId;
    this._orderId = data.orderId;
    this._userId = data.userId;
    this._fileUrl = data.fileUrl;
    this._fileType = data.fileType;
    this._note = data.note;
    this._status = data.status ?? "pending";
    this._reviewedBy = data.reviewedBy;
    this._reviewedAt = data.reviewedAt;

    this.validate();
  }

  // Getters (Encapsulation)
  get proofId(): number | undefined {
    return this._proofId;
  }

  get orderId(): number {
    return this._orderId;
  }

  get userId(): number {
    return this._userId;
  }

  get fileUrl(): string {
    return this._fileUrl;
  }

  get fileType(): string | undefined {
    return this._fileType;
  }

  get note(): string | undefined {
    return this._note;
  }

  get status(): PaymentProofStatus {
    return this._status;
  }

  get reviewedBy(): number | undefined {
    return this._reviewedBy;
  }

  get reviewedAt(): Date | undefined {
    return this._reviewedAt;
  }

  // Getters for timestamps from BaseEntity
  // createdAt and updatedAt are inherited from BaseEntity

  // Business Logic Methods
  public isPending(): boolean {
    return this._status === "pending";
  }

  public isAccepted(): boolean {
    return this._status === "accepted";
  }

  public isRejected(): boolean {
    return this._status === "rejected";
  }

  public accept(reviewedBy: number): void {
    if (!this.isPending()) {
      throw new Error("Only pending proofs can be accepted");
    }
    this._status = "accepted";
    this._reviewedBy = reviewedBy;
    this._reviewedAt = new Date();
  }

  public reject(reviewedBy: number, note?: string): void {
    if (!this.isPending()) {
      throw new Error("Only pending proofs can be rejected");
    }
    this._status = "rejected";
    this._reviewedBy = reviewedBy;
    this._reviewedAt = new Date();
    if (note) {
      this._note = note;
    }
  }

  // Validation
  private validate(): void {
    if (!this._orderId || this._orderId <= 0) {
      throw new Error("Order ID is required");
    }
    if (!this._userId || this._userId <= 0) {
      throw new Error("User ID is required");
    }
    if (!this._fileUrl || this._fileUrl.trim().length === 0) {
      throw new Error("File URL is required");
    }
    if (this._fileType && !this.isValidFileType(this._fileType)) {
      throw new Error("Invalid file type. Only images and PDF are allowed");
    }
  }

  private isValidFileType(fileType: string): boolean {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    return allowedTypes.includes(fileType.toLowerCase());
  }

  // Convert to plain object for repository
  public toObject(): any {
    const obj: any = {
      order_id: this._orderId,
      user_id: this._userId,
      file_url: this._fileUrl,
      file_type: this._fileType,
      note: this._note,
      status: this._status,
      reviewed_by: this._reviewedBy,
      reviewed_at: this._reviewedAt,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };

    // Only include proof_id if exists (for updates, not inserts)
    if (this._proofId !== undefined) {
      obj.proof_id = this._proofId;
    }

    return obj;
  }

  // Implement abstract method from BaseEntity
  public toJSON(): Record<string, any> {
    return this.toObject();
  }
}

// Types
export type PaymentProofStatus = "pending" | "accepted" | "rejected";
