
///
/// DEPRECATED USE INDEX
///

module.exports = merge;

// clones and merges destination object with source object
/**
 * @deprecated use core util instead
 */
function merge(dest: any, source: any) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (!dest[name] || typeof dest[name] !== 'object') {
      dest[name] = source[name];
    } else {
      dest[name] = merge(dest[name], source[name]);
    }
  }

  return dest;
}
