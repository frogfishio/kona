import { Engine } from '../src';

module.exports = async function(): Promise<Engine> {
  let engine = global['engine'];
  if (engine) {
    return engine;
  } else {
    engine = new Engine(`${process.env.ENGINE_ROOT}/test/service.yaml`, {
      root: process.env.ENGINE_ROOT
      // env: 'test_env',
      // tenant: 'test_tenant',
      // app: 'test_name',
      // tag: 'test-tag',
      // live: true
    });

    await engine.init();
    global['engine'] = engine;
    return engine;
  }
};
