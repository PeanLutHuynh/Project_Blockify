import { HttpRequest, HttpResponse } from '../../../infrastructure/http/types';
import { BaseController } from '../../../shared/infrastructure/BaseController';
import { UserService } from '../application/UserService';
import { User } from '../domain/User';

export class UserController extends BaseController<User> {
  private userService: UserService;

  constructor(userService: UserService) {
    super(userService);
    this.userService = userService;
  }

  async getUserByEmail(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const { email } = req.params;
      const user = await this.userService.findByEmail(email);
      
      if (!user) {
        this.sendResponse(res, 404, undefined, undefined, 'User not found');
        return;
      }

      this.sendResponse(res, 200, user, 'User retrieved successfully');
    } catch (error) {
      this.sendResponse(res, 500, undefined, undefined, (error as Error).message);
    }
  }

  async createUser(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const { email, name, role } = req.body;
      
      if (!email || !name) {
        this.sendResponse(res, 400, undefined, undefined, 'Email and name are required');
        return;
      }

      const user = await this.userService.createUser({ email, username: name, fullName: name, role });
      this.sendResponse(res, 201, user, 'User created successfully');
    } catch (error) {
      this.sendResponse(res, 400, undefined, undefined, (error as Error).message);
    }
  }

  async updateUserProfile(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const { id } = req.params;
      const { fullName, phone, gender, birthDate, avatarUrl } = req.body;
      
      const updates: any = {};
      if (fullName) updates.fullName = fullName;
      if (phone) updates.phone = phone;
      if (gender) updates.gender = gender;
      if (birthDate) updates.birthDate = new Date(birthDate);
      if (avatarUrl) updates.avatarUrl = avatarUrl;

      if (Object.keys(updates).length === 0) {
        this.sendResponse(res, 400, undefined, undefined, 'No update fields provided');
        return;
      }

      const user = await this.userService.updateUserProfile(id, updates);
      this.sendResponse(res, 200, user, 'User profile updated successfully');
    } catch (error) {
      this.sendResponse(res, 400, undefined, undefined, (error as Error).message);
    }
  }

  async getCurrentUserProfile(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      // Get user ID from authenticated request (set by auth middleware)
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        this.sendResponse(res, 401, undefined, undefined, 'Unauthorized');
        return;
      }

      const user = await this.userService.findById(userId);
      
      if (!user) {
        this.sendResponse(res, 404, undefined, undefined, 'User not found');
        return;
      }

      this.sendResponse(res, 200, user, 'User profile retrieved successfully');
    } catch (error) {
      this.sendResponse(res, 500, undefined, undefined, (error as Error).message);
    }
  }

  async deactivateUser(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.deactivateUser(id);
      this.sendResponse(res, 200, user, 'User deactivated successfully');
    } catch (error) {
      this.sendResponse(res, 400, undefined, undefined, (error as Error).message);
    }
  }

  async getActiveUsers(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const users = await this.userService.getActiveUsers();
      this.sendResponse(res, 200, users, 'Active users retrieved successfully');
    } catch (error) {
      this.sendResponse(res, 500, undefined, undefined, (error as Error).message);
    }
  }
}