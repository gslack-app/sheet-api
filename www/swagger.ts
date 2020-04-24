interface Server {
    url: string;
    description?: string;
}

interface Contact {
    name: string;
    email: string;
    url?: string;
}

interface License {
    name: string;
    url: string;
}

interface ExternalDocs {
    url: string;
    description?: string;
}

interface Path {
    path: string;
    summary?: string;
    description?: string;
    get?: Operation;
    post?: Operation;
}

interface Operation {
    summary?: string;
    description?: string;
    operationId?: string;
    parameters?: Parameter[];
    servers?: Server[];
}

interface Parameter {
    name: string;
    in: 'query' | 'path' | 'header' | 'cookie';
    description?: string;
    required?: boolean;
    schema?: ParameterSchema;
    allowReserved?: boolean;
    style?: 'form';
    explode?: boolean;
    allowEmptyValue?: boolean;
    // Parameter Examples & Deprecated Parameters Not Supported
}

interface ParameterSchema {
    type: 'array' | 'string' | 'integer';
    format?: 'int64' | 'uuid';
    enum?: any[];
    default?: any;
    minimum?: number;
}

export class Swagger {
    private doc: any;
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.doc = {
            openapi: '3.0.0',
            servers: [],
            paths: []
        };
        this.baseUrl = baseUrl;
    }

    info(title: string, version: string, description?: string,
        termsOfService?: string, contact?: Contact, license?: License,
        externalDocs?: ExternalDocs): Swagger {
        this.doc.info = {
            title: title,
            description: description || '',
            version: version,
            termsOfService: termsOfService || '',
            contact: contact,
            license: license,
            externalDocs: externalDocs
        };
        return this;
    }

    servers(server: Server): Swagger {
        // Server Templating not supported
        this.doc.servers = this.doc.servers.concat(server);
        return this;
    }

    paths(path: Path): Swagger {
        this.doc.paths = this.doc.paths.concat(path);
        return this;
    }
}