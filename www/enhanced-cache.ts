import { ICache, ILogger } from "../core/interfaces";

/**
 * Enhanced cache - wraps a native Cache object and provides additional features.
 * @param {Cache} cache the cache to enhance
 * @constructor
 */
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
        let valueDescriptor = this.getValueDescriptor(key);
        let keys: string[] = valueDescriptor ? valueDescriptor.keys : [];
        keys = keys || [];
        keys.forEach(k => this._remove_(k));
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
        let valueDescriptor = this.getValueDescriptor(key);
        return valueDescriptor ? new Date(valueDescriptor.time) : null;
    }

    private createValueDescriptor(value: any, ttl?: number): any {
        return {
            value: value,
            type: typeof value,
            ttl: ttl,
            time: (new Date()).getTime()
        };
    }

    private setValue(key: string, value: any, ttl?: number): void {
        let descriptor = this.createValueDescriptor(value, ttl);
        this.splitLargeValue(key, descriptor);
        this._set_(key, JSON.stringify(descriptor), ttl);
    }

    private getValue(key: string): any {
        let descriptor = this.getValueDescriptor(key);
        if (descriptor) {
            this.mergeLargeValue(descriptor);
            return JSON.parse(descriptor.value);
        }
        return null;
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

    private getValueDescriptor(key: string) {
        let descriptor = this._get_(key);
        return descriptor ? JSON.parse(descriptor) : null;
    }

    private mergeLargeValue(descriptor: any): void {
        // If the value descriptor has 'keys' instead of 'value' - collect the values from the keys and populate the value
        if (descriptor.keys) {
            let keys: string[] = descriptor.keys;
            descriptor.value = keys.map(k => this._get_(k)).join('');
            descriptor.keys = null;
        }
    }

    private splitLargeValue(key: string, valueDescriptor: any): void {
        // Reference: https://developers.google.com/apps-script/reference/cache/cache#putkey,-value
        // Max cached value size: 100KB
        // According the ECMA-262 3rd Edition Specification, each character represents a single 16-bit unit of UTF-16 text
        const DESCRIPTOR_MARGIN = 2000;
        const MAX_STR_LENGTH = (100 * 1024 / 2) - DESCRIPTOR_MARGIN;
        // If the 'value' in the descriptor is a long string - split it and put in different keys, add the 'keys' to the descriptor
        let value = JSON.stringify(valueDescriptor.value);
        if (value.length > MAX_STR_LENGTH) {
            this.logger && this.logger.debug(`Splitting string value of length: ${value.length}`);
            let keys: string[] = [];
            do {
                let k: string = '$$$' + key + keys.length;
                let v = value.substring(0, MAX_STR_LENGTH);
                value = value.substring(MAX_STR_LENGTH);
                keys.push(k);
                this._set_(k, v, valueDescriptor.ttl);
            } while (value.length > 0);
            valueDescriptor.value = null;
            valueDescriptor.keys = keys;
        }
        // TODO: Maintain previous split values when putting new value in an existing key
    }
}