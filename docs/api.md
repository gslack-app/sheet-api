## API

The Sheet API is a Web API implementation of the Google Spreadsheet interface, allowing access to data on a specific sheet. Access is granted to everything based on the role access assigned to the token. You might call Sheet API RESTful or not ;-)

### Layout

The layout of the typical  Sheet API API call can best be described as follows...

```
<verb> https://<script_url>?url=/api/v1/<resource-path>[&<param-name>=<param-value>]
```

with the following breakdown for each part...

- **verb** - The HTTP verb (GET or POST) matching the use of the API call.
- **script-url** - The URL of published Sheet API app.
- **resource-path** - This path may include multiple sections divided by '/' as such to define the resource.
- **param-name** - Query string parameter, which vary by API.
- **param-value** - Query string parameter value. **Note**: Each value must be properly encoded.

## Verbs

Due to the barrier of Google Apps Script, the API ONLY supports GET & POST verbs.

### Common Parameters

#### API Token

The API token is required in most Web API calls to your API, and is used as part of the system authentication process. You can generate token when you create each application and can be regenerated if compromised.

#### Request Format

For request data formats, the default is JSON.

#### Response Format

**application/json** is the default content type for the API.

