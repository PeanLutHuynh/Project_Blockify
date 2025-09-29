export class User {
  private _id: string;
  private _email: string;
  private _fullName: string;
  private _username: string;
  private _gender?: string;
  private _phone?: string;
  private _birthDate?: Date;
  private _avatarUrl?: string;
  private _emailVerified: boolean;
  private _isActive: boolean;
  private _createdAt?: Date;
  private _updatedAt?: Date;

  constructor(data: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    gender?: string;
    phone?: string;
    birthDate?: Date | string;
    avatarUrl?: string;
    emailVerified?: boolean;
    isActive?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  }) {
    this._id = data.id;
    this._email = data.email;
    this._fullName = data.fullName;
    this._username = data.username;
    this._gender = data.gender;
    this._phone = data.phone;
    this._birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate;
    this._avatarUrl = data.avatarUrl;
    this._emailVerified = data.emailVerified ?? false;
    this._isActive = data.isActive ?? true;
    this._createdAt = typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt;
    this._updatedAt = typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt;
  }

  // Encapsulation: Getters
  public get id(): string {
    return this._id;
  }

  public get email(): string {
    return this._email;
  }

  public get fullName(): string {
    return this._fullName;
  }

  public get username(): string {
    return this._username;
  }

  public get gender(): string | undefined {
    return this._gender;
  }

  public get phone(): string | undefined {
    return this._phone;
  }

  public get birthDate(): Date | undefined {
    return this._birthDate;
  }

  public get avatarUrl(): string | undefined {
    return this._avatarUrl;
  }

  public get emailVerified(): boolean {
    return this._emailVerified;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get createdAt(): Date | undefined {
    return this._createdAt;
  }

  public get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  // Business logic methods
  public getDisplayName(): string {
    return this._fullName || this._username;
  }

  public getInitials(): string {
    return this._fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  public isEmailVerified(): boolean {
    return this._emailVerified;
  }

  public getAge(): number | null {
    if (!this._birthDate) return null;
    
    const today = new Date();
    const birthYear = this._birthDate.getFullYear();
    const birthMonth = this._birthDate.getMonth();
    const birthDay = this._birthDate.getDate();
    
    let age = today.getFullYear() - birthYear;
    
    if (today.getMonth() < birthMonth || 
        (today.getMonth() === birthMonth && today.getDate() < birthDay)) {
      age--;
    }
    
    return age;
  }

  public getProfileCompletion(): number {
    const fields = [
      this._fullName,
      this._email,
      this._phone,
      this._birthDate,
      this._gender,
      this._avatarUrl
    ];
    
    const completedFields = fields.filter(field => field && field !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  }

  // Abstraction: Hide complex validation logic
  public validateProfile(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this._email || !this.isValidEmail(this._email)) {
      errors.push('Invalid email address');
    }

    if (!this._fullName || this._fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }

    if (!this._username || this._username.trim().length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (this._phone && !this.isValidPhone(this._phone)) {
      errors.push('Invalid phone number format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
    return phoneRegex.test(phone);
  }

  // Factory method for creating user from API response
  public static fromApiResponse(data: any): User {
    return new User({
      id: data.id,
      email: data.email,
      fullName: data.fullName || data.full_name,
      username: data.username,
      gender: data.gender,
      phone: data.phone,
      birthDate: data.birthDate || data.birth_date,
      avatarUrl: data.avatarUrl || data.avatar_url,
      emailVerified: data.emailVerified || data.email_verified,
      isActive: data.isActive || data.is_active,
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at
    });
  }

  // Serialize for API requests
  public toApiRequest(): any {
    return {
      id: this._id,
      email: this._email,
      fullName: this._fullName,
      username: this._username,
      gender: this._gender,
      phone: this._phone,
      birthDate: this._birthDate?.toISOString(),
      avatarUrl: this._avatarUrl,
      emailVerified: this._emailVerified,
      isActive: this._isActive
    };
  }

  // Clone method for immutability
  public clone(): User {
    return new User({
      id: this._id,
      email: this._email,
      fullName: this._fullName,
      username: this._username,
      gender: this._gender,
      phone: this._phone,
      birthDate: this._birthDate,
      avatarUrl: this._avatarUrl,
      emailVerified: this._emailVerified,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    });
  }

  // Update methods that return new instances (immutability)
  public updateProfile(updates: {
    fullName?: string;
    phone?: string;
    gender?: string;
    birthDate?: Date;
  }): User {
    const clone = this.clone();
    if (updates.fullName !== undefined) clone._fullName = updates.fullName;
    if (updates.phone !== undefined) clone._phone = updates.phone;
    if (updates.gender !== undefined) clone._gender = updates.gender;
    if (updates.birthDate !== undefined) clone._birthDate = updates.birthDate;
    clone._updatedAt = new Date();
    return clone;
  }

  public updateAvatar(avatarUrl: string): User {
    const clone = this.clone();
    clone._avatarUrl = avatarUrl;
    clone._updatedAt = new Date();
    return clone;
  }

  public verifyEmail(): User {
    const clone = this.clone();
    clone._emailVerified = true;
    clone._updatedAt = new Date();
    return clone;
  }
}