# API

The Sheet API is a Web API implementation of the Google Spreadsheet interface, allowing access to data on a specific sheet. Access is granted to everything based on the role access assigned to the apiKey. You might call Sheet API RESTful or not ;-)

## Layout

The layout of the typical  Sheet API API call can best be described as follows...

```
<verb> https://<script_url>?url=/api/<resource-path>[&<param-name>=<param-value>]
```

with the following breakdown for each part...

- **verb** - The HTTP verb (GET or POST) matching the use of the API call.
- **script-url** - The URL of published Sheet API app.
- **resource-path** - This path (route) may include multiple sections divided by '/' as such to define the resource.
- **param-name** - Query string parameter, which vary by API.
- **param-value** - Query string parameter value. **Note**: Each value must be properly encoded.

## Verbs

Due to the barrier of Google Apps Script, Sheet API ONLY supports GET & POST verbs.

## Common Parameters

### API Key

The API key is required in most Web API calls to your API, and is used as part of the system authentication process. You can generate apiKey when you create each application and can be regenerated if compromised.

### Request Format

For request data formats, the default is JSON.

### Response Format

**application/json** is the default content type for the API.

### Error Response

This error schema is composed of four parts:

- type -  An URI identifier that categorizes the error, always starts with `error`
- status - The HTTP response code
- title - A brief, human-readable message about the error
- detail - A human-readable explanation of the error detail (optional)

**Examples**

```json
{
  "type": "error",
  "status": 404,
  "title": "Not Found",
  "detail": null
}
```

Some common response codes include:

- **400 Bad Request** — Client sent an invalid request — such as lacking required request body or parameter
- **401 Unauthorized** — Client failed to authenticate with the server
- **403 Forbidden** — Client authenticated but does not have permission to access the requested resource
- **404 Not Found** — The requested resource does not exist
- **500 Internal Server Error** — A generic error occurred on the server

## Read (GET)

Resources are retrieved by performing HTTP GET requests. There are two main methods to retrieve resources. The first method involves requesting a list of resources, the second method is when a single resource is requested. Requests to a single resource are marked by the presence of the resource id in the URL of the request. 

### Retrieving multiple resources

Reading lists of resources (the default limit is 20) is done by requesting a resource endpoint without specifying an individual resources id. Sometimes resources require query string parameters or else they cannot produce valid lists.

```
GET https://<script_url>?url=/api/<resource-name>
```

**Examples** Get the first 20 posts

```
GET https://<script_url>?url=/api/posts
```

### Retrieving individual resources

Resources are retrieved on an individual basis by providing the id of the resource in the URL of the resource endpoint. Some API endpoints also allow specifying individual resources by providing uniquely identifying query string parameters.

```
GET https://<script_url>?url=/api/<resource-name>/<id>
```

**Examples**

```
GET https://<script_url>?url=/api/posts/1
```

### Filter

The `filter` param is used to return only rows that match a specified condition. The simple comparison operators are `<=`, `<`, `>`, `>=`, `=`, `!=`, `<>`. Both comparison operators `!=` `<>` mean not-equal. Strings are compared by lexicographic value. Comparing to null is done using `is null` or `is not null`.

You can join multiple conditions using the logical operators `and`, `or`, and `not`. Parentheses can be used to define explicit precedence. The `filter` clause also supports some more complex string comparison operators. These operators take two strings as arguments; any non-string arguments (for example, dates or numbers) will be converted to strings before comparison.  String matching is case sensitive (you can use upper() or lower() scalar functions to work around that).
- `contains` - A substring match. whole contains part is true if part is anywhere within whole. Example: `name contains 'John'` matches 'John', 'John Adams', 'Long John Silver' but not 'john adams'.
- `starts with` - A prefix match. value starts with prefix is true if prefix is at the beginning of value. Examples: `dept starts with 'engineering'` matches 'engineering' and 'engineering managers'. `dept starts with 'e'` matches 'engineering', 'eng', and 'e'.
- `ends with` - A suffix match. value ends with suffix is true if suffix is at the end of value. Example: `role ends with 'y'` matches 'cowboy', 'boy', and 'y'.
- `matches` - A (preg) regular expression match. haystack matches needle is true if the regular expression in needle matches haystack. Examples: `country matches '.*ia'` matches India and Nigeria, but not Indiana. Note that this is not a global search, so where country matches 'an' will not match 'Canada'.
- `like` - A text search that supports two wildcards: `%`, which matches zero or more characters of any kind, and `_` (underscore), which matches any one character. This is similar to the SQL LIKE operator. Example:  `name like fre%` matches 'fre', 'fred', and 'freddy'.

