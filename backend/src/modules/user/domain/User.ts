import { BaseEntity } from '../../../shared/domain/BaseEntity';
import { Email } from './Email';

export interface UserProps {
  id: string;
  email: string | Email;
  fullName: string;
  username: string;
  gender?: string;
  phone?: string;
  birthDate?: Date;
  avatarUrl?: string;
  isActive?: boolean;
  authUid: string; // Supabase Auth UID - REQUIRED in DB
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends BaseEntity {
  public readonly email: Email;
  public readonly fullName: string;
  public readonly username: string;
  public readonly gender?: string;
  public readonly phone?: string;
  public readonly birthDate?: Date;
  public readonly avatarUrl?: string;
  public readonly isActive: boolean;
  public readonly authUid: string; // Required - Supabase Auth UID

  constructor(props: UserProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.email = props.email instanceof Email ? props.email : new Email(props.email);
    this.fullName = props.fullName;
    this.username = props.username;
    this.gender = props.gender;
    this.phone = props.phone;
    this.birthDate = props.birthDate;
    this.avatarUrl = props.avatarUrl;
    this.isActive = props.isActive !== false;
    this.authUid = props.authUid;
  }

  public static create(props: Omit<UserProps, 'id'>): User {
    const id = crypto.randomUUID();
    return new User({ ...props, id });
  }

  public static createFromGoogle(props: { email: string; fullName: string; authUid: string }): User {
    const id = crypto.randomUUID();
    const username = props.fullName.toLowerCase().replace(/\s+/g, '') + '_' + Math.random().toString(36).substr(2, 4);
    return new User({
      id,
      email: props.email,
      fullName: props.fullName,
      username,
      authUid: props.authUid,
      isActive: true,
    });
  }

  public updateProfile(fullName: string, phone?: string, gender?: string, birthDate?: Date): User {
    return new User({
      id: this.id,
      email: this.email,
      fullName,
      username: this.username,
      gender: gender || this.gender,
      phone: phone || this.phone,
      birthDate: birthDate || this.birthDate,
      avatarUrl: this.avatarUrl,
      isActive: this.isActive,
      authUid: this.authUid,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  public verifyEmail(): User {
    // Email verification is handled by Supabase Auth, not in public.users table
    // This method is kept for backward compatibility but doesn't change anything
    return this;
  }

  public updateAvatar(avatarUrl: string): User {
    return new User({
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      username: this.username,
      gender: this.gender,
      phone: this.phone,
      birthDate: this.birthDate,
      avatarUrl,
      isActive: this.isActive,
      authUid: this.authUid,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  public deactivate(): User {
    return new User({
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      username: this.username,
      gender: this.gender,
      phone: this.phone,
      birthDate: this.birthDate,
      avatarUrl: this.avatarUrl,
      isActive: false,
      authUid: this.authUid,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  public updateLastLogin(): User {
    // Last login is tracked in Supabase Auth, not in public.users
    // Return a new instance with updated timestamp
    return new User({
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      username: this.username,
      gender: this.gender,
      phone: this.phone,
      birthDate: this.birthDate,
      avatarUrl: this.avatarUrl,
      isActive: this.isActive,
      authUid: this.authUid,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      email: this.email.getValue(),
      fullName: this.fullName,
      username: this.username,
      gender: this.gender,
      phone: this.phone,
      birthDate: this.birthDate,
      avatarUrl: this.avatarUrl,
      isActive: this.isActive,
      authUid: this.authUid,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}