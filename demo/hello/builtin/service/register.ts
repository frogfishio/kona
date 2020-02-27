module.exports = async (engine, conf?: any) => {
  const logger = engine.log.log('service:hello:register');
  logger.debug('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  logger.debug('!!!  SERVICE REGISTRATION                       !!!');
  logger.debug('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  if (conf) {
    logger.debug('With configuration -> ' + JSON.stringify(conf, null, 2));
  }
};
