import { ApplicationError } from '../../error';
import { Component } from '../index';
import { Engine } from '../..';

export class Scheduler implements Component {
  constructor(private system: Engine) {}

  init(): Promise<any> {
    return Promise.reject('not implemented');
  }

  release(): Promise<any> {
    return Promise.reject('not implemented');
  }
}
