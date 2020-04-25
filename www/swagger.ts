import { Schema } from "./interfaces";

declare type InType = 'query' | 'path' | 'header' | 'cookie';
declare type DataType = 'integer' | 'number' | 'string' | 'boolean' | 'object' | 'array';
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
    parameters?: any;
}

interface Operation {
    tags?: string[];
    summary?: string;
    description?: string;
    externalDocs?: ExternalDoc;
    operationId?: string;
    parameters?: (Parameter | Reference)[];
    requestBody?: RequestBody | Reference;
    responses: Record<'default' | string, Response>;
    // Skip `callbacks`
    deprecated?: boolean;
    security?: Record<string, string[]>;
    servers?: Server[];
}

interface ExternalDoc {
    url: string;
    description?: string;
}

interface Parameter {
    // Fixed Fields
    name: string;
    in: InType;
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    // The rules for serialization
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    schema: SchemaObject | Reference;
    // Skip `example` & `examples` and `content` fields
}

interface SchemaObject {
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
    type?: DataType;
    format?: FormatType;
    properties?: Record<string, any>;
    description?: string;
    default?: any;
    // Skip allOf, oneOf, anyOf, anyOf, not, items, additionalProperties
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
    schema: SchemaObject | Reference;
    // Skip `example` & `examples` fields
    encoding?: Record<string, Encoding>;
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
    schema: SchemaObject | Reference;
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

interface Components {
    schemas: Record<string, SchemaObject>;
    responses?: Record<string, Response>;
    parameters?: Record<string, Parameter>;
    requestBodies?: Record<string, RequestBody>;
    headers?: Record<string, Header>;
    securitySchemes?: Record<string, SecurityScheme>;
    links?: Record<string, Link>;
    // Skip `examples` & `callbacks` fields
}

interface SecurityScheme {
    type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
    description?: string;
    name?: string;
    in?: 'query' | 'header' | 'cookie';
    scheme?: string;
    bearerFormat?: string;
    flows?: Record<'implicit' | 'password' | 'clientCredentials' | 'authorizationCode', OAuthFlow>;
    openIdConnectUrl?: string;
}

interface OAuthFlow {
    authorizationUrl: string;
    tokenUrl: string;
    refreshUrl?: string;
    scopes: Record<string, string>;
}

export class Swagger {
    private doc: any;
    private baseUrl: string;
    readonly openapi: string = '3.0.0';
    info: Info;
    servers: Server[];
    paths: Record<string, PathItem>;
    components: Components;
    security: Record<string, string[]>;
    tags: Tag[];
    externalDocs: ExternalDoc;

    generate(schemas: Schema[], version: string): void {
        this.info = this.generateInfo(version);
        this.servers = this.generateServers();
        this.paths = this.generatePaths(schemas);
        this.components = this.generateComponent(schemas);
        this.security = this.generateSecurity();

        this.doc = {
            openapi: '3.0.0',
            info: this.info,
            server: this.servers,
            paths: this.paths,
            components: this.components,
            security: this.security
        };
    }

    getJSON(): string {
        return JSON.stringify(this.doc);
    }

    private generateInfo(version: string): Info {
        let appName: string = PropertiesService.getScriptProperties().getProperty('app.name') || 'Sheet API';
        let obj: Info = {
            title: `Swagger ${appName}`,
            version: version
        };
        return obj;
    }

    private generateServers(): Server[] {
        let url = ScriptApp.getService().getUrl();
        let server: Server = {
            url: `${url}?url=/api/v1`
        };
        return [server];
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
        op.parameters.push(this.createParameter('offset', 'query', 'integer', 0));
        op.parameters.push(this.createParameter('limit', 'query', 'integer', 20));
        op.parameters.push(this.createParameter('where', 'query', 'string'));
        op.parameters.push(this.createParameter('order', 'query', 'string'));
        op.responses['200'] = {
            description: 'Successful operation',
            content: {
                'application/json': {
                    schema: {
                        $ref: `#/components/schemas/${resource}`
                    }
                }
            }
        }
        return op;
    }

    private generateComponent(recs: Schema[]): Components {
        let schemas: Record<string, SchemaObject> = {};
        let parameters: Record<string, Parameter>;
        let requestBodies: Record<string, RequestBody>;
        let securitySchemes: Record<string, SecurityScheme>;
        let types = recs.map(r => r.resource).filter((value, index, self) => self.indexOf(value) === index);
        types.forEach(type => {
            let items = recs.filter(r => r.resource === type);
            let requiredProps = items.map(i => i.validation).filter(vi => vi && !vi.includes('optional'));
            let schema: SchemaObject = {
                type: 'object',
                properties: {}
            };
            if (requiredProps.length)
                schema.required = requiredProps;
            items.forEach(i => schema.properties[i.alias] = this.createSchemaObject(i));
            schemas[type] = schema;
        });
        return {
            schemas: schemas,
            // parameters: parameters,
            // requestBodies: requestBodies,
            // securitySchemes: securitySchemes
        };
    }

    private createSchemaObject(rec: Schema): SchemaObject {
        let prop: SchemaObject = {};
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
            in: location,
            required: required,
            schema: {
                type: type
            }
        };
        if (defValue)
            (param.schema as SchemaObject).default = defValue;
        return param;

    }

    private generateSecurity(): Record<string, string[]> {
        return {
            api_key: []
        }
    }
}