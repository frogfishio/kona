/**
 * Created by eldiablo on 02/03/2016.
 * Refactored 21/12/2017
 */

export class TreeNode {
  private data = {
    parent: null,
    children: {},
    name: null,
    value: null,
    variable: null,
    varname: null // variable name for children var
  };

  constructor(name?, value?, variable?) {
    this.data.name = name;
    this.data.value = value;
    this.data.variable = variable;
  }

  parent() {
    return this.data.parent;
  }

  children() {
    return this.data.children;
  }

  child(name) {
    return this.data.children[name];
  }

  sibling(name) {
    const siblings = this.siblings();
    if (!siblings) {
      return null;
    }

    return siblings[name];
  }

  siblings() {
    if (!this.data.parent) {
      return null;
    }

    return this.data.parent.children();
  }

  value() {
    return this.data.value;
  }

  add(name, value) {
    const re = /\{[0-9a-zA-Z_\-]*}/;

    if (Array.isArray(name) && name.length === 1) {
      name = name[0];
    }

    if (Array.isArray(name)) {
      let node;
      const child = this.data.children[name[0]];
      if (child) {
        // logger.debug('Child "' + name[0] + '" exists, passing on');
        return child.add(name.splice(1), value);
      } else {
        // logger.debug('Creating new child "' + name[0] + '" of many');
        if (name[0].match(re)) {
          if (this.data.varname && this.data.varname !== name[0]) {
            throw new Error(
              'Element set can have only one variable name "' +
                this.data.varname +
                '" and trying to insert "' +
                name[0] +
                '"'
            );
          }

          // logger.debug('A1 Setting VARNAME to: ' + name[0]);
          this.data.varname = name[0];
          node = new TreeNode(name[0], value, true);
        } else {
          node = new TreeNode(name[0], value);
        }
        node.data.parent = this;
        this.data.children[name[0]] = node;
        return node.add(name.splice(1), value);
      }
    } else {
      // logger.debug('Creating new child "' + name + '"');
      const child = this.child(name);
      if (child) {
        throw new Error('Child "' + name + '" already exists');
      } else {
        let node;
        // logger.debug('Creating new FINAL child "' + name + '" ');
        if (name.match(re)) {
          if (this.data.varname && this.data.varname !== name[0]) {
            throw new Error(
              'Element set can have only one variable name "' +
                this.data.varname +
                '" and trying to insert "' +
                name[0] +
                '"'
            );
          }

          // logger.debug('Setting VARNAME to: ' + name);
          this.data.varname = name;
          node = new TreeNode(name, value, true);
        } else {
          node = new TreeNode(name, value);
        }
        node.data.parent = this;
        this.data.children[name] = node;
      }
    }
  }

  remove() {
    if (this.data.parent) {
      const siblings = this.siblings();
      delete siblings[this.data.name];
    }
  }

  resolve(path) {
    // logger.debug('RESOLVING: ' + path);

    let item = this.data.children[path[0]];

    if (item) {
      if (path.length === 1) {
        return item.value();
      }

      return item.resolve(path.splice(1));
    } else {
      if (this.data.varname) {
        // logger.debug('Has var name!: ' + this.data.varname);

        item = this.data.children[this.data.varname];
        if (!item) {
          return null;
        }

        if (path.length === 1) {
          return item.value();
        }

        return item.resolve(path.splice(1));
      }

      // logger.trace('No varname!: \n');
      // for (var a in this.data) {
      //     console.log(a + '=' + this.data[a]);
      // }
      return null;
    }
  }

  toString(count?: number) {
    let res = '';
    count = count || 0;
    for (let i = 0; i < count; i++) {
      res += '\t';
    }

    res += this.data.name + (this.data.value ? ':' + JSON.stringify(this.data.value, null, 2) : '');

    const names = Object.getOwnPropertyNames(this.data.children);

    for (let i = 0; i < names.length; i++) {
      res += '\n' + this.data.children[names[i]].toString(count + 1);
    }
    return res;
  }

  isVariable() {
    return this.data.variable;
  }

  name() {
    return this.data.name;
  }
}
