import { BaseEntity } from '../../../shared/domain/BaseEntity';

export interface UserProps {
  id: string;
  email: string;
  name: string;
  role?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends BaseEntity {
  public readonly email: string;
  public readonly name: string;
  public readonly role: string;
  public readonly isActive: boolean;

  constructor(props: UserProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.email = props.email;
    this.name = props.name;
    this.role = props.role || 'user';
    this.isActive = props.isActive !== false;
  }

  public static create(props: Omit<UserProps, 'id'>): User {
    const id = crypto.randomUUID();
    return new User({ ...props, id });
  }

  public updateProfile(name: string): User {
    return new User({
      id: this.id,
      email: this.email,
      name,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  public deactivate(): User {
    return new User({
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      isActive: false,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}