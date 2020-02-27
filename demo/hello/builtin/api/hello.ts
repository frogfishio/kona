let logger;

export class Hello {
  constructor(private engine, private user) {
    logger = engine.log.log("hello");
  }

  async get() {
    logger.debug(`Hello service called on ${new Date()}`);
    return { hello: "Hello World, fine day today..." };
  }
}

export default function(engine, user) {
  return new Hello(engine, user);
}
