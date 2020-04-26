import { Schema } from "./interfaces";

declare type InType = 'query' | 'path' | 'header' | 'body';
declare type DataType = 'integer' | 'number' | 'string' | 'boolean' | 'array';
declare type FormatType = 'int32' | 'float' | 'double' | 'byte' | 'binary' | 'date' | 'date-time' | 'password';

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
    email?: string;
    url?: string;
}

interface License {
    name: string;
    url?: string;
}

interface PathItem {
    $ref?: string;
    get?: Operation;
    post?: Operation;
    parameters?: (Parameter | Reference)[];
}

interface Operation {
    description?: string;
    operationId?: string;
    consumes?: string[];
    produces?: string[];
    parameters?: (Parameter | Reference)[];
    responses: Record<'default' | string, Response>;
}

interface Parameter extends Items {
    name: string;
    in: InType;
    description?: string;
    required?: boolean;
    // If in is "body"
    schema?: SchemaObject;
}

interface Items {
    type?: DataType;
    format?: FormatType;
    // Required if type is "array"   
    items?: Items;
    default?: any;
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
    enum?: string[];
    multipleOf?: number;
}

interface Reference {
    $ref: string;
}

interface SchemaObject extends Items {
    $ref?: string;
    title?: string;
    description?: string;
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    enum?: string[];
}

interface Response {
    description: string;
    schema: SchemaObject;
}

interface Definitions {
    properties: Record<string, Items>;
    required?: string[]
}

interface SecurityScheme {
    type: 'apiKey' | 'basic' | 'oauth2';
    description?: string;
    // Validity: apiKey
    name?: string;
    in?: 'query' | 'header';
    // Validity: oauth2 
    flow: 'implicit' | 'password' | 'application' | 'accessCode';
    authorizationUrl?: string;
    tokenUrl?: string;
    scopes: Record<string, string>;
}

export class Swagger {
    private doc: any;
    info: Info;
    paths: Record<string, PathItem>;
    definitions: Record<string, Definitions>;
    security: Record<string, string[]>;

    generate(schemas: Schema[], version: string): void {
        this.info = this.generateInfo(version);
        this.paths = this.generatePaths(schemas);
        this.definitions = this.generateDefinitions(schemas);
        this.security = this.generateSecurity();

        this.doc = {
            swagger: '2.0',
            info: this.info,
            host: 'script.google.com',
            basePath: this.createBasePath(),
            schemes: ['https'],
            consumes: ['application/json'],
            produces: ['application/json'],
            paths: this.paths,
            definitions: this.definitions,
            parameters: this.createSharedQueryParam(),
            //responses: {},
            securityDefinitions: {},
            security: this.security
        };
    }

    getJSON(): string {
        return JSON.stringify(this.doc);
    }

    private generateInfo(version: string): Info {
        let appName: string = PropertiesService.getScriptProperties().getProperty('app.name') || 'Sheet API';
        let appVer: string = PropertiesService.getScriptProperties().getProperty('app.version') || '1.0.0';
        let obj: Info = {
            title: `${appName} REST API`,
            version: appVer
        };
        return obj;
    }

    private createBasePath(): string {
        let url = ScriptApp.getService().getUrl();
        url = url.replace('https://script.google.com', '');
        return `${url}?url=/api`;
    }

    private generatePaths(recs: Schema[]): Record<string, PathItem> {
        let paths: Record<string, PathItem> = {};
        let types = recs.map(r => r.resource).filter((value, index, self) => self.indexOf(value) === index);
        types.forEach(type => {
            let items = recs.filter(r => r.resource === type);
            let pathItem: PathItem = {};
            pathItem.get = this.createReadOperation(type, items);
            paths[`/${type}`] = pathItem;
        });
        return paths;
    }

    private createReadOperation(resource: string, recs: Schema[]): Operation {
        let op: Operation = {
            parameters: [],
            responses: {}
        };
        op.parameters.push({ $ref: '#/parameters/offset' });
        op.parameters.push({ $ref: '#/parameters/limit' });
        op.parameters.push({ $ref: '#/parameters/where' });
        op.parameters.push({ $ref: '#/parameters/order' });
        op.parameters.push({ $ref: '#/parameters/token' });
        op.responses['200'] = {
            description: 'Successful operation',
            schema: {
                $ref: `#/definitions/${resource}`
            }
        }
        return op;
    }

    private createSharedQueryParam(): Record<string, Parameter> {
        let params: Record<string, Parameter> = {};
        params['offset'] = this.createParameter('offset', 'query', 'integer', 0);
        params['limit'] = this.createParameter('limit', 'query', 'integer', 20);
        params['where'] = this.createParameter('where', 'query', 'string');
        params['order'] = this.createParameter('order', 'query', 'string');
        params['token'] = this.createParameter('token', 'query', 'string');
        return params;
    }

    private generateDefinitions(recs: Schema[]): Record<string, Definitions> {
        let schemas: Record<string, Definitions> = {};
        let types = recs.map(r => r.resource).filter((value, index, self) => self.indexOf(value) === index);
        types.forEach(type => {
            let items = recs.filter(r => r.resource === type);
            let requiredProps = items.filter(i => i.validation && !i.validation.includes('optional')).map(i => i.alias);
            let schema: Definitions = {
                properties: {}
            };
            if (requiredProps.length)
                schema.required = requiredProps;
            items.forEach(i => schema.properties[i.alias] = this.createSchemaObject(i));
            schemas[type] = schema;
        });
        return schemas;
    }

    private createSchemaObject(rec: Schema): SchemaObject {
        let prop: SchemaObject = { type: 'string' };
        switch (rec.type) {
            case 'boolean':
                prop.type = 'boolean';
                break;
            case 'number':
                prop.type = prop.format ? 'number' : 'integer';
                break;
            default:
                prop.type = 'string';
                break;
        }
        if (rec.default)
            prop.default = rec.default;
        return prop;
    }

    private createParameter(name: string, location: InType, type: DataType, defValue?: any, required: boolean = false): Parameter {
        let param: Parameter = {
            name: name,
            type: type,
            in: location,
            required: required,
        };
        if (defValue)
            param.default = defValue;
        return param;

    }

    private generateSecurity(): Record<string, string[]> {
        return {
            api_key: []
        }
    }
}