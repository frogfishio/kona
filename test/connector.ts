import { Engine } from '../src';

let logger;
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

describe('Role service', function () {
  let engine;

  beforeEach(async () => {
    engine = await require('./helper').engine();
  });

  describe('Connector', function () {
    it('should return data', async () => {
      expect(engine).to.exist;
    });
  });
});
