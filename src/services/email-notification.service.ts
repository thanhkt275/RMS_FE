/**
 * Email Notification Service
 *
 * Comprehensive email service for sending tournament and stage notifications
 * to teams and participants.
 */

import { Tournament } from '@/types/tournament.types';
import { Stage } from '@/types/types';
import { Team } from '@/types/team.types';

// Email configuration interface
export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

// Email template types
export type EmailTemplateType =
| 'tournament_created'
| 'tournament_updated'
| 'stage_created'
| 'stage_updated'
| 'stage_schedule_notification'
| 'tournament_reminder'
| 'user_account_created'
  | 'bulk_user_creation';

// Email notification data interfaces
export interface TournamentNotificationData {
  tournament: Tournament;
  teams: Team[];
  changes?: string[];
}

export interface StageNotificationData {
stage: Stage;
tournament: Tournament;
teams: Team[];
changes?: string[];
}

export interface UserAccountCreationData {
  username: string;
  password: string;
  role: string;
  loginUrl?: string;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailRecipient {
  email: string;
  name: string;
  teamId?: string;
}

export interface EmailNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipientEmail: string;
}

/**
 * Email Notification Service Class
 */
export class EmailNotificationService {
  private config!: EmailConfig;
  private isConfigured: boolean = false;

  constructor(config?: EmailConfig) {
    if (config) {
      this.config = config;
      this.isConfigured = true;
    } else {
      // Load from environment variables
      this.loadConfigFromEnv();
    }
  }

  /**
   * Load email configuration from environment variables
   */
  private loadConfigFromEnv(): void {
    const requiredEnvVars = {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      smtpUser: process.env.SMTP_USER || process.env.EMAIL,
      smtpPassword: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
      fromEmail: process.env.FROM_EMAIL || process.env.EMAIL,
      fromName: process.env.FROM_NAME || 'Tournament Management System',
    };

    // Check if all required environment variables are present
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.warn(`[EmailService] Missing environment variables: ${missingVars.join(', ')}`);
      this.isConfigured = false;
      return;
    }

    this.config = {
      smtpHost: requiredEnvVars.smtpHost!,
      smtpPort: parseInt(requiredEnvVars.smtpPort || '587'),
      smtpSecure: requiredEnvVars.smtpPort === '465',
      smtpUser: requiredEnvVars.smtpUser!,
      smtpPassword: requiredEnvVars.smtpPassword!,
      fromEmail: requiredEnvVars.fromEmail!,
      fromName: requiredEnvVars.fromName!,
    };

