import { BaseEntity } from "../../../../shared/domain/BaseEntity";

/**
 * Admin Entity - Rich Domain Model
 * Encapsulation: private fields with public getters
 * Business logic methods
 */
export class Admin extends BaseEntity {
  private _adminId!: number;
  private _email: string;
  private _fullName: string;
  private _authUid: string | null;
  private _isActive: boolean;
  private _lastLogin: Date | null;
  private _avatarUrl: string | null;

  constructor(data: {
    adminId?: number;
    email: string;
    fullName: string;
    authUid?: string | null;
    isActive?: boolean;
    lastLogin?: Date | null;
    avatarUrl?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(
      data.adminId?.toString() || `temp-${Date.now()}`,
      data.createdAt,
      data.updatedAt
    );
    this._email = data.email;
    this._fullName = data.fullName;
    this._authUid = data.authUid || null;
    this._isActive = data.isActive ?? true;
    this._lastLogin = data.lastLogin || null;
    this._avatarUrl = data.avatarUrl || null;
    
    if (data.adminId) {
      this._adminId = data.adminId;
    }
  }

  // Getters (Encapsulation)
  get adminId(): number {
    return this._adminId;
  }

  get email(): string {
    return this._email;
  }

  get fullName(): string {
    return this._fullName;
  }

  get authUid(): string | null {
    return this._authUid;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastLogin(): Date | null {
    return this._lastLogin;
  }

  get avatarUrl(): string | null {
    return this._avatarUrl;
  }

  // Business Logic Methods
  public activate(): void {
    if (this._isActive) {
      throw new Error("Admin is already active");
    }
    this._isActive = true;
  }

  public deactivate(): void {
    if (!this._isActive) {
      throw new Error("Admin is already inactive");
    }
    this._isActive = false;
  }

  public updateLastLogin(): void {
    this._lastLogin = new Date();
  }

  public linkAuthAccount(authUid: string): void {
    if (this._authUid) {
      throw new Error("Admin already linked to an auth account");
    }
    this._authUid = authUid;
  }

  public canAccess(): boolean {
    return this._isActive;
  }

  // Validation
  public validate(): boolean {
    if (!this._email || !this._email.includes("@")) {
      throw new Error("Invalid email format");
    }
    if (!this._fullName || this._fullName.trim().length === 0) {
      throw new Error("Full name is required");
    }
    return true;
  }

  // Convert to plain object for serialization
  public toJSON(): Record<string, any> {
    return {
      adminId: this._adminId,
      email: this._email,
      fullName: this._fullName,
      authUid: this._authUid,
      isActive: this._isActive,
      lastLogin: this._lastLogin,
      avatarUrl: this._avatarUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
