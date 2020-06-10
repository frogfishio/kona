/**
 * Created by eldiablo on 18/05/2016.
 */

export enum KonaError {
  VALIDATION_ERROR = 'validation_error',
  INVALID_REQUEST = 'invalid_request',
  ALREADY_EXISTS = 'already_exists',
  INVALID_TOKEN = 'invalid_token',
  AUTH_ERROR = 'auth_error',
  INSUFFICIENT_SCOPE = 'insufficient_scope',
  NOT_FOUND = 'not_found',
  UNSUPPORTED_METHOD = 'unsupported_method',
  SYSTEM_ERROR = 'system_error',
  CONFIGURATION_ERROR = 'configuration_error',
  SERVICE_ERROR = 'service_error',
}

const codes = {
  validation_error: 400, // When passed data fails validation
  invalid_request: 400,
  // The request is missing a required parameter, includes an
  // unsupported parameter or parameter value, repeats the same
  // parameter, uses more than one method for including an access
  // token, or is otherwise malformed.
  already_exists: 400, // When inserting data that already exists
  invalid_token: 401,
  // The access token provided is expired, revoked, malformed, or
  // invalid for other reasons.  The resource SHOULD respond with
  // the HTTP 401 (Unauthorized) status code.  The client MAY
  // request a new access token and retry the protected resource
  // request.
  auth_error: 403, // When failing authentication
  insufficient_scope: 403,
  // The request requires higher privileges than provided by the
  //  access token.  The resource server SHOULD respond with the HTTP
  //  403 (Forbidden) status code and MAY include the "scope"
  //  attribute with the scope necessary to access the protected
  //  resource.
  not_found: 404, // When record is not found
  unsupported_method: 405, // When calling e.g. GET and its not supported
  data_error: 409,
  system_error: 500, // Internal deep error
  configuration_error: 500, // Configuration error
  service_error: 502, // When calling a remote service fails
};

export class ApplicationError {
  code;
  error_description;
  trace;
  error;

  constructor(error: string, errorDescription: string, trace: string, originalError?: Error) {
    this.error = error;
    this.code = codes[error] || 500;
    this.error_description = errorDescription;
    this.trace = trace;

    if (!this.error_description && originalError) {
      this.error_description = originalError.message;
    }
  }

  send(res) {
    res.status(this.code).json({
      error: this.error,
      error_description: this.error_description,
      trace: this.trace,
    });
  }
}

module.exports.send = (err, res, logger?, trace?: string) => {
  if (err.send) {
    return err.send(res);
  }

  if (logger) {
    logger.error(err);
  } else {
    console.error(err);
  }
  console.error(err);
  new ApplicationError(
    'sytem_error',
    'Internal system error ocurred, administrator was notified',
    trace || 'sys_int_helper'
  ).send(res);
};
