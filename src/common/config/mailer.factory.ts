import { ConfigService } from '@nestjs/config';
import { MailerOptions } from '@nestjs-modules/mailer';

export const mailerOptionsFactory = (config: ConfigService): MailerOptions => ({
  transport: {
    host: config.get<string>('MAIL_HOST'),
    port: config.get<number>('MAIL_PORT'),
    secure: config.get<string>('MAIL_SECURE') === 'true',
    auth: {
      user: config.get<string>('MAIL_USER'),
      pass: config.get<string>('MAIL_PASS'),
    },
  },
  defaults: {
    from: `"Equipa de Suporte" <${config.get<string>('MAIL_USER')}>`,
  },
});
