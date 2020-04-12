import { ICache, ILogger } from "../core/interfaces";

/**
 * Enhanced cache - wraps a native Cache object and provides additional features.
 * @param {Cache} cache the cache to enhance
 * @constructor
 */

interface Descriptor {
    value: string;
    type: string;
    ttl: number;
    time: number;
    keys?: string[]
}

export class EnhancedCache implements ICache {
    private logger: ILogger;
    private ttl: number = 20 * 60;
    private cache: GoogleAppsScript.Cache.Cache;

    constructor({ ILogger }: any) {
        this.logger = ILogger;
        this.cache = CacheService.getScriptCache();;
    }

    //#region ICache
    setExpiration(value: number): void {
        this.ttl = value;
    }

    get(key: string): any {
        try {
            return this.getValue(key);
        }
        catch (e) {
            this.logger && this.logger.error(`EnhancedCache -> ${e.stack}`);
            // Remove error key
            this.remove(key);
            return null;
        }
    }

    set(key: string, value: any): void {
        try {
            this.setValue(key, value, this.ttl);
        }
        catch (e) {
            this.logger && this.logger.error(`EnhancedCache -> ${e.stack}`);
        }
    }

    remove(key: string): void {
        let descriptor = this.getDescriptor(key);
        let subKeys: string[] = descriptor && descriptor.type ? descriptor.keys : [];
        subKeys.forEach(k => this._remove_(k));
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
     * Get the date an entry was last updated
     * @param {string} key
     * @return {Date} the date the entry was last updated, or null if no such key exists
     */
    getLastUpdated(key: string): Date {
        let valueDescriptor = this.getDescriptor(key);
        return valueDescriptor ? new Date(valueDescriptor.time) : null;
    }

    private createDescriptor(value: any, ttl?: number): Descriptor {
        return {
            value: value,
            type: typeof value,
            ttl: ttl,
            time: (new Date()).getTime()
        };
    }

    private setValue(key: string, value: any, ttl?: number): void {
        let descriptor = this.createDescriptor(value, ttl);
        let jsonValue = this.splitLargeValue(key, descriptor);
        if (jsonValue) {
            // Big JSON value
            // Avoid JSON.stringify twice
            this._set_(key, jsonValue, ttl);
        }
        else {
            this._set_(key, JSON.stringify(descriptor), ttl);
        }
    }

    private getValue(key: string): any {
        let descriptor = this.getDescriptor(key);
        if (descriptor && descriptor.type) {
            // Avoid JSON.parse twice
            if (this.mergeLargeValue(descriptor))
                return JSON.parse(descriptor.value);
        }
        return descriptor;
    }

    private _set_(key: string, value: any, ttl?: number): void {
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

    private getDescriptor(key: string): Descriptor {
        let descriptor = this._get_(key);
        return descriptor ? JSON.parse(descriptor) : null;
    }

    private mergeLargeValue(descriptor: Descriptor): boolean {
        // If the value descriptor has 'keys' instead of 'value' - collect the values from the keys and populate the value
        if (descriptor.keys) {
            let keys = descriptor.keys;
            let value = '';
            this.logger && this.logger.debug(`Cache segments: ${keys.join()}`);
            keys.forEach(k => value += this._get_(k));
            descriptor.value = value;
            descriptor.keys = null;
            return true;
        }
        return false;
    }

    private splitLargeValue(key: string, valueDescriptor: Descriptor): string {
        // Reference: https://developers.google.com/apps-script/reference/cache/cache#putkey,-value
        // Max cached value size: 100KB
        const MAX_STR_LENGTH = 100 * 1024;
        // If the 'value' in the descriptor is a long string - split it and put in different keys, add the 'keys' to the descriptor
        let value = JSON.stringify(valueDescriptor.value);
        if (value.length > MAX_STR_LENGTH) {
            this.logger && this.logger.debug(`Splitting string value of length: ${value.length}`);
            let keys: string[] = [];
            do {
                let k: string = `${key}.${keys.length}`;
                let v = value.substring(0, MAX_STR_LENGTH);
                this._set_(k, v, valueDescriptor.ttl);
                value = value.substring(MAX_STR_LENGTH);
                keys.push(k);
            } while (value.length > 0);
            valueDescriptor.value = null;
            valueDescriptor.keys = keys;
            return null;
        }
        // TODO: Maintain previous split values when putting new value in an existing key
        return value;
    }
}