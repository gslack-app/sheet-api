var jsonQuery =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./node_modules/json-query/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/json-query/index.js":
/*!******************************************!*\
  !*** ./node_modules/json-query/index.js ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var State = __webpack_require__(/*! ./lib/state */ "./node_modules/json-query/lib/state.js");

var tokenize = __webpack_require__(/*! ./lib/tokenize */ "./node_modules/json-query/lib/tokenize.js");

var tokenizedCache = {};

module.exports = function jsonQuery(query, options) {
  // extract params for ['test[param=?]', 'value'] type queries
  var params = options && options.params || null;

  if (Array.isArray(query)) {
    params = query.slice(1);
    query = query[0];
  }

  if (!tokenizedCache[query]) {
    tokenizedCache[query] = tokenize(query, true);
  }

  return handleQuery(tokenizedCache[query], options, params);
};

module.exports.lastParent = function (query) {
  var last = query.parents[query.parents.length - 1];

  if (last) {
    return last.value;
  } else {
    return null;
  }
};

function handleQuery(tokens, options, params) {
  var state = new State(options, params, handleQuery);

  for (var i = 0; i < tokens.length; i++) {
    if (handleToken(tokens[i], state)) {
      break;
    }
  } // flush


  handleToken(null, state); // set databind hooks

  if (state.currentItem instanceof Object) {
    state.addReference(state.currentItem);
  } else {
    var parentObject = getLastParentObject(state.currentParents);

    if (parentObject) {
      state.addReference(parentObject);
    }
  }

  return {
    value: state.currentItem,
    key: state.currentKey,
    references: state.currentReferences,
    parents: state.currentParents
  };
}

function handleToken(token, state) {
  // state: setCurrent, getValue, getValues, resetCurrent, deepQuery, rootContext, currentItem, currentKey, options, filters
  if (token == null) {
    // process end of query
    if (!state.currentItem && state.options.force) {
      state.force(state.options.force);
    }
  } else if (token.values) {
    if (state.currentItem) {
      var keys = Object.keys(state.currentItem);
      var values = [];
      keys.forEach(function (key) {
        if (token.deep && Array.isArray(state.currentItem[key])) {
          state.currentItem[key].forEach(function (item) {
            values.push(item);
          });
        } else {
          values.push(state.currentItem[key]);
        }
      });
      state.setCurrent(keys, values);
    } else {
      state.setCurrent(keys, []);
    }
  } else if (token.get) {
    var key = state.getValue(token.get);

    if (shouldOverride(state, key)) {
      state.setCurrent(key, state.override[key]);
    } else {
      if (state.currentItem || state.options.force && state.force({})) {
        if (isDeepAccessor(state.currentItem, key) || token.multiple) {
          var values = state.currentItem.map(function (item) {
            return item[key];
          }).filter(isDefined);
          values = Array.prototype.concat.apply([], values); // flatten

          state.setCurrent(key, values);
        } else {
          state.setCurrent(key, state.currentItem[key]);
        }
      } else {
        state.setCurrent(key, null);
      }
    }
  } else if (token.select) {
    if (Array.isArray(state.currentItem) || state.options.force && state.force([])) {
      var match = (token.boolean ? token.select : [token]).map(function (part) {
        if (part.op === ':') {
          var key = state.getValue(part.select[0]);
          return {
            func: function (item) {
              if (key) {
                item = item[key];
              }

              return state.getValueFrom(part.select[1], item);
            },
            negate: part.negate,
            booleanOp: part.booleanOp
          };
        } else {
          var selector = state.getValues(part.select);
          if (!state.options.allowRegexp && part.op === '~' && selector[1] instanceof RegExp) throw new Error('options.allowRegexp is not enabled.');
          return {
            key: selector[0],
            value: selector[1],
            negate: part.negate,
            booleanOp: part.booleanOp,
            op: part.op
          };
        }
      });

      if (token.multiple) {
        var keys = [];
        var value = [];
        state.currentItem.forEach(function (item, i) {
          if (matches(item, match)) {
            keys.push(i);
            value.push(item);
          }
        });
        state.setCurrent(keys, value);
      } else {
        if (!state.currentItem.some(function (item, i) {
          if (matches(item, match)) {
            state.setCurrent(i, item);
            return true;
          }
        })) {
          state.setCurrent(null, null);
        }
      }
    } else {
      state.setCurrent(null, null);
    }
  } else if (token.root) {
    state.resetCurrent();

    if (token.args && token.args.length) {
      state.setCurrent(null, state.getValue(token.args[0]));
    } else {
      state.setCurrent(null, state.rootContext);
    }
  } else if (token.parent) {
    state.resetCurrent();
    state.setCurrent(null, state.options.parent);
  } else if (token.or) {
    if (state.currentItem) {
      return true;
    } else {
      state.resetCurrent();
      state.setCurrent(null, state.context);
    }
  } else if (token.filter) {
    var helper = state.getLocal(token.filter) || state.getGlobal(token.filter);

    if (typeof helper === 'function') {
      // function(input, args...)
      var values = state.getValues(token.args || []);
      var result = helper.apply(state.options, [state.currentItem].concat(values));
      state.setCurrent(null, result);
    } else {
      // fallback to old filters
      var filter = state.getFilter(token.filter);

      if (typeof filter === 'function') {
        var values = state.getValues(token.args || []);
        var result = filter.call(state.options, state.currentItem, {
          args: values,
          state: state,
          data: state.rootContext
        });
        state.setCurrent(null, result);
      }
    }
  } else if (token.deep) {
    if (state.currentItem) {
      if (token.deep.length === 0) {
        return;
      }

      var result = state.deepQuery(state.currentItem, token.deep, state.options);

      if (result) {
        state.setCurrent(result.key, result.value);

        for (var i = 0; i < result.parents.length; i++) {
          state.currentParents.push(result.parents[i]);
        }
      } else {
        state.setCurrent(null, null);
      }
    } else {
      state.currentItem = null;
    }
  }
}

