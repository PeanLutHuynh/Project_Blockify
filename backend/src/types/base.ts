import { HttpRequest, HttpResponse } from '../infrastructure/http/types';
import { ApiResponse, ServiceResponse, ValidationErrors } from './common';

// Base Error Class for Error Hierarchy
export abstract class BaseError extends Error {
    public abstract statusCode: number;
    public abstract isOperational: boolean;
    
    constructor(message: string, public cause?: Error) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
    
    abstract toJSON(): object;
}

export class ValidationError extends BaseError {
    public statusCode = 400;
    public isOperational = true;
    
    constructor(message: string, public errors: ValidationErrors) {
        super(message);
    }
    
    toJSON(): object {
        return {
            type: 'ValidationError',
            message: this.message,
            errors: this.errors,
            statusCode: this.statusCode
        };
    }
}

export class DatabaseError extends BaseError {
    public statusCode = 500;
    public isOperational = false;
    
    constructor(message: string, cause?: Error) {
        super(message, cause);
    }
    
    toJSON(): object {
        return {
            type: 'DatabaseError',
            message: this.message,
            statusCode: this.statusCode
        };
    }
}

export class NotFoundError extends BaseError {
    public statusCode = 404;
    public isOperational = true;
    
    constructor(resource: string, id?: string) {
        super(`${resource}${id ? ` with id ${id}` : ''} not found`);
    }
    
    toJSON(): object {
        return {
            type: 'NotFoundError',
            message: this.message,
            statusCode: this.statusCode
        };
    }
}

// Base Controller - Abstract class for all controllers (MVC Pattern)
export abstract class BaseController {
    protected sendSuccess<T>(
        res: HttpResponse, 
        data: T, 
        message = 'Operation successful',
        meta?: Record<string, any>
    ): void {
        const response: ApiResponse<T> = {
            success: true,
            message,
            data,
            meta: {
                timestamp: new Date().toISOString(),
                ...meta
            }
        };
        res.json(response);
    }
    
    protected sendError(
        res: HttpResponse, 
        error: BaseError | string, 
        statusCode?: number
    ): void {
        let errorResponse: ApiResponse;
        
        if (error instanceof BaseError) {
            errorResponse = {
                success: false,
                message: 'Operation failed',
                error: error.message,
                meta: {
                    timestamp: new Date().toISOString(),
                    type: error.constructor.name,
                    ...(error instanceof ValidationError && { errors: error.errors })
                }
            };
            statusCode = error.statusCode;
        } else {
            errorResponse = {
                success: false,
                message: 'Operation failed',
                error: error,
                meta: {
                    timestamp: new Date().toISOString()
                }
            };
        }
        
        res.status(statusCode || 500);
        res.json(errorResponse);
    }
    
    protected sendPaginatedResponse<T>(
        res: HttpResponse,
        data: T[],
        page: number,
        limit: number,
        total: number,
        message = 'Data retrieved successfully'
    ): void {
        const totalPages = Math.ceil(total / limit);
        
        const response: ApiResponse<T[]> = {
            success: true,
            message,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        
        res.json(response);
    }
    
    protected abstract validateRequest(req: HttpRequest): boolean;
    
    // Common error handling
    protected handleError(res: HttpResponse, error: unknown): void {
        if (error instanceof BaseError) {
            this.sendError(res, error);
        } else if (error instanceof Error) {
            this.sendError(res, new DatabaseError(error.message, error));
        } else {
            this.sendError(res, 'An unexpected error occurred', 500);
        }
    }
}

// Base Service - Abstract class for business logic layer
export abstract class BaseService<T> {
    abstract findAll(options?: any): Promise<ServiceResponse<T[]>>;
    abstract findById(id: string): Promise<ServiceResponse<T>>;
    abstract create(data: any): Promise<ServiceResponse<T>>;
    abstract update(id: string, data: any): Promise<ServiceResponse<T>>;
    abstract delete(id: string): Promise<ServiceResponse<boolean>>;
    
    abstract validate(data: any): ValidationErrors | null;
    
    protected createSuccessResponse<R>(data: R, message?: string): ServiceResponse<R> {
        return {
            success: true,
            data,
            ...(message && { message })
        };
    }
    
    protected createErrorResponse(error: string, errors?: ValidationErrors): ServiceResponse {
        return {
            success: false,
            error,
            ...(errors && { errors })
        };
    }
    
    // Common validation helper
    protected hasValidationErrors(data: any): ValidationErrors | null {
        return this.validate(data);
    }
    
    protected async beforeCreate(data: any): Promise<any> {
        return data;
    }
    
    protected async afterCreate(entity: T): Promise<T> {
        return entity;
    }
    
    protected async beforeUpdate(id: string, data: any): Promise<any> {
        return data;
    }
    
    protected async afterUpdate(entity: T): Promise<T> {
        return entity;
    }
}

// Base Model - Abstract class for domain entities
export abstract class BaseModel {
    public id: string;
    public createdAt: Date;
    public updatedAt: Date;
    
    constructor(data: any) {
        this.id = data.id;
        this.createdAt = data.created_at ? new Date(data.created_at) : new Date();
        this.updatedAt = data.updated_at ? new Date(data.updated_at) : new Date();
    }
    
    abstract toJSON(): object;
    
    protected updateTimestamp(): void {
        this.updatedAt = new Date();
    }
    
    // Common validation method
    public isValid(): boolean {
        return !!this.id;
    }
    
    public toString(): string {
        return `${this.constructor.name}#${this.id}`;
    }
}

// Base Repository Interface for Data Access Layer
export interface IBaseRepository<T> {
    findAll(options?: any): Promise<T[]>;
    findById(id: string): Promise<T | null>;
    create(data: any): Promise<T>;
    update(id: string, data: any): Promise<T>;
    delete(id: string): Promise<boolean>;
    count(options?: any): Promise<number>;
}

// Abstract Repository implementing common patterns
export abstract class BaseRepository<T> implements IBaseRepository<T> {
    abstract findAll(options?: any): Promise<T[]>;
    abstract findById(id: string): Promise<T | null>;
    abstract create(data: any): Promise<T>;
    abstract update(id: string, data: any): Promise<T>;
    abstract delete(id: string): Promise<boolean>;
    abstract count(options?: any): Promise<number>;
    
    protected handleDatabaseError(error: unknown): never {
        if (error instanceof Error) {
            throw new DatabaseError(`Database operation failed: ${error.message}`, error);
        }
        throw new DatabaseError('Unknown database error occurred');
    }
    
    // Common pagination helper
    protected calculatePagination(page: number, limit: number) {
        const offset = (page - 1) * limit;
        return { offset, limit };
    }
}

// Interface for services that need notification capabilities
export interface INotificationService {
    send(recipient: string, message: string, subject?: string): Promise<void>;
}

// Interface for payment processing
export interface IPaymentProcessor {
    processPayment(amount: number, paymentDetails: any): Promise<{ success: boolean; transactionId?: string; error?: string }>;
    refundPayment(transactionId: string, amount?: number): Promise<{ success: boolean; refundId?: string; error?: string }>;
}

export type EntityId = string;
export type Timestamp = Date;

// Utility type for making properties optional except id
export type UpdateData<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// Utility type for creation data
export type CreateData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;