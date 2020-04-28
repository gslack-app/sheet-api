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
        let errorType = 'ApiError';
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
            paths: this.paths,
            definitions: this.definitions,
            parameters: this.createSharedQueryParam(),
            securityDefinitions: this.securityDefinitions,
            security: [{ apiKey: [] }],
            tags: this.generateTags(resources)
        };
        this.doc.definitions[errorType] = this.generateErrorDefinition();
    }

    getJSON(): string {
        return JSON.stringify(this.doc);
    }

    //#region Info & Contact, License
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
    //#endregion

    //#region Paths
    private generatePaths(resources: string[], recs: Schema[], errorType: string): Record<string, PathItem> {
        let paths: Record<string, PathItem> = {};
        resources.forEach(type => {
            let items = recs.filter(r => r.resource === type);
            let listAll: PathItem = {};
            listAll.get = this.createListOperation(type, items, errorType);
            let showDetail: PathItem = {};
            showDetail.get = this.createShowDetailOperation(type, 'id', items, errorType);
            let create: PathItem = {};
            create.post = this.createInsertOperation(type, errorType);
            let bulkCreate: PathItem = {};
            bulkCreate.post = this.createBulkInsertOperation(type, errorType);
            let update: PathItem = {};
            update.post = this.createUpdateOperation(type, 'id', errorType);
            let bulkUpdate: PathItem = {};
            bulkUpdate.post = this.createBulkUpdateOperation(type, errorType);
            let remove: PathItem = {};
            remove.post = this.createDeleteOperation(type, 'id', errorType);
            let bulkRemove: PathItem = {};
            bulkRemove.post = this.createBulkDeleteOperation(type, errorType);
            paths[`/${type}`] = listAll;
            paths[`/${type}/{id}`] = showDetail;
            paths[`/create/${type}`] = create;
            paths[`/bulk/create/${type}`] = bulkCreate;
            paths[`/update/${type}/{id}`] = update;
            paths[`/bulk/update/${type}`] = bulkUpdate;
            paths[`/delete/${type}/{id}`] = remove;
            paths[`/bulk/delete/${type}`] = bulkRemove;
        });
        return paths;
    }

    //#region Read
    private createListOperation(resource: string, recs: Schema[], errorType: string): Operation {
        let op: Operation = {
            summary: `List ${resource}`,
            operationId: `get${this.titleCase(resource)}`,
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

    private createShowDetailOperation(resource: string, id: string, recs: Schema[], errorType: string): Operation {
        let op: Operation = {
            summary: `Show ${resource} details`,
            tags: [resource],
            parameters: [],
            responses: {}
        };
        op.parameters.push({
            name: id,
            required: true,
            in: 'path',
            type: 'string',
            description: `The ID of the specified instance.`

        } as Parameter);
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
    //#endregion

    //#region Create
    private createInsertOperation(resource: string, errorType: string): Operation {
        let op: Operation = {
            summary: `Create ${resource}`,
            operationId: `create${this.titleCase(resource)}`,
            tags: [resource],
            parameters: [],
            responses: {}
        };
        op.parameters.push({
            name: 'body',
            in: 'body',
            required: true,
            schema: {
                $ref: `#/definitions/${resource}`
            }
        });
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

    private createBulkInsertOperation(resource: string, errorType: string): Operation {
        let op: Operation = {
            summary: `Create multiple ${resource}`,
            operationId: `createMultiple${this.titleCase(resource)}`,
            tags: [resource],
            parameters: [],
            responses: {}
        };
        op.parameters.push({
            name: 'body',
            in: 'body',
            required: true,
            schema: {
                type: 'array',
                items: {
                    $ref: `#/definitions/${resource}`
                } as any
            }
        });
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
    //#endregion

    //#region Update
    private createUpdateOperation(resource: string, id: string, errorType: string): Operation {
        let op: Operation = {
            summary: `Update ${resource}`,
            operationId: `update${this.titleCase(resource)}`,
            tags: [resource],
            parameters: [],
            responses: {}
        };
        op.parameters.push({
            name: id,
            required: true,
            in: 'path',
            type: 'string',
            description: `The ID of the specified instance.`

        } as Parameter);
        op.parameters.push({
            name: 'body',
            in: 'body',
            required: true,
            schema: {
                $ref: `#/definitions/${resource}`
            }
        });
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

    private createBulkUpdateOperation(resource: string, errorType: string): Operation {
        let op: Operation = {
            summary: `Update multiple ${resource}`,
            operationId: `updateMultiple${this.titleCase(resource)}`,
            tags: [resource],
            parameters: [],
            responses: {}
        };
        op.parameters.push({
            name: 'body',
            in: 'body',
            required: true,
            schema: {
                type: 'array',
                items: {
                    $ref: `#/definitions/${resource}`
                } as any
            }
        });
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
    //#endregion

    //#region Delete
    private createDeleteOperation(resource: string, id: string, errorType: string): Operation {
        let op: Operation = {
            summary: `Delete ${resource}`,
            operationId: `delete${this.titleCase(resource)}`,
            tags: [resource],
            parameters: [],
            responses: {}
        };
        op.parameters.push({
            name: id,
            required: true,
            in: 'path',
            type: 'string',
            description: `The ID of the specified instance.`

        } as Parameter);
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

    private createBulkDeleteOperation(resource: string, errorType: string): Operation {
        let op: Operation = {
            summary: `Delete multiple ${resource}`,
            operationId: `deleteMultiple${this.titleCase(resource)}`,
            tags: [resource],
            parameters: [],
            responses: {}
        };
        op.parameters.push({
            name: 'body',
            in: 'body',
            required: true,
            schema: {
                type: 'array',
                items: {
                    type: 'string'
                }
            }
        });
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
    //#endregion

    //#endregion

    //#region Definitions
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
    //#endregion

    //#region Parameters Definitions 
    private createSharedQueryParam(): Record<string, Parameter> {
        let params: Record<string, Parameter> = {};
        params['offset'] = this.createParameter('offset', 'query', 'integer');
        params['limit'] = this.createParameter('limit', 'query', 'integer');
        params['filter'] = this.createParameter('filter', 'query', 'string');
        params['order'] = this.createParameter('orderby', 'query', 'string');
        return params;
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
    //#endregion

    //#region Security Definitions & Tags
    private generateSecurityDefinitions(): Record<string, SecurityScheme> {
        return {
            'apiKey': {
                type: 'apiKey',
                name: "apiKey",
                in: 'query'
            }
        };
    }

    private generateTags(resources: string[]): Tag[] {
        return resources.map(r => {
            let t: Tag = { name: r };
            return t;
        });
    }
    //#endregion

    //#region Utils Functions
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

    private titleCase(word: string): string {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }
    //#endregion
}