function matches(item, parts) {
  var result = false;

  for (var i = 0; i < parts.length; i++) {
    var opts = parts[i];
    var r = false;

    if (opts.func) {
      r = opts.func(item);
    } else if (opts.op === '~') {
      if (opts.value instanceof RegExp) {
        r = item[opts.key] && !!item[opts.key].match(opts.value);
      } else {
        r = item[opts.key] && !!~item[opts.key].indexOf(opts.value);
      }
    } else if (opts.op === '=') {
      if (item[opts.key] === true && opts.value === 'true' || item[opts.key] === false && opts.value === 'false') {
        r = true;
      } else {
        r = item[opts.key] == opts.value;
      }
    } else if (opts.op === '>') {
      r = item[opts.key] > opts.value;
    } else if (opts.op === '<') {
      r = item[opts.key] < opts.value;
    } else if (opts.op === '>=') {
      r = item[opts.key] >= opts.value;
    } else if (opts.op === '<=') {
      r = item[opts.key] <= opts.value;
    }

    if (opts.negate) {
      r = !r;
    }

    if (opts.booleanOp === '&') {
      result = result && r;
    } else if (opts.booleanOp === '|') {
      result = result || r;
    } else {
      result = r;
    }
  }

  return result;
}

function isDefined(value) {
  return typeof value !== 'undefined';
}

function shouldOverride(state, key) {
  return state.override && state.currentItem === state.rootContext && state.override[key] !== undefined;
}

function isDeepAccessor(currentItem, key) {
  return currentItem instanceof Array && parseInt(key) != key;
}

function getLastParentObject(parents) {
  for (var i = 0; i < parents.length; i++) {
    if (!parents[i + 1] || !(parents[i + 1].value instanceof Object)) {
      return parents[i].value;
    }
  }
}

/***/ }),

