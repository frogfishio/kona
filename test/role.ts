import { Engine } from '../src/index';

let engine: Engine;

const chai = require('chai');
const expect = chai.expect;
const time = Date.now();

let roleId;

describe('Role', () => {
  beforeEach(async () => {
    engine = await require('./engine')();
  });

  it('should create role', async () =>
    console.log(
      'Created role id -> ' +
        (roleId = (await engine.role.create({ name: 'role_' + time, permissions: ['one', 'two', 'three'] })).id)
    ));

  it('should return', async () =>
    expect(await engine.role.get(roleId))
      .to.have.property('name')
      .which.equals('role_' + time));
});
