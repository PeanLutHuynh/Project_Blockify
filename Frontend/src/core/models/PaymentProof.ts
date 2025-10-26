/**
 * PaymentProof Model - Frontend
 * OOP Model for Payment Proof data with Encapsulation
 */
export class PaymentProof {
  private _proofId: number;
  private _orderId: number;
  private _userId: number;
  private _fileUrl: string;
  private _fileType?: string;
  private _note?: string;
  private _status: PaymentProofStatus;
  private _reviewedBy?: number;
  private _reviewedAt?: Date;
  private _createdAt: Date;
  private _updatedAt?: Date;

  constructor(data: any) {
    this._proofId = data.proof_id;
    this._orderId = data.order_id;
    this._userId = data.user_id;
    this._fileUrl = data.file_url;
    this._fileType = data.file_type;
    this._note = data.note;
    this._status = data.status || "pending";
    this._reviewedBy = data.reviewed_by;
    this._reviewedAt = data.reviewed_at ? new Date(data.reviewed_at) : undefined;
    this._createdAt = new Date(data.created_at);
    this._updatedAt = data.updated_at ? new Date(data.updated_at) : undefined;
  }

  // Getters (Encapsulation)
  get proofId(): number {
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

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  // Business logic methods
  public isPending(): boolean {
    return this._status === "pending";
  }

  public isAccepted(): boolean {
    return this._status === "accepted";
  }

  public isRejected(): boolean {
    return this._status === "rejected";
  }

  public getStatusText(): string {
    switch (this._status) {
      case "pending":
        return "Chờ duyệt";
      case "accepted":
        return "Đã chấp nhận";
      case "rejected":
        return "Đã từ chối";
      default:
        return this._status;
    }
  }

  public getStatusBadgeClass(): string {
    switch (this._status) {
      case "pending":
        return "badge-warning";
      case "accepted":
        return "badge-success";
      case "rejected":
        return "badge-danger";
      default:
        return "badge-secondary";
    }
  }

  public formatCreatedAt(): string {
    return this._createdAt.toLocaleString("vi-VN");
  }

  public isImage(): boolean {
    return this._fileType?.startsWith("image/") || false;
  }

  public isPDF(): boolean {
    return this._fileType === "application/pdf";
  }
}

// Types
export type PaymentProofStatus = "pending" | "accepted" | "rejected";
