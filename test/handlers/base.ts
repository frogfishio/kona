import { Engine } from "../index";
import { ApplicationError } from "../../src/error";

export class BaseHandler {
  constructor(protected engine: Engine, protected user) {}

  protected async getScoped(roleIdOrCode: string, permission: string) {
    const auth = await this.validate(permission); // if it is NOT role-admin then it is scoped
    const role = await this.engine.role.get(roleIdOrCode);

    // console.log(`AUTH: ${JSON.stringify(auth, null, 2)}`);
    // console.log(`ROLE: ${JSON.stringify(role, null, 2)}`);
    if (auth.context && auth.context.indexOf(role.context) === -1) {
      throw new ApplicationError('insufficient_scope', 'Insufficient scope', '1126656458');
    }
    return role;
  }

  protected async validate(permission: string) {
    if (this.user.context) {
      // context users can't read or write users
      throw new ApplicationError('insufficient_scope', 'Insufficient scope', '1126656458');
    }

    if (this.user.permissions.indexOf(permission) !== -1) {
      return {};
    }

    const auth = await this.engine.authorise(this.user);
    return auth;
  }
}