/***/ "./node_modules/json-query/lib/depth-split.js":
/*!****************************************************!*\
  !*** ./node_modules/json-query/lib/depth-split.js ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = depthSplit;

function depthSplit(text, delimiter, opts) {
  var max = opts && opts.max || Infinity;
  var includeDelimiters = opts && opts.includeDelimiters || false;
  var depth = 0;
  var start = 0;
  var result = [];
  var zones = [];
  text.replace(/([\[\(\{])|([\]\)\}])/g, function (current, open, close, offset) {
    if (open) {
      if (depth === 0) {
        zones.push([start, offset]);
      }

      depth += 1;
    } else if (close) {
      depth -= 1;

      if (depth === 0) {
        start = offset + current.length;
      }
    }
  });

  if (depth === 0 && start < text.length) {
    zones.push([start, text.length]);
  }

  start = 0;

  for (var i = 0; i < zones.length && max > 0; i++) {
    for (var pos = zones[i][0], match = delimiter.exec(text.slice(pos, zones[i][1])); match && max > 1; pos += match.index + match[0].length, start = pos, match = delimiter.exec(text.slice(pos, zones[i][1]))) {
      result.push(text.slice(start, match.index + pos));

      if (includeDelimiters) {
        result.push(match[0]);
      }

      max -= 1;
    }
  }

  if (start < text.length) {
    result.push(text.slice(start));
  }

  return result;
}

/***/ }),

/***/ "./node_modules/json-query/lib/state.js":
/*!**********************************************!*\
  !*** ./node_modules/json-query/lib/state.js ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = State;

function State(options, params, handleQuery) {
  options = options || {}; //this.options = options

  this.handleQuery = handleQuery;
  this.options = options;
  this.locals = this.options.locals || {};
  this.globals = this.options.globals || {};
  this.rootContext = firstNonNull(options.data, options.rootContext, options.context, options.source);
  this.parent = options.parent;
  this.override = options.override;
  this.filters = options.filters || {};
  this.params = params || options.params || [];
  this.context = firstNonNull(options.currentItem, options.context, options.source);
  this.currentItem = firstNonNull(this.context, options.rootContext, options.data);
  this.currentKey = null;
  this.currentReferences = [];
  this.currentParents = [];
}

State.prototype = {
  // current manipulation
  setCurrent: function (key, value) {
    if (this.currentItem || this.currentKey || this.currentParents.length > 0) {
      this.currentParents.push({
        key: this.currentKey,
        value: this.currentItem
      });
    }

    this.currentItem = value;
    this.currentKey = key;
  },
  resetCurrent: function () {
    this.currentItem = null;
    this.currentKey = null;
    this.currentParents = [];
  },
  force: function (def) {
    var parent = this.currentParents[this.currentParents.length - 1];

    if (!this.currentItem && parent && this.currentKey != null) {
      this.currentItem = def || {};
      parent.value[this.currentKey] = this.currentItem;
    }

    return !!this.currentItem;
  },
  getLocal: function (localName) {
    if (~localName.indexOf('/')) {
      var result = null;
      var parts = localName.split('/');

      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];

        if (i == 0) {
          result = this.locals[part];
        } else if (result && result[part]) {
          result = result[part];
        }
      }

      return result;
    } else {
      return this.locals[localName];
    }
  },
  getGlobal: function (globalName) {
    if (~globalName.indexOf('/')) {
      var result = null;
      var parts = globalName.split('/');

      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];

        if (i == 0) {
          result = this.globals[part];
        } else if (result && result[part]) {
          result = result[part];
        }
      }

      return result;
    } else {
      return this.globals[globalName];
    }
  },
  getFilter: function (filterName) {
    if (~filterName.indexOf('/')) {
      var result = null;
      var filterParts = filterName.split('/');

      for (var i = 0; i < filterParts.length; i++) {
        var part = filterParts[i];

        if (i == 0) {
          result = this.filters[part];
        } else if (result && result[part]) {
          result = result[part];
        }
      }

      return result;
    } else {
      return this.filters[filterName];
    }
  },
  addReferences: function (references) {
    if (references) {
      references.forEach(this.addReference, this);
    }
  },
  addReference: function (ref) {
    if (ref instanceof Object && !~this.currentReferences.indexOf(ref)) {
      this.currentReferences.push(ref);
    }
  },
  // helper functions
  getValues: function (values, callback) {
    return values.map(this.getValue, this);
  },
  getValue: function (value) {
    return this.getValueFrom(value, null);
  },
  getValueFrom: function (value, item) {
    if (value._param != null) {
      return this.params[value._param];
    } else if (value._sub) {
      var options = copy(this.options);
      options.force = null;
      options.currentItem = item;
      var result = this.handleQuery(value._sub, options, this.params);
      this.addReferences(result.references);
      return result.value;
    } else {
      return value;
    }
  },
  deepQuery: function (source, tokens, options, callback) {
    var keys = Object.keys(source);

    for (var key in source) {
      if (key in source) {
        var options = copy(this.options);
        options.currentItem = source[key];
        var result = this.handleQuery(tokens, options, this.params);

        if (result.value) {
          return result;
        }
      }
    }

    return null;
  }
};

function firstNonNull(args) {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i] != null) {
      return arguments[i];
    }
  }
}

function copy(obj) {
  var result = {};

  if (obj) {
    for (var key in obj) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
  }

  return result;
}

/***/ }),

