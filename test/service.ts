import { Engine } from '../src/index';

let engine: Engine;

const chai = require('chai');
const expect = chai.expect;
const request = require('./request');

describe('Service', () => {
  beforeEach(async () => {
    engine = await require('./engine')();
  });

  it('should call hello service', async () =>
    expect(await request.get(`http://localhost:8000${process.env.SERVICE_PREFIX || ''}/v1/hello`))
      .to.have.property('hello')
      .which.equals('Hello World, fine day today...'));

  // it('should get manifest', async () => {
  //   expect(await engine.manifest.get())
  //     .to.have.property('hello')
  //     .which.has.property('hello')
  //     .which.equals('world');
  // });
});
