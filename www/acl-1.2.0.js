var acl =
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
/******/ 	return __webpack_require__(__webpack_require__.s = "./node_modules/@techteamer/acl/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/@techteamer/acl/index.js":
/*!***********************************************!*\
  !*** ./node_modules/@techteamer/acl/index.js ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = {
  ACLService: __webpack_require__(/*! ./src/ACLService */ "./node_modules/@techteamer/acl/src/ACLService.js"),
  ACLError: __webpack_require__(/*! ./src/ACLError */ "./node_modules/@techteamer/acl/src/ACLError.js"),
  ACLManager: __webpack_require__(/*! ./src/ACLManager */ "./node_modules/@techteamer/acl/src/ACLManager.js")
};

/***/ }),

/***/ "./node_modules/@techteamer/acl/src/ACLError.js":
/*!******************************************************!*\
  !*** ./node_modules/@techteamer/acl/src/ACLError.js ***!
  \******************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

class ACLError extends Error {}

module.exports = ACLError;

/***/ }),

/***/ "./node_modules/@techteamer/acl/src/ACLManager.js":
/*!********************************************************!*\
  !*** ./node_modules/@techteamer/acl/src/ACLManager.js ***!
  \********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

const ACLError = __webpack_require__(/*! ./ACLError */ "./node_modules/@techteamer/acl/src/ACLError.js");

const ACLService = __webpack_require__(/*! ./ACLService */ "./node_modules/@techteamer/acl/src/ACLService.js");

class ACLManager {
  constructor() {
    this.log = false;
    this.aclList = [];
  }

  set logger(value) {
    this.log = value;

    for (const acl of this.aclList) {
      acl.logger = this.log;
    }
  }

  get logger() {
    return this.log;
  }

  importConfig(configJSON) {
    const acl = new ACLService();
    acl.import(configJSON);

    if (this.log) {
      acl.logger = this.log;
    }

    this.import(acl);
  }

  import(acl) {
    if (!(acl instanceof ACLService)) {
      this._log('error', 'Failed to import non-ACL value');
    } // The latest ACL takes precedence


    this.aclList.unshift(acl);
  }

  get roleList() {
    // Flattened unique role list array across every acl
    return Array.from(new Set([].concat(...this.aclList.map(acl => acl.roleList))));
  }

  hasRole(role) {
    return this.roleList.includes(role);
  }

  getACLForRole(role) {
    for (let acl of this.aclList) {
      if (acl.roleList.includes(role)) {
        return acl;
      }
    }

    return null;
  }

  isAllowed(access, role) {
    const acl = this.getACLForRole(role);

    if (!acl) {
      this._log('warn', `Role not found: '${role}' in any ACL`);

      return false;
    }

    return acl.isAllowed(access, role);
  }

  areAllowed(accessList, role) {
    const acl = this.getACLForRole(role);

    if (!acl) {
      this._log('warn', `Role not found: '${role}' in any ACL`);

      return false;
    }

    return acl.areAllowed(accessList, role);
  }

  anyAllowed(accessList, role) {
    const acl = this.getACLForRole(role);

    if (!acl) {
      this._log('warn', `Role not found: '${role}' in any ACL`);

      return false;
    }

    return acl.anyAllowed(accessList, role);
  }

  clear() {
    this.aclList = [];
  }

  _log(level, message) {
    if (this.log instanceof Object && this.log[level] instanceof Function) {
      this.log[level](message);
    } else if (this.log instanceof Function) {
      this.log(level, message);
    }

    if (level === 'error') {
      throw new ACLError(message);
    }
  }

}

module.exports = ACLManager;

/***/ }),

/***/ "./node_modules/@techteamer/acl/src/ACLService.js":
/*!********************************************************!*\
  !*** ./node_modules/@techteamer/acl/src/ACLService.js ***!
  \********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

const ACLError = __webpack_require__(/*! ./ACLError */ "./node_modules/@techteamer/acl/src/ACLError.js");

class ACLService {
  constructor() {
    this.logger = false;
    this._ruleCache = new Map();
    this._resultCache = new Map();
    this._importInProgress = false;
  }

  import(configJSON) {
    this._importInProgress = true;

    for (let role of Object.keys(configJSON)) {
      if (role[0] === '@') {
        this._log('warn', `Role ignored: ${role.substr(1)}`);

        continue;
      }

      if (!this.hasRole(role)) {
        this.createRole(role);
      }

      for (let rule of configJSON[role].sort()) {
        if (rule[0] === '@') {
          this._log('warn', `Rule ignored: ${role}\\${rule.substr(1)}`);

          continue;
        }

        this.createRule(rule, role);
      }
    } // clear if ACL rules ready


    this._importInProgress = false;
    this.clearResultCache();

    this._log('info', 'Import completed');
  }

  createRole(role) {
    if (!/^[a-z0-9-_]+$/i.test(role)) {
      this._log('error', `Invalid character(s) in role name: ${role}`);

      return false;
    }

    if (this._ruleCache.has(role)) {
      this._log('error', `Role creation error: ${role} (role already exists)`);

      return false;
    }

    this._ruleCache.set(role, {
      accept: [],
      reject: []
    });

    this._log('debug', `Role created: ${role}`);

    return true;
  }

  hasRole(role) {
    return this._ruleCache.has(role);
  }