    this.isConfigured = true;
  }

  /**
  * Check if email service is properly configured
  */
  public isReady(): boolean {
  return this.isConfigured;
  }

  /**
    * Get email service status with details
    */
  public getStatus(): { isConfigured: boolean; missingVars?: string[] } {
    if (this.isConfigured) {
      return { isConfigured: true };
    }

    // Check which variables are missing
    const requiredEnvVars = {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      smtpUser: process.env.SMTP_USER || process.env.EMAIL,
      smtpPassword: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
      fromEmail: process.env.FROM_EMAIL || process.env.EMAIL,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    return { isConfigured: false, missingVars };
  }

  /**
   * Send tournament schedule notification to teams
   */
  public async sendTournamentScheduleNotification(
    data: TournamentNotificationData
  ): Promise<EmailNotificationResult[]> {
    if (!this.isConfigured) {
      throw new Error('Email service is not configured');
    }

    const recipients = this.extractRecipientsFromTeams(data.teams);
    const template = this.generateTournamentScheduleTemplate(data);

    return this.sendBulkEmails(recipients, template);
  }

  /**
   * Send stage schedule notification to teams
   */
  public async sendStageScheduleNotification(
    data: StageNotificationData
  ): Promise<EmailNotificationResult[]> {
    if (!this.isConfigured) {
      throw new Error('Email service is not configured');
    }

    const recipients = this.extractRecipientsFromTeams(data.teams);
    const template = this.generateStageScheduleTemplate(data);

    return this.sendBulkEmails(recipients, template);
  }

  /**
   * Send tournament update notification
   */
  public async sendTournamentUpdateNotification(
    data: TournamentNotificationData
  ): Promise<EmailNotificationResult[]> {
    if (!this.isConfigured) {
      throw new Error('Email service is not configured');
    }

    const recipients = this.extractRecipientsFromTeams(data.teams);
    const template = this.generateTournamentUpdateTemplate(data);

    return this.sendBulkEmails(recipients, template);
  }

  /**
  * Send stage update notification
  */
  public async sendStageUpdateNotification(
  data: StageNotificationData
  ): Promise<EmailNotificationResult[]> {
  if (!this.isConfigured) {
  throw new Error('Email service is not configured');
  }

  const recipients = this.extractRecipientsFromTeams(data.teams);
  const template = this.generateStageUpdateTemplate(data);

  return this.sendBulkEmails(recipients, template);
  }

  /**
  * Send user account creation notification
  */
  public async sendUserAccountCreationNotification(
  recipientEmail: string,
  recipientName: string,
  data: UserAccountCreationData
  ): Promise<EmailNotificationResult> {
  if (!this.isConfigured) {
  throw new Error('Email service is not configured');
  }

  const recipient: EmailRecipient = {
  email: recipientEmail,
  name: recipientName,
  };

  const template = this.generateUserAccountCreationTemplate(data);

  return this.sendSingleEmail(recipient, template);
  }

  /**
    * Send bulk user creation notification with direct credentials
    */
  public async sendBulkUserCreationNotification(
    recipientEmail: string,
    recipientName: string,
    data: UserAccountCreationData
  ): Promise<EmailNotificationResult> {
    if (!this.isConfigured) {
      throw new Error('Email service is not configured');
    }

    const recipient: EmailRecipient = {
      email: recipientEmail,
      name: recipientName,
    };

    const template = this.generateBulkUserCreationTemplate(data);

    return this.sendSingleEmail(recipient, template);
  }

  /**
   * Extract email recipients from teams
   */
  private extractRecipientsFromTeams(teams: Team[]): EmailRecipient[] {
    const recipients: EmailRecipient[] = [];

    teams.forEach(team => {
      // Add team owner/captain email if available
      if (team.user?.email) {
        recipients.push({
          email: team.user.email,
          name: team.user.name || team.user.username,
          teamId: team.id,
        });
      }

      // Add team members' emails if available
      if (team.teamMembers) {
        team.teamMembers.forEach(member => {
          if (member.email) {
            recipients.push({
              email: member.email,
              name: member.name,
              teamId: team.id,
            });
          }
        });
      }
    });

    // Remove duplicates based on email
    return recipients.filter((recipient, index, self) =>
      index === self.findIndex(r => r.email === recipient.email)
    );
  }

  /**
   * Generate tournament schedule email template
   */
  private generateTournamentScheduleTemplate(data: TournamentNotificationData): EmailTemplate {
    const { tournament } = data;
    const startDate = new Date(tournament.startDate).toLocaleDateString();
    const endDate = new Date(tournament.endDate).toLocaleDateString();

    const subject = `Tournament Schedule: ${tournament.name}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Tournament Schedule Notification</h2>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">${tournament.name}</h3>
          <p><strong>Description:</strong> ${tournament.description}</p>
          ${tournament.location ? `<p><strong>Location:</strong> ${tournament.location}</p>` : ''}
          <p><strong>Start Date:</strong> ${startDate}</p>
          <p><strong>End Date:</strong> ${endDate}</p>
          <p><strong>Number of Fields:</strong> ${tournament.numberOfFields}</p>
        </div>

        <p>Dear Team,</p>
        <p>We're excited to inform you about the upcoming tournament schedule. Please review the details above and prepare accordingly.</p>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Important:</strong> Please ensure your team is ready and arrives on time for the tournament.</p>
        </div>

        <p>If you have any questions, please contact the tournament administrator.</p>

        <p>Best regards,<br>Tournament Management Team</p>
      </div>
    `;

    const textContent = `
Tournament Schedule Notification

Tournament: ${tournament.name}
Description: ${tournament.description}
${tournament.location ? `Location: ${tournament.location}\n` : ''}Start Date: ${startDate}
End Date: ${endDate}
Number of Fields: ${tournament.numberOfFields}

Dear Team,

We're excited to inform you about the upcoming tournament schedule. Please review the details above and prepare accordingly.

Important: Please ensure your team is ready and arrives on time for the tournament.

If you have any questions, please contact the tournament administrator.

Best regards,
Tournament Management Team
    `;

    return { subject, htmlContent, textContent };
  }

  /**
   * Generate stage schedule email template
   */
  private generateStageScheduleTemplate(data: StageNotificationData): EmailTemplate {
    const { stage, tournament } = data;
    const startDate = new Date(stage.startDate).toLocaleDateString();
    const endDate = stage.endDate ? new Date(stage.endDate).toLocaleDateString() : 'TBD';

    const subject = `Stage Schedule: ${stage.name} - ${tournament.name}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Stage Schedule Notification</h2>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">${stage.name}</h3>
          <p><strong>Tournament:</strong> ${tournament.name}</p>
          <p><strong>Stage Type:</strong> ${stage.type}</p>
          <p><strong>Start Date:</strong> ${startDate}</p>
          <p><strong>End Date:</strong> ${endDate}</p>
        </div>

        <p>Dear Team,</p>
        <p>This is to notify you about the schedule for the "${stage.name}" stage in the ${tournament.name} tournament.</p>

        <div style="background-color: #dcfce7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Action Required:</strong> Please mark your calendar and ensure your team is available for the scheduled dates.</p>
        </div>

        <p>More detailed match schedules will be provided closer to the start date.</p>

        <p>Best regards,<br>Tournament Management Team</p>
      </div>
    `;

    const textContent = `
Stage Schedule Notification

Stage: ${stage.name}
Tournament: ${tournament.name}
Stage Type: ${stage.type}
Start Date: ${startDate}
End Date: ${endDate}

Dear Team,

This is to notify you about the schedule for the "${stage.name}" stage in the ${tournament.name} tournament.

Action Required: Please mark your calendar and ensure your team is available for the scheduled dates.

More detailed match schedules will be provided closer to the start date.

Best regards,
Tournament Management Team
    `;

    return { subject, htmlContent, textContent };
  }

  /**
   * Generate tournament update email template
   */
  private generateTournamentUpdateTemplate(data: TournamentNotificationData): EmailTemplate {
    const { tournament, changes } = data;
    const startDate = new Date(tournament.startDate).toLocaleDateString();
    const endDate = new Date(tournament.endDate).toLocaleDateString();

    const subject = `Tournament Update: ${tournament.name}`;

    const changesHtml = changes && changes.length > 0
      ? `<div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
           <h4 style="margin-top: 0;">Changes Made:</h4>
           <ul>${changes.map(change => `<li>${change}</li>`).join('')}</ul>
         </div>`
      : '';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Tournament Update</h2>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">${tournament.name}</h3>
          <p><strong>Description:</strong> ${tournament.description}</p>
          ${tournament.location ? `<p><strong>Location:</strong> ${tournament.location}</p>` : ''}
          <p><strong>Start Date:</strong> ${startDate}</p>
          <p><strong>End Date:</strong> ${endDate}</p>
          <p><strong>Number of Fields:</strong> ${tournament.numberOfFields}</p>
        </div>

        ${changesHtml}

        <p>Dear Team,</p>
        <p>There have been updates to the ${tournament.name} tournament. Please review the updated information above.</p>

        <p>If you have any questions about these changes, please contact the tournament administrator.</p>

        <p>Best regards,<br>Tournament Management Team</p>
      </div>
    `;

    const changesText = changes && changes.length > 0
      ? `\nChanges Made:\n${changes.map(change => `- ${change}`).join('\n')}\n`
      : '';

    const textContent = `
Tournament Update

Tournament: ${tournament.name}
Description: ${tournament.description}
${tournament.location ? `Location: ${tournament.location}\n` : ''}Start Date: ${startDate}
End Date: ${endDate}
Number of Fields: ${tournament.numberOfFields}
${changesText}
Dear Team,

There have been updates to the ${tournament.name} tournament. Please review the updated information above.

If you have any questions about these changes, please contact the tournament administrator.

Best regards,
Tournament Management Team
    `;

    return { subject, htmlContent, textContent };
  }

  /**
   * Generate stage update email template
   */
  private generateStageUpdateTemplate(data: StageNotificationData): EmailTemplate {
    const { stage, tournament, changes } = data;
    const startDate = new Date(stage.startDate).toLocaleDateString();
    const endDate = stage.endDate ? new Date(stage.endDate).toLocaleDateString() : 'TBD';

    const subject = `Stage Update: ${stage.name} - ${tournament.name}`;

    const changesHtml = changes && changes.length > 0
      ? `<div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
           <h4 style="margin-top: 0;">Changes Made:</h4>
           <ul>${changes.map(change => `<li>${change}</li>`).join('')}</ul>
         </div>`
      : '';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Stage Update</h2>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">${stage.name}</h3>
          <p><strong>Tournament:</strong> ${tournament.name}</p>
          <p><strong>Stage Type:</strong> ${stage.type}</p>
          <p><strong>Start Date:</strong> ${startDate}</p>
          <p><strong>End Date:</strong> ${endDate}</p>
        </div>

        ${changesHtml}

        <p>Dear Team,</p>
        <p>There have been updates to the "${stage.name}" stage in the ${tournament.name} tournament. Please review the updated information above.</p>

        <p>If you have any questions about these changes, please contact the tournament administrator.</p>

        <p>Best regards,<br>Tournament Management Team</p>
      </div>
    `;

    const changesText = changes && changes.length > 0
      ? `\nChanges Made:\n${changes.map(change => `- ${change}`).join('\n')}\n`
      : '';

    const textContent = `
Stage Update

Stage: ${stage.name}
Tournament: ${tournament.name}
Stage Type: ${stage.type}
Start Date: ${startDate}
End Date: ${endDate}
${changesText}
Dear Team,

There have been updates to the "${stage.name}" stage in the ${tournament.name} tournament. Please review the updated information above.

If you have any questions about these changes, please contact the tournament administrator.

Best regards,
Tournament Management Team
    `;

    return { subject, htmlContent, textContent };
    }

    /**
    * Generate user account creation email template
    */
  private generateUserAccountCreationTemplate(data: UserAccountCreationData): EmailTemplate {
    const { username, password, role, loginUrl } = data;
    const loginLink = loginUrl || 'https://your-app-url.com/login';

    const subject = `Your Account Has Been Created - ${role}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Welcome to the Tournament Management System</h1>
        </div>

        <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e40af; margin-top: 0;">Your Account Details</h2>

          <div style="background-color: white; padding: 20px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Username:</strong> ${username}</p>
            <p style="margin: 10px 0;"><strong>Password:</strong> ${password}</p>
            <p style="margin: 10px 0;"><strong>Role:</strong> ${role}</p>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;"><strong>Important:</strong> Please change your password after your first login for security reasons.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Your Account</a>
          </div>

          <p>If you have any questions or need assistance, please contact your system administrator.</p>

          <p>Best regards,<br>Tournament Management Team</p>
        </div>
      </div>
    `;

    const textContent = `
Welcome to the Tournament Management System

Your Account Details:
- Username: ${username}
- Password: ${password}
- Role: ${role}

Important: Please change your password after your first login for security reasons.

Login URL: ${loginLink}

If you have any questions or need assistance, please contact your system administrator.

Best regards,
Tournament Management Team
    `.trim();

    return { subject, htmlContent, textContent };
    }

    /**
    * Generate bulk user creation email template with direct credentials
    */
  private generateBulkUserCreationTemplate(data: UserAccountCreationData): EmailTemplate {
    const { username, password, role, loginUrl } = data;
    const loginLink = loginUrl || 'https://your-app-url.com/login';

    const subject = `Your Tournament Management Account Credentials - ${role}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🎯 Your Account Has Been Created</h1>
          <p style="margin: 10px 0 0 0;">Welcome to the Tournament Management System</p>
        </div>

        <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background-color: #ffffff; padding: 25px; border-radius: 8px; border: 2px solid #e5e7eb; margin: 20px 0;">
            <h2 style="color: #1e40af; margin-top: 0; text-align: center;">Your Login Credentials</h2>

            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
              <h3 style="margin: 0 0 10px 0; color: #0c4a6e;">📋 Account Details</h3>
              <p style="margin: 8px 0; font-size: 16px;"><strong>Username:</strong> <code style="background-color: #e0f2fe; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${username}</code></p>
              <p style="margin: 8px 0; font-size: 16px;"><strong>Password:</strong> <code style="background-color: #fef3c7; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #92400e;">${password}</code></p>
              <p style="margin: 8px 0; font-size: 16px;"><strong>Role:</strong> <span style="background-color: #ecfdf5; color: #065f46; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${role}</span></p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">🔐 Login to Your Account</a>
          </div>

          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Important Security Notice</h4>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              <li>Keep your credentials secure and do not share them</li>
              <li>Change your password after first login for better security</li>
              <li>Contact your administrator if you have any issues</li>
            </ul>
          </div>

          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h4 style="margin: 0 0 10px 0; color: #065f46;">🎯 Getting Started</h4>
            <ol style="margin: 0; padding-left: 20px; color: #065f46;">
              <li>Click the login button above</li>
              <li>Use your username and password to sign in</li>
              <li>Explore your role-specific features</li>
              <li>Consider updating your password for security</li>
            </ol>
          </div>

          <p style="text-align: center; margin: 20px 0; color: #6b7280;">
            If you have any questions or need assistance, please contact your system administrator.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="text-align: center; margin: 20px 0; font-size: 14px; color: #9ca3af;">
            <strong>Tournament Management System</strong><br>
            Best regards, Tournament Management Team
          </p>
        </div>
      </div>
    `;

    const textContent = `
🎯 YOUR ACCOUNT HAS BEEN CREATED
Welcome to the Tournament Management System

📋 YOUR LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Username: ${username}
Password: ${password}
Role: ${role}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 LOGIN LINK: ${loginLink}

⚠️  IMPORTANT SECURITY NOTICE:
• Keep your credentials secure and do not share them
• Change your password after first login for better security
• Contact your administrator if you have any issues

🎯 GETTING STARTED:
1. Click the login link above
2. Use your username and password to sign in
3. Explore your role-specific features
4. Consider updating your password for security

If you have any questions or need assistance, please contact your system administrator.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tournament Management System
Best regards, Tournament Management Team
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    return { subject, htmlContent, textContent };
  }

  /**
    * Send bulk emails to multiple recipients
    */
  private async sendBulkEmails(
    recipients: EmailRecipient[],
    template: EmailTemplate
  ): Promise<EmailNotificationResult[]> {
    const results: EmailNotificationResult[] = [];

    // In a real implementation, you would use a proper email service like:
    // - Nodemailer with SMTP
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // etc.

    for (const recipient of recipients) {
      try {
        // Simulate email sending
        const result = await this.sendSingleEmail(recipient, template);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          recipientEmail: recipient.email,
        });
      }
    }

    return results;
  }

  /**
   * Send a single email (mock implementation)
   */
  private async sendSingleEmail(
    recipient: EmailRecipient,
    template: EmailTemplate
  ): Promise<EmailNotificationResult> {
    // Mock implementation - in production, integrate with actual email service
    console.log(`[EmailService] Sending email to: ${recipient.email}`);
    console.log(`[EmailService] Subject: ${template.subject}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock success (in production, handle actual email sending)
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipientEmail: recipient.email,
    };
  }

  /**
   * Test email configuration
   */
  public async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      // In production, test actual SMTP connection
      console.log('[EmailService] Testing email configuration...');
      console.log('[EmailService] Configuration test passed (mock)');
      return true;
    } catch (error) {
      console.error('[EmailService] Configuration test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService();
