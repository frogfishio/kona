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

  describe('Connector', () => {
    it('should return data', done => {
      setTimeout(function () {
        const conn = engine.connector.connector('scarlet');
        conn
          .get('/content/find')
          .then(result => {
            console.log(JSON.stringify(result, null, 2));
            return done();
          })
          .catch(err => {
            console.error(err);
            // return done();
          });
      }, 500);
    });
  });
});
