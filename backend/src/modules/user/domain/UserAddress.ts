/**
 * UserAddress Domain Model
 * Following Clean Architecture - Domain Layer
 */

import { BaseEntity } from '../../../shared/domain/BaseEntity';

export interface UserAddressProps {
  id: string;
  userId: string;
  addressName: string;
  fullAddress: string;
  city: string;
  district: string;
  ward: string;
  postalCode?: string;
  isDefault: boolean;
  createdAt?: Date;
}

export class UserAddress extends BaseEntity {
  public readonly userId: string;
  public readonly addressName: string;
  public readonly fullAddress: string;
  public readonly city: string;
  public readonly district: string;
  public readonly ward: string;
  public readonly postalCode?: string;
  public readonly isDefault: boolean;

  constructor(props: UserAddressProps) {
    super(props.id, props.createdAt);
    this.userId = props.userId;
    this.addressName = props.addressName;
    this.fullAddress = props.fullAddress;
    this.city = props.city;
    this.district = props.district;
    this.ward = props.ward;
    this.postalCode = props.postalCode;
    this.isDefault = props.isDefault;
  }

  /**
   * Factory method to create new address
   */
  public static create(props: Omit<UserAddressProps, 'id'>): UserAddress {
    const id = crypto.randomUUID();
    return new UserAddress({ ...props, id });
  }

  /**
   * Set this address as default
   */
  public setAsDefault(): UserAddress {
    return new UserAddress({
      ...this.toJSON(),
      isDefault: true
    });
  }

  /**
   * Unset default status
   */
  public unsetDefault(): UserAddress {
    return new UserAddress({
      ...this.toJSON(),
      isDefault: false
    });
  }

  /**
   * Update address details
   */
  public update(props: {
    addressName?: string;
    fullAddress?: string;
    city?: string;
    district?: string;
    ward?: string;
    postalCode?: string;
  }): UserAddress {
    return new UserAddress({
      id: this.id,
      userId: this.userId,
      addressName: props.addressName || this.addressName,
      fullAddress: props.fullAddress || this.fullAddress,
      city: props.city || this.city,
      district: props.district || this.district,
      ward: props.ward || this.ward,
      postalCode: props.postalCode !== undefined ? props.postalCode : this.postalCode,
      isDefault: this.isDefault,
      createdAt: this.createdAt
    });
  }

  /**
   * Get full formatted address
   */
  public getFormattedAddress(): string {
    return `${this.fullAddress}, ${this.ward}, ${this.district}, ${this.city}`;
  }

  /**
   * Check if address is complete
   */
  public isComplete(): boolean {
    return !!(
      this.addressName &&
      this.fullAddress &&
      this.city &&
      this.district &&
      this.ward
    );
  }

  /**
   * Convert to JSON for API responses
   */
  public toJSON(): UserAddressProps {
    return {
      id: this.id,
      userId: this.userId,
      addressName: this.addressName,
      fullAddress: this.fullAddress,
      city: this.city,
      district: this.district,
      ward: this.ward,
      postalCode: this.postalCode,
      isDefault: this.isDefault,
      createdAt: this.createdAt
    };
  }

  /**
   * Convert to database format
   */
  public toDatabaseFormat(): any {
    return {
      user_id: this.userId,
      address_name: this.addressName,
      full_address: this.fullAddress,
      city: this.city,
      district: this.district,
      ward: this.ward,
      postal_code: this.postalCode,
      is_default: this.isDefault,
      created_at: this.createdAt
    };
  }

  /**
   * Create from database row
   */
  public static fromDatabase(row: any): UserAddress {
    return new UserAddress({
      id: row.address_id?.toString() || crypto.randomUUID(),
      userId: row.user_id?.toString(),
      addressName: row.address_name,
      fullAddress: row.full_address,
      city: row.city,
      district: row.district,
      ward: row.ward,
      postalCode: row.postal_code,
      isDefault: row.is_default || false,
      createdAt: row.created_at ? new Date(row.created_at) : undefined
    });
  }
}