  createRule(rule, role) {
    if (!/^!?[a-z0-9*-._]+$/i.test(rule)) {
      this._log('error', `Invalid character in rule name: ${role}\\${rule}`);

      return false;
    }

    if (!this._ruleCache.has(role)) {
      this._log('error', `Rule creation error: ${role}\\${rule} (role not exists)`);

      return false;
    }

    try {
      let rejectRule = rule[0] === '!';
      let ruleTarget = rejectRule ? this._ruleCache.get(role).reject : this._ruleCache.get(role).accept;
      let expRule = rejectRule ? rule.substr(1) : rule;
      let ruleRegExp = new RegExp('^' + expRule.replace('.', '\\.').replace('*', '.*') + '$', 'i');

      for (let storedRule of ruleTarget) {
        if (storedRule.toString() === ruleRegExp.toString()) {
          throw new Error('rule already exists');
        }
      }

      ruleTarget.push(ruleRegExp);

      this._log('debug', `Rule created: ${role}\\${rule}`);

      if (!this._importInProgress) {
        this.clearResultCache();
      }

      return true;
    } catch (error) {
      this._log('error', `Rule creation error: ${role}\\${rule} (${error.message})`);
    }

    return false;
  }

  clear() {
    this._ruleCache.clear();

    this._resultCache.clear();

    this._log('info', 'Rules and result cache cleared');
  }

  clearResultCache() {
    if (this._resultCache.size > 0) {
      this._resultCache.clear();

      this._log('info', 'Result cache cleared');
    }
  }

  get roleList() {
    return [...this._ruleCache.keys()];
  }

  isAllowed(access, role) {
    if (typeof access !== 'string' || access.length === 0) {
      this._log('warn', `Missing access argument: isAllowed() resolves to false`);

      return false;
    }

    if (typeof role !== 'string' || access.length === 0) {
      this._log('warn', `Missing role argument: isAllowed(${access}) resolves to false`);

      return false;
    }

    if (!this._ruleCache.has(role)) {
      this._log('warn', `Role not found: '${role}' not in ${this.roleList}`);

      return false;
    }

    if (!/^[a-z0-9-._]+$/i.test(access)) {
      this._log('error', `Invalid character in access parameter: ${role}\\${access}`);

      return false;
    }

    access = access.replace(/\s+/g, '');
    let search = `${role}\\${access}`;
    let result = false;

    if (this._resultCache.has(search)) {
      result = this._resultCache.get(search);

      if (result) {
        this._log('debug', `Rule accepted: ${role}\\${access} (from cache)`);
      } else {
        this._log('debug', `Rule declined: ${role}\\${access} (from cache)`);
      }

      return result;
    }

    for (let rule of this._ruleCache.get(role).accept) {
      if (rule.test(access)) {
        result = true;
        break;
      }
    }

    if (result) {
      for (let rule of this._ruleCache.get(role).reject) {
        if (rule.test(access)) {
          result = false;
          break;
        }
      }
    }

    this._resultCache.set(search, result);

    if (result) {
      this._log('debug', `Rule accepted: ${role}\\${access}`);
    } else {
      this._log('debug', `Rule declined: ${role}\\${access}`);
    }

    return result;
  }

  areAllowed(accessList, role) {
    if (!(accessList instanceof Array)) {
      this._log('error', 'Access list is not an array (request rejected)');

      return false;
    }

    if (accessList.length === 0) return false;
    let access = accessList.sort().join('&').replace(/\s+/g, '');
    let search = `${role}\\${access}`;
    let result = true;

    if (this._resultCache.has(search)) {
      result = this._resultCache.get(search);

      if (result) {
        this._log('debug', `Rule accepted: ${role}\\${access} (from cache)`);
      } else {
        this._log('debug', `Rule declined: ${role}\\${access} (from cache)`);
      }

      return result;
    }

    for (let access of accessList) {
      if (!this.isAllowed(access, role)) {
        result = false;
        break;
      }
    }

    this._resultCache.set(search, result);

    if (result) {
      this._log('debug', `Rule accepted: ${role}\\${access}`);
    } else {
      this._log('debug', `Rule declined: ${role}\\${access}`);
    }

    return result;
  }

  anyAllowed(accessList, role) {
    if (!(accessList instanceof Array)) {
      this._log('error', 'Access list is not an array (request rejected)');

      return false;
    }

    let access = accessList.sort().join('|').replace(/\s+/g, '');
    let search = `${role}\\${access}`;
    let result = false;

    if (this._resultCache.has(search)) {
      result = this._resultCache.get(search);

      if (result) {
        this._log('debug', `Rule accepted: ${role}\\${access} (cached)`);
      } else {
        this._log('debug', `Rule declined: ${role}\\${access} (cached)`);
      }

      return result;
    }

    for (let access of accessList) {
      if (this.isAllowed(access, role)) {
        result = true;
        break;
      }
    }

    this._resultCache.set(search, result);

    if (result) {
      this._log('debug', `Rule accepted: ${role}\\${access}`);
    } else {
      this._log('debug', `Rule declined: ${role}\\${access}`);
    }

    return result;
  }

  _log(level, message) {
    if (this.logger instanceof Object && this.logger[level] instanceof Function) {
      this.logger[level](message);
    } else if (this.logger instanceof Function) {
      this.logger(level, message);
    }

    if (level === 'error') {
      throw new ACLError(message);
    }
  }

}

module.exports = ACLService;

/***/ })

/******/ });