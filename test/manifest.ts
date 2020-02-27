import { Engine } from '../src/index';

let engine: Engine;

const chai = require('chai');
const expect = chai.expect;

describe('Manifest', () => {
  beforeEach(async () => {
    engine = await require('./engine')();
  });

  it('should set manifest', async () =>
    await engine.manifest.set('hello', { hello: 'world' }));

  it('should get manifest', async () => {
    expect(await engine.manifest.get())
      .to.have.property('hello')
      .which.has.property('hello')
      .which.equals('world');
  });
});
