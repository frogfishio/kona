import { Engine } from '../src';

module.exports.engine = async (): Promise<Engine> => {
  return (
    global['engine'] ||
    (await (global['engine'] = new Engine(`${process.env.ENGINE_SYSTEM_ROOT}/test/service.yaml`, {
      root: process.env.ENGINE_SYSTEM_ROOT,
    }))
      .init()
      .then(() => global['engine']))
  );
};