/***/ "./node_modules/json-query/lib/tokenize.js":
/*!*************************************************!*\
  !*** ./node_modules/json-query/lib/tokenize.js ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// todo: syntax checking
// todo: test handle args
var depthSplit = __webpack_require__(/*! ./depth-split */ "./node_modules/json-query/lib/depth-split.js");

module.exports = function (query, shouldAssignParamIds) {
  if (!query) return [];
  var result = [],
      prevChar,
      char,
      nextChar = query.charAt(0),
      bStart = 0,
      bEnd = 0,
      partOffset = 0,
      pos = 0,
      depth = 0,
      mode = 'get',
      deepQuery = null; // if query contains params then number them

  if (shouldAssignParamIds) {
    query = assignParamIds(query);
  }

  var tokens = {
    '.': {
      mode: 'get'
    },
    ':': {
      mode: 'filter'
    },
    '|': {
      handle: 'or'
    },
    '[': {
      open: 'select'
    },
    ']': {
      close: 'select'
    },
    '{': {
      open: 'meta'
    },
    '}': {
      close: 'meta'
    },
    '(': {
      open: 'args'
    },
    ')': {
      close: 'args'
    }
  };

  function push(item) {
    if (deepQuery) {
      deepQuery.push(item);
    } else {
      result.push(item);
    }
  }

  var handlers = {
    get: function (buffer) {
      var trimmed = typeof buffer === 'string' ? buffer.trim() : null;

      if (trimmed) {
        push({
          get: trimmed
        });
      }
    },
    select: function (buffer) {
      if (buffer) {
        push(tokenizeSelect(buffer));
      } else {
        // deep query override
        var x = {
          deep: []
        };
        result.push(x);
        deepQuery = x.deep;
      }
    },
    filter: function (buffer) {
      if (buffer) {
        push({
          filter: buffer.trim()
        });
      }
    },
    or: function () {
      deepQuery = null;
      result.push({
        or: true
      });
      partOffset = i + 1;
    },
    args: function (buffer) {
      var args = tokenizeArgs(buffer);
      result[result.length - 1].args = args;
    }
  };

  function handleBuffer() {
    var buffer = query.slice(bStart, bEnd);

    if (handlers[mode]) {
      handlers[mode](buffer);
    }

    mode = 'get';
    bStart = bEnd + 1;
  }

  for (var i = 0; i < query.length; i++) {
    // update char values
    prevChar = char;
    char = nextChar;
    nextChar = query.charAt(i + 1);
    pos = i - partOffset; // root query check

    if (pos === 0 && char !== ':' && char !== '.') {
      result.push({
        root: true
      });
    } // parent query check


    if (pos === 0 && char === '.' && nextChar === '.') {
      result.push({
        parent: true
      });
    }

    var token = tokens[char];

    if (token) {
      // set mode
      if (depth === 0 && (token.mode || token.open)) {
        handleBuffer();
        mode = token.mode || token.open;
      }

      if (depth === 0 && token.handle) {
        handleBuffer();
        handlers[token.handle]();
      }

      if (token.open) {
        depth += 1;
      } else if (token.close) {
        depth -= 1;
      } // reset mode to get


      if (depth === 0 && token.close) {
        handleBuffer();
      }
    }

    bEnd = i + 1;
  }

  handleBuffer();
  return result;
};

