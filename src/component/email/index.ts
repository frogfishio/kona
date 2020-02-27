import { ApplicationError } from '../../error';
import { Component } from '../index';
import { Engine } from '../../index';
import { MailgunProvider } from './provider/mailgun';

let logger;

export interface EmailMessage {
  from: string | Array<string>;
  to: string | Array<string>;
  cc?: string | Array<string>;
  bcc?: string | Array<string>;
  subject: string | Array<string>;
  text?: string;
  html?: string;
}

/**
 * This components sends emails
 */
export class Email implements Component {
  private conf;
  private localCache = {};

  constructor(private engine: Engine) {
    logger = engine.log.log('engine:email');
    this.conf = engine.configuration.get('email') || {};
  }

  send(message: EmailMessage): Promise<any> {
    return Email.validata(message).then(() => {
      switch (this.conf.provider) {
        case 'mailgun':
          const provider = new MailgunProvider(this.engine, this.conf);
          provider.send(message);
          break;
        default:
          return Promise.reject(
            new ApplicationError(
              'validation_error',
              `Unsupported email provider ${this.conf.provider}`,
              'com_email_se1'
            )
          );
      }
    });
  }

  init(): Promise<any> {
    logger.info('Initialised');
    return Promise.resolve();
  }

  release(): Promise<any> {
    logger.info('Released');
    return Promise.resolve();
  }

  private static validata(message): Promise<any> {
    logger.debug(`Validating: from ${message.from} to ${message.to}`);
    return new Promise((resolve, reject) => {
      if (!message) {
        return reject(new ApplicationError('validation_error', 'Message not specified', 'com_email_v1'));
      }
      if (!message.from) {
        return reject(new ApplicationError('validation_error', 'Message FROM not specified', 'com_email_v2'));
      }
      if (!message.to) {
        return reject(new ApplicationError('validation_error', 'Message TO not specified', 'com_email_v3'));
      }
      if (!message.subject) {
        return reject(new ApplicationError('validation_error', 'Message not specified', 'com_email_v4'));
      }
      if (!message.text && !message.html) {
        return reject(
          new ApplicationError('validation_error', 'Message text or html must be specified', 'com_email_v5')
        );
      }

      return resolve();
    });
  }
}
