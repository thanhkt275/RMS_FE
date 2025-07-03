import { IUserActivityService } from '../interfaces/index';
import { UserActivity } from '../types/index';

export class UserActivityService implements IUserActivityService {
  private activity: UserActivity = {
    isActive: false,
    timeout: null,
  };

  private activityTimeoutMs = 5000; // Default 5 seconds

  markUserActive(): void {
    this.activity.isActive = true;
    
    if (this.activity.timeout) {
      clearTimeout(this.activity.timeout);
    }
    
    this.activity.timeout = setTimeout(() => {
      this.activity.isActive = false;
      this.activity.timeout = null;
    }, this.activityTimeoutMs);
  }

  isUserActive(): boolean {
    return this.activity.isActive;
  }

  resetActivity(): void {
    this.activity.isActive = false;
    
    if (this.activity.timeout) {
      clearTimeout(this.activity.timeout);
      this.activity.timeout = null;
    }
  }

  setActivityTimeout(timeout: number): void {
    this.activityTimeoutMs = timeout;
  }
}