function tokenizeArgs(argsQuery) {
  if (argsQuery === ',') return [','];
  return depthSplit(argsQuery, /,/).map(function (s) {
    return handleSelectPart(s.trim());
  });
}

function tokenizeSelect(selectQuery) {
  if (selectQuery === '*') {
    return {
      values: true
    };
  } else if (selectQuery === '**') {
    return {
      values: true,
      deep: true
    };
  }

  var multiple = false;

  if (selectQuery.charAt(0) === '*') {
    multiple = true;
    selectQuery = selectQuery.slice(1);
  }

  var booleanParts = depthSplit(selectQuery, /&|\|/, {
    includeDelimiters: true
  });

  if (booleanParts.length > 1) {
    var result = [getSelectPart(booleanParts[0].trim())];

    for (var i = 1; i < booleanParts.length; i += 2) {
      var part = getSelectPart(booleanParts[i + 1].trim());

      if (part) {
        part.booleanOp = booleanParts[i];
        result.push(part);
      }
    }

    return {
      multiple: multiple,
      boolean: true,
      select: result
    };
  } else {
    var result = getSelectPart(selectQuery.trim());

    if (!result) {
      return {
        get: handleSelectPart(selectQuery.trim())
      };
    } else {
      if (multiple) {
        result.multiple = true;
      }

      return result;
    }
  }
}

function getSelectPart(selectQuery) {
  var parts = depthSplit(selectQuery, /(!)?(=|~|\:|<=|>=|<|>)/, {
    max: 2,
    includeDelimiters: true
  });

  if (parts.length === 3) {
    var negate = parts[1].charAt(0) === '!';
    var key = handleSelectPart(parts[0].trim());
    var result = {
      negate: negate,
      op: negate ? parts[1].slice(1) : parts[1]
    };

    if (result.op === ':') {
      result.select = [key, {
        _sub: module.exports(':' + parts[2].trim())
      }];
    } else if (result.op === '~') {
      var value = handleSelectPart(parts[2].trim());

      if (typeof value === 'string') {
        var reDef = parts[2].trim().match(/^\/(.*)\/([a-z]?)$/);

        if (reDef) {
          result.select = [key, new RegExp(reDef[1], reDef[2])];
        } else {
          result.select = [key, value];
        }
      } else {
        result.select = [key, value];
      }
    } else {
      result.select = [key, handleSelectPart(parts[2].trim())];
    }

    return result;
  }
}

function isInnerQuery(text) {
  return text.charAt(0) === '{' && text.charAt(text.length - 1) === '}';
}

function handleSelectPart(part) {
  if (isInnerQuery(part)) {
    var innerQuery = part.slice(1, -1);
    return {
      _sub: module.exports(innerQuery)
    };
  } else {
    return paramToken(part);
  }
}

function paramToken(text) {
  if (text.charAt(0) === '?') {
    var num = parseInt(text.slice(1));

    if (!isNaN(num)) {
      return {
        _param: num
      };
    } else {
      return text;
    }
  } else {
    return text;
  }
}

function assignParamIds(query) {
  var index = 0;
  return query.replace(/\?/g, function (match) {
    return match + index++;
  });
}

function last(array) {
  return array[array.length - 1];
}

/***/ })

/******/ });