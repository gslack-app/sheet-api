import { Schema } from "./interfaces";

declare type InType = 'query' | 'path' | 'header' | 'body';
declare type DataType = 'integer' | 'number' | 'string' | 'boolean' | 'array' | 'object';
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

interface ExternalDoc {
    url: string;
    description?: string;
}

interface Tag {
    name: string;
    description?: string;
    externalDocs?: ExternalDoc;
}

interface PathItem {
    $ref?: string;
    get?: Operation;
    post?: Operation;
    parameters?: (Parameter | Reference)[];
}

interface Operation {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId?: string;
    consumes?: string[];
    produces?: string[];
    parameters?: (Parameter | Reference)[];
    responses: Record<'default' | string, Response>;
    security?: Record<string, string[]>;
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
    type: DataType;
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
    flow?: 'implicit' | 'password' | 'application' | 'accessCode';
    authorizationUrl?: string;
    tokenUrl?: string;
    scopes?: Record<string, string>;
}

export class SwaggerV2 {
    private doc: any;
    info: Info;
    paths: Record<string, PathItem>;
    definitions: Record<string, Definitions>;
    securityDefinitions: Record<string, SecurityScheme>;

    generate(schemas: Schema[], params: Record<string, string>): void {
        let errorType = 'Error';
        let resources = schemas.map(r => r.resource).filter((value, index, self) => self.indexOf(value) === index);
        this.info = this.generateInfo(params);
        this.paths = this.generatePaths(resources, schemas, errorType);
        this.definitions = this.generateDefinitions(resources, schemas);
        this.securityDefinitions = this.generateSecurityDefinitions();
        this.doc = {
            swagger: '2.0',
            info: this.info,
            host: 'script.google.com',
            basePath: this.createBasePath(),
            schemes: ['https'],
            consumes: ['application/json'],
            produces: ['application/json'],
            tags: this.generateTags(resources),
            paths: this.paths,
            definitions: this.definitions,
            parameters: this.createSharedQueryParam(),
            securityDefinitions: this.securityDefinitions,
            security: [{ apiKey: [] }]
        };
        this.doc.definitions[errorType] = this.generateErrorDefinition();
    }

    getJSON(): string {
        return JSON.stringify(this.doc);
    }

    private generateInfo(params: Record<string, string>): Info {
        let { title, description, version, name, url, email } = params;
        let obj: Info = {
            title: title,
            description: description,
            version: version,
            contact: {
                name: name,
                url: url,
                email: email
            }
        };
        return obj;
    }

    private createBasePath(): string {
        let url = ScriptApp.getService().getUrl() || 'https://script.google.com/macros/s/AKfycbxumlfgiRM525dOk2qllczDCZfpVCLGp2_14wzyjHFct2mspjo/exec';
        url = url.replace('https://script.google.com', '');
        return `${url}?url=/api`;
    }

    private generateTags(resources: string[]): Tag[] {
        return resources.map(r => {
            let t: Tag = { name: r };
            return t;
        });
    }

    private generatePaths(resources: string[], recs: Schema[], errorType: string): Record<string, PathItem> {
        let paths: Record<string, PathItem> = {};
        resources.forEach(type => {
            let items = recs.filter(r => r.resource === type);
            let pathItem: PathItem = {};
            pathItem.get = this.createReadOperation(type, items, errorType);
            paths[`/${type}`] = pathItem;
        });
        return paths;
    }

    private createReadOperation(resource: string, recs: Schema[], errorType: string): Operation {
        let op: Operation = {
            tags: [resource],
            parameters: [],
            responses: {}
        };
        op.parameters.push({ $ref: '#/parameters/offset' });
        op.parameters.push({ $ref: '#/parameters/limit' });
        op.parameters.push({ $ref: '#/parameters/filter' });
        op.parameters.push({ $ref: '#/parameters/order' });
        op.responses['default'] = {
            description: 'Successful operation',
            schema: {
                type: 'array',
                items: {
                    $ref: `#/definitions/${resource}`
                } as any
            }
        };
        Object.assign(op.responses, this.generateErrorResponse(errorType));
        return op;
    }

    private createSharedQueryParam(): Record<string, Parameter> {
        let params: Record<string, Parameter> = {};
        params['offset'] = this.createParameter('offset', 'query', 'integer');
        params['limit'] = this.createParameter('limit', 'query', 'integer');
        params['filter'] = this.createParameter('filter', 'query', 'string');
        params['order'] = this.createParameter('orderby', 'query', 'string');
        return params;
    }

    private generateDefinitions(resources: string[], recs: Schema[]): Record<string, Definitions> {
        let schemas: Record<string, Definitions> = {};
        resources.forEach(type => {
            let items = recs.filter(r => r.resource === type);
            let requiredProps = items.filter(i => i.validation && !i.validation.includes('optional')).map(i => i.alias);
            let schema: Definitions = {
                type: 'object',
                properties: {}
            };
            if (requiredProps.length)
                schema.required = requiredProps;
            items.forEach(i => schema.properties[i.alias] = this.createSchemaObject(i));
            schemas[type] = schema;
        });
        return schemas;
    }

    private generateErrorDefinition(): Definitions {
        let errorSchema: Definitions = {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['error']
                },
                status: {
                    type: 'string',
                    enum: ['400', '401', '403', '404', '500']
                },
                title: {
                    type: 'string'
                },
                detail: {
                    type: 'string'
                }
            }
        };
        return errorSchema;
    }

    private generateErrorResponse(errorType: string): Record<string, Response> {
        return {
            '200': {
                description: 'Unsuccessful operation',
                schema: {
                    $ref: `#/definitions/${errorType}`
                }
            }
        };
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

    private generateSecurityDefinitions(): Record<string, SecurityScheme> {
        return {
            'apiKey': {
                type: 'apiKey',
                name: "apiKey",
                in: 'query'
            }
        };
    }
}