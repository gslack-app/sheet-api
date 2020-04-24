interface Info {
    title: string;
    description?: string;
    termsOfService?: string;
    contact?: Contact;
    license?: License;
    version: string;
}

interface Contact {
    name: string;
    email: string;
    url: string;
}

interface License {
    name: string;
    url: string;
}

interface Server {
    url: string;
    description?: string;
    variables?: Record<string, ServerVariable>;
}

interface ServerVariable {
    enum?: string[];
    default: string;
    description?: string;
}

interface PathItem {
    $ref?: string;
    summary?: string;
    description?: string;
    get?: Operation;
    put?: Operation;
    post?: Operation;
    delete?: Operation;
    options?: Operation;
    head?: Operation;
    patch?: Operation;
    trace?: Operation;
    servers?: Server[];
    parameters: any;
}

interface Operation {
    tags?: string[];
    summary?: string;
    description?: string;
    externalDocs?: ExternalDoc;
    operationId?: string;
    parameters?: Parameter[] | Reference[];
    requestBody: RequestBody | Reference;
    responses: Record<'default' | string, Response>;
    // Skip `callbacks`
    deprecated?: boolean;
    security: Record<string, string[]>;
    servers?: Server[];
}

interface ExternalDoc {
    url: string;
    description?: string;
}

interface Parameter {
    // Fixed Fields
    name: string;
    in: 'query' | 'path' | 'header' | 'cookie';
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    // The rules for serialization
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    schema: Schema | Reference;
    // Skip `example` & `examples` and `content` fields
}

interface Schema {
    title?: string;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: boolean;
    minimum?: number;
    exclusiveMinimum?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    enum?: string[];
    type?: 'integer' | 'number' | 'string' | 'boolean';
    format?: 'int32' | 'float' | 'double' | 'byte' | 'binary' | 'date' | 'date-time' | 'password';
    // Skip allOf, oneOf, anyOf, anyOf, not, items, properties additionalProperties, description
}

interface Reference {
    $ref: string;
}

interface RequestBody {
    description?: string;
    content: Record<string, MediaType>;
    required?: boolean;
}

interface Response {
    description: string;
    headers?: Record<string, Header | Reference | object>;
    content: Record<string, MediaType>;
    links?: Record<string, Link>;
}

interface MediaType {
    schema: Schema | Reference;
    // Skip `example` & `examples` fields
    encoding: Record<string, Encoding>;
}

interface Encoding {
    contentType: string;
    headers?: Map<string, Header | Reference>;
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
}

interface Header {
    // Fixed Fields
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    // The rules for serialization
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    schema: Schema | Reference;
    // Skip `example` & `examples` and `content` fields
}

interface Link {
    operationRef?: string;
    operationId?: string;
    parameters?: Record<string, any>;
    requestBody: any;
    description?: string;
    server?: Server;
}

interface Tag {
    name: string;
    description?: string;
    externalDocs: ExternalDoc;
}

export class Swagger {
    private doc: any;
    private baseUrl: string;
    readonly openapi: string = '3.0.0';
    info: Info;
    servers: Server[];
    paths: Record<string, PathItem>;
    components: any;
    security: any;
    tags: Tag[];
    externalDocs: ExternalDoc;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.info = {
            title: '',
            version: ''
        };
        this.servers = [];
        this.paths = {};

        this.doc = {
            openapi: this.openapi,
            servers: this.servers,
            paths: this.paths,
        };
    }

    addServers(server: Server): void {
        this.servers = this.servers.concat(server);
    }
}