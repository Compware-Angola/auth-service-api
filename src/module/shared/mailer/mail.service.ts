import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async send(params: SendMailParams): Promise<void> {
    await this.mailerService.sendMail({
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  }
}
