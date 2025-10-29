import { BaseEntity } from "../../../../shared/domain/BaseEntity";

export enum AdminAction {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  VIEW = "VIEW",
  LOGIN_FAILED = "LOGIN_FAILED",
  UPDATE_ORDER_STATUS = "UPDATE_ORDER_STATUS",
  UPDATE_PAYMENT_STATUS = "UPDATE_PAYMENT_STATUS",
  CANCEL_ORDER = "CANCEL_ORDER",
  PROCESS_REFUND = "PROCESS_REFUND",
}

export class AdminAuditLog extends BaseEntity {
  private _logId!: number;
  private _adminId: number;
  private _action: AdminAction;
  private _targetType: string;
  private _targetId: string | null;
  private _payload: Record<string, any>;

  constructor(data: {
    logId?: number;
    adminId: number;
    action: AdminAction;
    targetType: string;
    targetId?: string | null;
    payload?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(
      data.logId?.toString() || `temp-${Date.now()}`,
      data.createdAt,
      data.updatedAt
    );
    this._adminId = data.adminId;
    this._action = data.action;
    this._targetType = data.targetType;
    this._targetId = data.targetId || null;
    this._payload = data.payload || {};
    
    if (data.logId) {
      this._logId = data.logId;
    }
  }

  get logId(): number {
    return this._logId;
  }

  get adminId(): number {
    return this._adminId;
  }

  get action(): AdminAction {
    return this._action;
  }

  get targetType(): string {
    return this._targetType;
  }

  get targetId(): string | null {
    return this._targetId;
  }

  get payload(): Record<string, any> {
    return this._payload;
  }

  public toJSON(): Record<string, any> {
    return {
      logId: this._logId,
      adminId: this._adminId,
      action: this._action,
      targetType: this._targetType,
      targetId: this._targetId,
      payload: this._payload,
      createdAt: this.createdAt,
    };
  }
}
