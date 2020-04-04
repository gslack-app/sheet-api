//#region travix-di
export class DependencyInjection {
    private singletons: any;
    private options: any;
    private providers: any[];

    constructor(providers: any = [], opts: any = {}) {
        this.singletons = {};
        this.options = {
            containerName: 'container',
            ...opts,
        };
        this.providers = providers;
        Object.defineProperty(this, this.options.containerName, {
            get: () => this
        });
        this.providers.forEach((provider: any) => {
            this.register(provider);
        });
    }

    get(name: string): any {
        if (this.options.containerName === name) {
            return this;
        }
        else {
            let provider = this.providers.filter(p => p.name === name)[0];
            if (provider) {
                const { name, singleton } = provider;
                return singleton ? this.singletons[name] : this.createInstance(provider);
            }
            return undefined;
        }
    }

    private getDeps(provider: any): any {
        const depsInstances: any = {};

        if (Array.isArray(provider.deps)) {
            provider.deps.forEach((depName: string) => {
                depsInstances[depName] = this.get(depName);
            });
        } else if (typeof provider.deps === 'object') {
            Object.keys(provider.deps)
                .forEach((containerDepName) => {
                    const targetDepName = provider.deps[containerDepName];
                    depsInstances[targetDepName] = this.get(containerDepName);
                });
        }
        return depsInstances;
    }

    private register(provider: any): void {
        if (typeof provider.name !== 'string')
            throw new Error(`Provider has no 'name' key.`);

        const { name, singleton } = provider;
        if (singleton)
            this.singletons[name] = this.createInstance(provider);
    }

    private createInstance(provider: any): any {
        // name ==> instance
        if ('useValue' in provider)
            return provider.useValue;
        else if ('useFactory' in provider)
            return provider.useFactory(this.getDeps(provider));
        else if ('useClass' in provider)
            return new provider.useClass(this.getDeps(provider));
        else if ('useDefinedValue' in provider)
            return provider.useDefinedValue;
        else
            throw new Error(`No value given for '${provider.name}' provider.`);
    }
}
//#endregion

//#region trouter
export class Trouter {
    routes: any[];
    all: (route: string | RegExp, ...fns: any[]) => Trouter;
    get: (route: string | RegExp, ...fns: any[]) => Trouter;
    head: (route: string | RegExp, ...fns: any[]) => Trouter;
    patch: (route: string | RegExp, ...fns: any[]) => Trouter;
    options: (route: string | RegExp, ...fns: any[]) => Trouter;
    connect: (route: string | RegExp, ...fns: any[]) => Trouter;
    delete: (route: string | RegExp, ...fns: any[]) => Trouter;
    trace: (route: string | RegExp, ...fns: any[]) => Trouter;
    post: (route: string | RegExp, ...fns: any[]) => Trouter;
    put: (route: string | RegExp, ...fns: any[]) => Trouter;

    constructor() {
        this.routes = [];
        this.all = this.add.bind(this, '');
        this.get = this.add.bind(this, 'GET');
        this.head = this.add.bind(this, 'HEAD');
        this.patch = this.add.bind(this, 'PATCH');
        this.options = this.add.bind(this, 'OPTIONS');
        this.connect = this.add.bind(this, 'CONNECT');
        this.delete = this.add.bind(this, 'DELETE');
        this.trace = this.add.bind(this, 'TRACE');
        this.post = this.add.bind(this, 'POST');
        this.put = this.add.bind(this, 'PUT');
    }

    use(route: string, ...fns: any[]): Trouter {
        let handlers = [].concat.apply([], fns);
        let { keys, pattern } = Trouter.parse(route, true);
        this.routes.push({ keys, pattern, method: '', handlers });
        return this;
    }

    add(method: string, route: string | RegExp, ...fns: any[]): Trouter {
        let { keys, pattern } = Trouter.parse(route);
        let handlers = [].concat.apply([], fns);
        this.routes.push({ keys, pattern, method, handlers });
        return this;
    }

    find(method: string, url: string): any {
        let isHEAD = (method === 'HEAD');
        let i = 0, j = 0, k, tmp, arr = this.routes;
        let matches = [], params: any = {}, handlers: any[] = [];
        for (; i < arr.length; i++) {
            tmp = arr[i];
            if (tmp.method.length === 0 || tmp.method === method || isHEAD && tmp.method === 'GET') {
                if (tmp.keys === false) {
                    matches = tmp.pattern.exec(url);
                    if (matches === null)
                        continue;
                    if (matches.groups !== void 0)
                        for (k in matches.groups) params[k] = matches.groups[k];
                    tmp.handlers.length > 1 ? (handlers = handlers.concat(tmp.handlers)) : handlers.push(tmp.handlers[0]);
                } else if (tmp.keys.length > 0) {
                    matches = tmp.pattern.exec(url);
                    if (matches === null)
                        continue;
                    for (j = 0; j < tmp.keys.length;)
                        params[tmp.keys[j]] = matches[++j];
                    tmp.handlers.length > 1 ? (handlers = handlers.concat(tmp.handlers)) : handlers.push(tmp.handlers[0]);
                } else if (tmp.pattern.test(url)) {
                    tmp.handlers.length > 1 ? (handlers = handlers.concat(tmp.handlers)) : handlers.push(tmp.handlers[0]);
                }
            } // else not a match
        }
        return { params, handlers };
    }

    static parse(str: string | RegExp, loose?: boolean) {
        if (str instanceof RegExp)
            return { keys: false, pattern: str };
        var c, o, tmp, ext, keys = [], pattern = '', arr = str.split('/');
        arr[0] || arr.shift();

        while (tmp = arr.shift()) {
            c = tmp[0];
            if (c === '*') {
                keys.push('wild');
                pattern += '/(.*)';
            } else if (c === ':') {
                o = tmp.indexOf('?', 1);
                ext = tmp.indexOf('.', 1);
                keys.push(tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length));
                pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
                if (!!~ext)
                    pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
            } else {
                pattern += '/' + tmp;
            }
        }
        return {
            keys: keys,
            pattern: new RegExp('^' + pattern + (loose ? '(?:$|\/)' : '\/?$'), 'i')
        };
    }
}
//#endregion
