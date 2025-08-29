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
  | 'tournament_reminder';

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
