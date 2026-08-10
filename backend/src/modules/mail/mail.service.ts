import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') || 'noreply@amu.edu.et';

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
      this.logger.log(`SMTP transport initialized for ${host}:${port}`);
    } else {
      this.logger.log(
        'No SMTP_HOST/SMTP_PORT configured. MailService will log emails to console (Dev Mode).',
      );
    }
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[Dev Mail Output] To: ${to} | Subject: ${subject}`);
      this.logger.log(`[Dev Mail Content]\n${html}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `Arba Minch University ERP <${this.fromAddress}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email successfully sent to ${to} (${subject})`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${(error as Error).message}`,
      );
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const subject = 'Password Reset Request — Arba Minch University ERP';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #0f172a;">Password Reset Request</h2>
        <p>You requested a password reset for your Arba Minch University ERP account.</p>
        <p style="margin: 20px 0;">Use the reset token below to complete your password reset:</p>
        <div style="background: #f1f5f9; padding: 12px 20px; font-family: monospace; font-size: 16px; font-weight: bold; color: #0284c7; border-radius: 4px;">
          ${resetToken}
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">If you did not request this, please ignore this message.</p>
      </div>
    `;
    await this.sendMail(to, subject, html);
  }

  async sendApprovalRequiredEmail(
    to: string,
    stepName: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    const subject = `Approval Required: ${stepName} — AMU ERP`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #0f172a;">Workflow Approval Required</h2>
        <p>You have a pending approval step: <strong>${stepName}</strong>.</p>
        <p><strong>Entity Type:</strong> ${entityType}<br/><strong>Entity ID:</strong> ${entityId}</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Please log into the AMU Resource Management System portal to take action.</p>
      </div>
    `;
    await this.sendMail(to, subject, html);
  }

  async sendLowStockAlertEmail(
    to: string,
    itemName: string,
    storeName: string,
    currentQty: number,
    minQty: number,
  ): Promise<void> {
    const subject = `Low Stock Alert: ${itemName} in ${storeName}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #dc2626;">Low Stock Alert</h2>
        <p>The inventory level for <strong>${itemName}</strong> in <strong>${storeName}</strong> has fallen below the minimum threshold.</p>
        <ul>
          <li><strong>Current Quantity:</strong> ${currentQty}</li>
          <li><strong>Minimum Stock Threshold:</strong> ${minQty}</li>
        </ul>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Consider filing a Purchase Request or Transfer Request to replenish inventory.</p>
      </div>
    `;
    await this.sendMail(to, subject, html);
  }
}
