import { Engine } from '..';
import { Component } from './index';

export class Shared implements Component {
  private vars = {};

  constructor(private system: Engine) {}

  get(name: string): any {
    return this.vars[name];
  }

  set(name: string, value: any) {
    this.vars[name] = value;
  }

  init(): Promise<any> {
    return Promise.reject('not implemented');
  }

  release(): Promise<any> {
    return Promise.reject('not implemented');
  }
}
