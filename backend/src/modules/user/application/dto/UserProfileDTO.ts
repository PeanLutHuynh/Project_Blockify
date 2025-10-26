/**
 * User Profile DTOs (Commands and Responses)
 * Application Layer - Clean Architecture
 */

/**
 * Update Profile Command
 */
export class UpdateProfileCommand {
  constructor(
    public readonly userId: string,
    public readonly fullName?: string,
    public readonly phone?: string,
    public readonly gender?: string,
    public readonly birthDate?: Date,
    public readonly avatarUrl?: string
  ) {}

  validate(): string[] {
    const errors: string[] = [];

    if (!this.userId) {
      errors.push("User ID is required");
    }

    // Validate full name
    if (this.fullName !== undefined) {
      if (this.fullName.trim().length < 2) {
        errors.push("Full name must be at least 2 characters");
      }
      if (this.fullName.length > 100) {
        errors.push("Full name must not exceed 100 characters");
      }
    }

    // Validate phone format (Vietnam)
    if (this.phone && !this.isValidPhone(this.phone)) {
      errors.push("Invalid phone number format. Must be Vietnamese phone (10 digits, starts with 0)");
    }

    // Validate gender
    if (this.gender && !['male', 'female', 'other'].includes(this.gender.toLowerCase())) {
      errors.push("Gender must be 'male', 'female', or 'other'");
    }

    // Validate birth date
    if (this.birthDate) {
      const birthDateErrors = this.validateBirthDate(this.birthDate);
      errors.push(...birthDateErrors);
    }

    return errors;
  }

  private isValidPhone(phone: string): boolean {
    // Vietnam phone: 10 digits, starts with 0
    // Examples: 0987654321, 0123456789
    const phoneRegex = /^0\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  private validateBirthDate(date: Date): string[] {
    const errors: string[] = [];
    const today = new Date();
    
    if (date > today) {
      errors.push("Birth date cannot be in the future");
    }
    
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate()) 
      ? age - 1 
      : age;
    
    if (adjustedAge < 13) {
      errors.push("User must be at least 13 years old");
    }
    
    if (adjustedAge > 150) {
      errors.push("Invalid birth date");
    }
    
    return errors;
  }
}

/**
 * Add Address Command
 */
export class AddAddressCommand {
  constructor(
    public readonly userId: string,
    public readonly addressName: string,
    public readonly fullAddress: string,
    public readonly city: string,
    public readonly district: string,
    public readonly ward: string,
    public readonly postalCode?: string,
    public readonly isDefault: boolean = false
  ) {}

  validate(): string[] {
    const errors: string[] = [];

    if (!this.userId) {
      errors.push("User ID is required");
    }

    if (!this.addressName || this.addressName.trim().length === 0) {
      errors.push("Address name is required");
    }
    
    if (this.addressName && this.addressName.length > 100) {
      errors.push("Address name must not exceed 100 characters");
    }

    if (!this.fullAddress || this.fullAddress.trim().length === 0) {
      errors.push("Full address is required");
    }
    
    if (this.fullAddress && this.fullAddress.length > 255) {
      errors.push("Full address must not exceed 255 characters");
    }

    if (!this.city) {
      errors.push("City is required");
    }

    if (!this.district) {
      errors.push("District is required");
    }

    if (!this.ward) {
      errors.push("Ward is required");
    }

    // Validate postal code format (Vietnam)
    if (this.postalCode && !this.isValidPostalCode(this.postalCode)) {
      errors.push("Invalid postal code format. Must be 6 digits");
    }

    return errors;
  }

  private isValidPostalCode(code: string): boolean {
    // Vietnam postal code: 6 digits
    return /^\d{6}$/.test(code);
  }
}

/**
 * Update Address Command
 */
export class UpdateAddressCommand {
  constructor(
    public readonly addressId: string,
    public readonly userId: string,  // For authorization check
    public readonly addressName?: string,
    public readonly fullAddress?: string,
    public readonly city?: string,
    public readonly district?: string,
    public readonly ward?: string,
    public readonly postalCode?: string
  ) {}

  validate(): string[] {
    const errors: string[] = [];

    if (!this.addressId) {
      errors.push("Address ID is required");
    }

    if (!this.userId) {
      errors.push("User ID is required");
    }

    if (this.addressName !== undefined && this.addressName.trim().length === 0) {
      errors.push("Address name cannot be empty");
    }

    if (this.fullAddress !== undefined && this.fullAddress.trim().length === 0) {
      errors.push("Full address cannot be empty");
    }

    if (this.postalCode && !/^\d{6}$/.test(this.postalCode)) {
      errors.push("Invalid postal code format");
    }

    return errors;
  }
}

/**
 * Search Users Command (Admin only)
 */
export class SearchUsersCommand {
  constructor(
    public readonly searchTerm: string = '',
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly filter?: {
      isActive?: boolean;
      gender?: string;
      city?: string;
    }
  ) {}

  validate(): string[] {
    const errors: string[] = [];

    if (this.page < 1) {
      errors.push("Page must be at least 1");
    }

    if (this.limit < 1 || this.limit > 100) {
      errors.push("Limit must be between 1 and 100");
    }

    if (this.searchTerm && this.searchTerm.length > 255) {
      errors.push("Search term too long");
    }

    return errors;
  }

  getOffset(): number {
    return (this.page - 1) * this.limit;
  }
}

/**
 * Generic Response DTO
 */
export class UserProfileResponse {
  constructor(
    public readonly success: boolean,
    public readonly message: string,
    public readonly data?: any,
    public readonly errors?: string[]
  ) {}

  public static success(data: any, message: string = "Success"): UserProfileResponse {
    return new UserProfileResponse(true, message, data);
  }

  public static failure(message: string, errors?: string[]): UserProfileResponse {
    return new UserProfileResponse(false, message, undefined, errors);
  }
}