**Examples**

```
salary >= 600
dept != 'Eng' and date '2005-01-21' < hireDate
(dept<>'Eng' and isSenior=true) or (dept='Sales') or seniorityStartTime is null
```

```
GET https://<script_url>?url=/api/employees&where=salary+%3E%3D+600
GET https://<script_url>?url=/api/employees&where=dept+!%3D+'Eng'+and+date+'2005-01-21'+%3C+hireDate
GET https://<script_url>?url=/api/employees&where=(dept%3C%3E'Eng'+and+isSenior%3Dtrue)+or+(dept%3D'Sales')+or+seniorityStartTime+is+null
```

### Paginate

By default, GET operations, which return a list of requested items, return only the first 20 items. To get a different set of items, you can use the `offset` and `limit` parameters in the query string of the GET request.

**Examples**

```
GET https://<script_url>?url=/api/employees&limit=20&offset=100
```

This query would return the 20 rows starting with the 100th row. To get all rows, you should use `limit=0` as query param and set `limitGet` of resource to 0 in sheet `Schemas`.

### Sort

Add `order` (ascending order by default)

**Examples**

```
GET https://<script_url>?url=/api/employees&order=salary+desc
```

For multiple fields, separate with commas:

```
GET https://<script_url>?url=/api/employees&order=salary+desc%2ChireDate+asc
```

## Create (POST)

Resources are created by sending HTTP POST requests to the API. The type of resource is determined by the URL of the request. The body of the request should contain a JSON object describing the resource to create. The object in the request body determines the initial state of the resource will be when it is created. Some resources require certain properties be provided when they are created, others can be created with an empty JSON object.

```
POST https://<script_url>?url=/api/create/<resource-name>
```

**Examples**

```
POST https://<script_url>?url=/api/create/contacts
```

JSON Payload

```json
{
    "first_name": "Josephine",
    "last_name": "Darakjy",
    "company": "Chanay, Jeffrey A Esq",
    "email": "josephine_darakjy@darakjy.org",
    "url": "http://www.chanayjeffreyaesq.com",
    "phone": "810-292-9388",
    "state": "MI"
  }
```

### Return Value

The successful result contain an array of created object.

UPDATE.

## Update (POST)

Updates are performed by issuing POST PATCH requests to the URL that the resource is located at. When a POST request is performed, the properties of the request body are read, and if the resource has a property with the same name the property of the resource will be set to the new value.

```
POST https://<script_url>?url=/api/update/<resource-name>/id
```

**Examples**

```
POST https://<script_url>?url=/api/update/contacts/101
```

JSON Payload

```json
{
    "first_name": "Minna",
    "last_name": "Amigon"
}
```

### Return Value

The successful result contain an array of updated object.

## Delete (POST)

Resources are deleted by sending an HTTP POST request to the URL that the resource is located at. This is the URL that contains the id of the resource.

```
POST https://<script_url>?url=/api/delete/<resource-name>/id
```

**Examples**

```
POST https://<script_url>?url=/api/delete/contacts/101
```

### Return Value

The successful result contain an array of deleted object.

## Bulk Create/Update/Delete (POST)

Sheet API that allows a user to send a collection of `resource` in single request using param `batch=1`

**Examples**

```
POST https://<script_url>?url=/api/create/contacts?batch=1
POST https://<script_url>?url=/api/update/contacts?batch=1
POST https://<script_url>?url=/api/delete/contacts?batch=1
```

The request body for `Create` or `Update` action

```json
[
  {
    "id": 101,
    "first_name": "Josephine",
    "last_name": "Darakjy",
    "company": "Chanay, Jeffrey A Esq",
    "email": "josephine_darakjy@darakjy.org",
    "url": "http://www.chanayjeffreyaesq.com",
    "phone": "810-292-9388",
    "state": "MI"
  },
  {
    "id": 102,
    "first_name": "Simona",
    "last_name": "Morasca",
    "company": "Chapman, Ross E Esq",
    "email": "simona@morasca.com",
    "url": "http://www.chapmanrosseesq.com",
    "phone": "419-503-2484",
    "state": "OH"
  }
]
```

for `Delete` action, the request body should be the array of resource id

**Examples**

```json
[101, 102]
```

### Return Value

The successful result contain an array of created/updateddeleted objects.

