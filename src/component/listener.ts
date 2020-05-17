import { ApplicationError } from '../error';
import { Component } from './index';
import { Engine } from '..';
import { Services } from './services';
import { BasicAuth } from './auth/basic';
import { Registry } from './registry';

let logger;

export class Listener implements Component {
  private address;
  private port;
  private services: Services | Registry;
  private server;
  private prefix;
  private rawMode = false;

  constructor(private system: Engine) {
    logger = system.log.log('engine:listener');
    const conf = system.configuration.get('system');
    this.address = conf.listen || '127.0.0.1';
    this.port = conf.port || '80';
    this.services = system.services || system.registry;
    this.prefix = conf.service_prefix;
    this.rawMode = conf.raw || false;

    if (this.prefix) {
      logger.debug(`Using ${this.prefix} service prefix`);
    }
  }

  init(): Promise<any> {
    return new Promise((resolve, reject) => {
      const cors = require('cors');
      const bodyParser = require('body-parser');

      const express = require('express')();
      express.disable('x-powered-by');
      express.use(cors());

      if (this.rawMode) {
        logger.debug('Services will be running in RAW mode');
        express.use(bodyParser.raw({ type: () => true }));
      } else {
        express.use(bodyParser.json());
      }

      express.use(
        bodyParser.urlencoded({
          extended: true,
        })
      );

      express.use((req, res, next) => {
        const method = req.method.toLowerCase();
        const path = this.path(req.path);

        if (!path) {
          const err = new ApplicationError(
            'invalid_request',
            'Service path with invalid prefix ' + req.method + ': ' + req.path,
            'sys_en_rspfx'
          );
          return err.send(res);
        }

        logger.debug(`Resolving route for path: ${path}`);
        const route = this.services.resolve(path);

        if (!route) {
          const err = new ApplicationError(
            'invalid_request',
            'Service not found ' + req.method + ': ' + req.path,
            'sys_en_rs1'
          );
          return err.send(res);
        }

        if (!route.method[method]) {
          const err = new ApplicationError(
            'invalid_request',
            `Unsupported method ${req.method} for service ${req.path}`,
            'sys_en_rs2'
          );
          return err.send(res);
        }

        logger.debug('Resolved request: ' + req.path + ' to: ' + JSON.stringify(route));
        if (this.system.apm) {
          this.system.apm.setTransactionName(req.path);
        }

        this.authorise(req, route)
          .then((authenticatedUser) => {
            logger.debug(`Got authenticated user: ${JSON.stringify(authenticatedUser)}`);
            const handler = new route.handler(this.system, authenticatedUser);
            if (!handler) {
              return new ApplicationError(
                'system_error',
                `Missing ${req.path} service handler for ${method} method`,
                'sys_core_listener0'
              ).send(res);
            }
            return handler[method](req, res);
          })
          .catch((err) => {
            if (err.error) {
              return err.send(res);
            }

            logger.error(err);
            return new ApplicationError('system_error', 'Internal system error', 'sys_core_listener1').send(res);
          });
      });

      this.server = express.listen(this.port, this.address);
      logger.info(`Waiting for connections on ${this.address} port ${this.port}`);
      return resolve();
    });
  }

  private path(path: string): Array<string> {
    let matched = 0;
    const pfx = (this.prefix ? this.prefix.split('/') : []).splice(1);
    const finalPath = path.split('/').splice(1);

    for (const i in pfx) {
      if (pfx[i] == finalPath[i]) {
        matched++;
      } else {
        return null;
      }
    }

    return finalPath.splice(matched);
  }

  release(): Promise<any> {
    this.server.close();
    logger.info('Released');
    return Promise.resolve();
  }

  private authorise(req, route): Promise<any> {
    const method = req.method.toLowerCase();
    const security = route.method[method].security;
    const authorization = req.header('authorization');

    logger.debug(
      `Checking ${method} security ${JSON.stringify(route.method[method].security)} with authorization ${authorization}`
    );
    if (!security) {
      if (!authorization) {
        return Promise.resolve();
      }
      return new BasicAuth(this.system).authenticate(req, []);
    }

    return security.reduce((promise, sec) => {
      return promise.then(() => {
        const context = Object.getOwnPropertyNames(sec)[0];
        if (!context) {
          return Promise.reject(
            new ApplicationError(
              'invalid_request',
              `Unspecified security context for service ${req.path}`,
              'sys_li_au1'
            )
          );
        }

        const securityModel = route.definitions.security[context];
        if (!securityModel) {
          return Promise.reject(
            new ApplicationError(
              'invalid_request',
              `Unspecified security model ${context} for service ${req.path}`,
              'sys_li_au2'
            )
          );
        }

        logger.debug(`Security model: ${JSON.stringify(securityModel)}`);
        switch (securityModel.type) {
          case 'basic':
            logger.info(`Authenticating (basic) ${JSON.stringify(sec[context])}`);
            return new BasicAuth(this.system).authenticate(req, sec[context]);
          default:
            return Promise.reject(
              new ApplicationError(
                'invalid_request',
                `Unsupported authentication type ${securityModel.type} for service ${req.path}`,
                'sys_li_au3'
              )
            );
        }
      });
    }, Promise.resolve());
  }
}
