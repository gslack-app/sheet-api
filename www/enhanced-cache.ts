import { ICache } from "../core/interfaces";

/**
 * Enhanced cache - wraps a native Cache object and provides additional features.
 * @param {Cache} cache the cache to enhance
 * @constructor
 */
export class EnhancedCache implements ICache {
    private ttl: number = 25 * 60;
    private cache: GoogleAppsScript.Cache.Cache;
    constructor() {
        this.cache = CacheService.getScriptCache();;
    }

    //#region ICache
    setExpiration(value: number): void {
        this.ttl = value;
    }

    get(key: string, type?: 'boolean' | 'number' | 'string' | 'object'): string {
        try {
            type = type || 'object';
            return this.getValue(key, type);
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }

    set(key: string, value: any): void {
        try {
            this.putValue(key, value, typeof value, this.ttl);
        }
        catch (e) {
            console.error(e);
        }
    }

    remove(key: string): void {
        let valueDescriptor = this.getValueDescriptor(key);
        if (valueDescriptor.keys) {
            for (let i = 0; i < valueDescriptor.keys.length; i++) {
                let k = valueDescriptor.keys[i];
                this._remove_(k);
            }
        }
        this._remove_(key);
    }

    removeAll(keys: string[]): void {
        keys.forEach(k => this.remove(k));
    }
    //#endregion    

    setCache(cache: GoogleAppsScript.Cache.Cache) {
        this.cache = cache;
    }

    /**
     * Put a string value in the cache
     * @param {string} key
     * @param {string} value
     * @param {number} ttl (optional) time-to-live in seconds for the key:value pair in the cache
     */
    putString(key: string, value: string, ttl?: number): void {
        let type = 'string';
        this.ensureValueType(value, type);
        this.putValue(key, value, type, ttl);
    }

    /**
     * Get a string value from the cache
     * @param {string} key
     * @return {string} The string value, or null if none is found
     */
    getString(key: string): string {
        return this.getValue(key, 'string');
    }

    /**
     * Put a numeric value in the cache
     * @param {string} key
     * @param {number} value
     * @param {number} ttl (optional) time-to-live in seconds for the key:value pair in the cache
     */
    putNumber(key: string, value: string, ttl?: number): void {
        let type = 'number';
        this.ensureValueType(value, type);
        this.putValue(key, value, type, ttl);
    }

    /**
     * Get a numeric value from the cache
     * @param {string} key
     * @return {number} The numeric value, or null if none is found
     */
    getNumber(key: string): number {
        return this.getValue(key, 'number');
    }

    /**
     * Put a boolean value in the cache
     * @param {string} key
     * @param {boolean} value
     * @param {number} ttl (optional) time-to-live in seconds for the key:value pair in the cache
     */
    putBoolean(key: string, value: boolean, ttl?: number): void {
        let type = 'boolean';
        this.ensureValueType(value, type);
        this.putValue(key, value, type, ttl);
    }

    /**
     * Get a boolean value from the cache
     * @param {string} key
     * @return {boolean} The boolean value, or null if none is found
     */
    getBoolean(key: string): boolean {
        let value = this.getValue(key, 'boolean');
        return value;
    }

    /**
     * Put an object in the cache
     * @param {string} key
     * @param {string} value
     * @param {number} ttl (optional) time-to-live in seconds for the key:value pair in the cache
     * @param {function(object)} stringify (optional) function to use for converting the object to string. If not specified, JSON's stringify function is used:
     * <pre>stringify = function(obj) { return JSON.stringify(obj); };</pre>
     */
    putObject(key: string, value: string, ttl?: number, stringify?: Function): void {
        stringify = stringify || JSON.stringify;
        let type = 'object';
        this.ensureValueType(value, type);
        let sValue = value === null ? null : stringify(value);
        this.putValue(key, sValue, type, ttl);
    }

    /**
     * Get an object from the cache
     * @param {string} key
     * @param {function(string)} parse (optional) function to use for converting the string to an object. If not specified, JSON's parse function is used:
     * <pre>parse = function(text) { return JSON.parse(text); };</pre>
     * @return {object} The object, or null if none is found
     */
    getObject(key: string, parse?: Function): any {
        parse = parse || JSON.parse;
        let sValue = this.getValue(key, 'object');
        let value = sValue === null ? null : parse(sValue);
        return value;
    }

    /**
     * Get the date an entry was last updated
     * @param {string} key
     * @return {Date} the date the entry was last updated, or null if no such key exists
     */
    getLastUpdated(key: string): Date {
        let valueDescriptor = this.getValueDescriptor(key);
        return valueDescriptor === null ? null : new Date(valueDescriptor.time);
    }

    private ensureValueType(value: any, type: string): void {
        if (value !== null) {
            let actualType = typeof value;
            if (actualType !== type)
                throw new Error(Utilities.formatString('Value type mismatch. Expected: %s, Actual: %s', type, actualType));
        }
    }

    private ensureKeyType(key: string): void {
        if (typeof key !== 'string')
            throw new Error('Key must be a string value');
    }

    private createValueDescriptor(value: any, type: string, ttl?: number): any {
        return {
            value: value,
            type: type,
            ttl: ttl,
            time: (new Date()).getTime()
        };
    }

    private putValue(key: string, value: any, type: string, ttl?: number): void {
        this.ensureKeyType(key);
        let valueDescriptor = this.createValueDescriptor(value, type, ttl);
        this.splitLargeValue(key, valueDescriptor);
        let sValueDescriptor = JSON.stringify(valueDescriptor);
        this._put_(key, sValueDescriptor, ttl);
    }

    private _put_(key: string, value: any, ttl?: number): void {
        if (ttl)
            this.cache.put(key, value, ttl);
        else
            this.cache.put(key, value);
    }

    private _get_(key: string): string {
        return this.cache.get(key);
    }

    private _remove_(key: string): void {
        return this.cache.remove(key);
    }

    private getValueDescriptor(key: string) {
        this.ensureKeyType(key);
        let sValueDescriptor = this._get_(key);
        let valueDescriptor = sValueDescriptor === null ? null : JSON.parse(sValueDescriptor);
        return valueDescriptor;
    }

    private getValue(key: string, type: string): any {
        let valueDescriptor = this.getValueDescriptor(key);
        if (valueDescriptor === null)
            return null;
        if (type !== valueDescriptor.type)
            throw new Error(Utilities.formatString('Value type mismatch. Expected: %s, Actual: %s', type, valueDescriptor.type));
        this.mergeLargeValue(valueDescriptor);
        return valueDescriptor.value;
    }

    private mergeLargeValue(valueDescriptor: any): void {
        // If the value descriptor has 'keys' instead of 'value' - collect the values from the keys and populate the value
        if (valueDescriptor.keys) {
            let value = '';
            for (let i = 0; i < valueDescriptor.keys.length; i++) {
                let k = valueDescriptor.keys[i];
                let v = this._get_(k);
                value += v;
            }
            valueDescriptor.value = value;
            valueDescriptor.keys = undefined;
        }
    }

    private splitLargeValue(key: string, valueDescriptor: any) {
        // Max cached value size: 128KB
        // According the ECMA-262 3rd Edition Specification, each character represents a single 16-bit unit of UTF-16 text
        const DESCRIPTOR_MARGIN = 2000;
        const MAX_STR_LENGTH = (128 * 1024 / 2) - DESCRIPTOR_MARGIN;
        // If the 'value' in the descriptor is a long string - split it and put in different keys, add the 'keys' to the descriptor
        let value = valueDescriptor.value;
        if (value !== null && typeof value === 'string' && value.length > MAX_STR_LENGTH) {
            Logger.log('Splitting string value of length: ' + value.length);
            let keys = [];
            do {
                let k: string = '$$$' + key + keys.length;
                let v = value.substring(0, MAX_STR_LENGTH);
                value = value.substring(MAX_STR_LENGTH);
                keys.push(k);
                this._put_(k, v, valueDescriptor.ttl);
            } while (value.length > 0);
            valueDescriptor.value = undefined;
            valueDescriptor.keys = keys;
        }
        // TODO: Maintain previous split values when putting new value in an existing key
    }
}