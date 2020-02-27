import { Hello } from "../../../api/hello";

let logger;

export default class JobHandler {
  private api;

  constructor(private engine, private user) {
    logger = engine.log.log("@hello"); // by convention service handlers should log with @ at start
    this.api = new Hello(engine, user);
  }

  async get(req, res, next) {
    try {
      res.json(await this.api.get());
    } catch (err) {
      err.send(res);
    }
  }
}
