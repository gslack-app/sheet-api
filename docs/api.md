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
- **resource-path** - This path (route) may include multiple sections divided by '/' as such to define the resource.
- **param-name** - Query string parameter, which vary by API.
- **param-value** - Query string parameter value. **Note**: Each value must be properly encoded.

## Verbs

Due to the barrier of Google Apps Script, the API ONLY supports GET & POST verbs.

## Common Parameters

#### API Token

The API token is required in most Web API calls to your API, and is used as part of the system authentication process. You can generate token when you create each application and can be regenerated if compromised.

#### Request Format

For request data formats, the default is JSON.

#### Response Format

**application/json** is the default content type for the API.

## Routes

### Default Routes

| Verb  | Route                                            | Description                                 |
| ------|--------------------------------------------------|---------------------------------------------|
| GET   | https://<script_url>?url=/api/v1/posts           | Get the first 20 posts (the default limit is 20)|
| GET   | https://<script_url>?url=/api/v1/posts/1         | Get a post with primary column value = 1    |
| POST  | https://<script_url>?url=/api/v1/create/posts    | Create a new post with JSON payload         |
| POST  | https://<script_url>?url=/api/v1/update/posts/1  | Update a post with primary column value = 1 with JSON payload    |
| POST  | https://<script_url>?url=/api/v1/delete/posts/1  | Delete a post with primary column value = 1 |

### Filter

The `where` param is used to return only rows that match a specified condition. The simple comparison operators are `<=`, `<`, `>`, `>=`, `=`, `!=`, `<>`. Both comparison operators `!=` `<>` mean not-equal. Strings are compared by lexicographic value. Comparing to null is done using `is null` or `is not null`.

You can join multiple conditions using the logical operators `and`, `or`, and `not`. Parentheses can be used to define explicit precedence. The `where` clause also supports some more complex string comparison operators. These operators take two strings as arguments; any non-string arguments (for example, dates or numbers) will be converted to strings before comparison.  String matching is case sensitive (you can use upper() or lower() scalar functions to work around that).
- `contains` - A substring match. whole contains part is true if part is anywhere within whole. Example: `name contains 'John'` matches 'John', 'John Adams', 'Long John Silver' but not 'john adams'.
- `starts with` - A prefix match. value starts with prefix is true if prefix is at the beginning of value. Examples: `dept starts with 'engineering'` matches 'engineering' and 'engineering managers'. `dept starts with 'e'` matches 'engineering', 'eng', and 'e'.
- `ends with` - A suffix match. value ends with suffix is true if suffix is at the end of value. Example: `role ends with 'y'` matches 'cowboy', 'boy', and 'y'.
- `matches` - A (preg) regular expression match. haystack matches needle is true if the regular expression in needle matches haystack. Examples: `country matches '.*ia'` matches India and Nigeria, but not Indiana. Note that this is not a global search, so where country matches 'an' will not match 'Canada'.
- `like` - A text search that supports two wildcards: `%`, which matches zero or more characters of any kind, and `_` (underscore), which matches any one character. This is similar to the SQL LIKE operator. Example:  `name like fre%` matches 'fre', 'fred', and 'freddy'.

**Examples**:

```
salary >= 600
dept != 'Eng' and date '2005-01-21' < hireDate
(dept<>'Eng' and isSenior=true) or (dept='Sales') or seniorityStartTime is null
```

```
GET https://<script_url>?url=/api/v1/employees&where=salary+%3E%3D+600
GET https://<script_url>?url=/api/v1/employees&where=dept+!%3D+'Eng'+and+date+'2005-01-21'+%3C+hireDate
GET https://<script_url>?url=/api/v1/employees&where=(dept%3C%3E'Eng'+and+isSenior%3Dtrue)+or+(dept%3D'Sales')+or+seniorityStartTime+is+null
```

### Paginate

By default, GET operations, which return a list of requested items, return only the first 20 items. To get a different set of items, you can use the `offset` and `limit` parameters in the query string of the GET request.

```
GET https://<script_url>?url=/api/v1/employees&limit=20&offset=100
```

This query would return the 20 rows starting with the 100th row.

### Sort

Add `order` (ascending order by default)

```
GET https://<script_url>?url=/api/v1/employees&order=salary+desc
```

For multiple fields, use the following format:

```
GET https://<script_url>?url=/api/v1/employees&order=salary+desc%2ChireDate+asc
```



