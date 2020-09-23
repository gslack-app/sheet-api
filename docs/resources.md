# Resources

The Sheet API maps the sheet of Google spreadsheet to a resource name. You can add/delete/update resources exposed by Sheet API in sheet **Resources**

| Column  | Description                                                         |
| --------|---------------------------------------------------------------------|
| name    | Resource name See [Naming Syntax](#naming-syntax)                   |
| url     | Spreadsheet url                                                     |
| sheet   | Sheet name that resource wraps                                      |
| limitGet| The number of items returned by GET action. If has no value then use the value of **app.query.limit**  |

**Note**: The account that used to publish app should have the permission to access spreadsheets specified by urls.

# Schemas

In Sheet API, schemas are dynamic. What this means is you can easily add/remove a schema without altering any code. The schema resource provides a way of managing the resource layout, usable fields, their storage types and requirements. By "schema", we mean in its traditional SQL database sense, i.e. a set of properties that define the layout of tables and their fields. You can add/delete/update schemas in sheet **Schemas**. 

Every sheet has a primary column. This column is mandatory and cannot be deleted from a sheet. 

| Column  | Description                                                         |
| --------|---------------------------------------------------------------------|
| resource| Resource name that the schema associated                            |
| column  | Sheet column name. See [Naming Syntax](#naming-syntax)              |
| alias   | The property name that returned by Sheet API result                 |
| type    | The property data type. This can be: **boolean**, **date**, **number**, **string**, **email**, **url** |
| primary | If has value then the **column** is primrary column. The value could be: **auto**, **uuid**, **custom** |
| default | The default value when inserting                                    |
| format  | The format expression when outputing property value. See [Format Options](#format-options) |
| seed    | The starting value for a **auto** primary column                      |
| step    | The increment used by **auto** primary column                         |
| validation | See [Data Validation](#data-validation)                            |

## Naming Syntax

- An identifier must begin with a letter, an underscore. The remaining part of identifier can contain letters, digits, ( _ ), ( - ), ( . ) and ( @ ).
- Whitespaces are not allowed. Neither it can have symbols other than letter, digits, ( _ ), ( - ), ( . ) and ( @ ).
- The maximum length of a valid name is 36 characters.

## Primary Column Properties

- The column is always of the **string**/**number** column type
- When you create a new item in sheet, the primary column is set automatically with primary **auto** & **uuid** 

## Format Options

- Formats date according to specification described in Java SE SimpleDateFormat class. Please visit the specification at http://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html
- For string format, performs sprintf-like string formatting using '%'-style format strings.

## Data Validation

Data validation is focused on verifying an atomic data item. 

### Basic Type Validators

- boolean
- date
- number
- string
- empty - valid if value is null or undefined
- regexp
- required - valid if value is not null and not empty

### Composite Type Validators

- arrayOf(v:Validator) - valid if value is an array where every element is validated by v
- oneOf(...refs:[]any) - valid if value is strictly deeply equal to any element of refs
- optional(v:validator) - valid if value is either validated by v or null/undefined

### Logical validators

- and(...vs:[]validator) - valid if value is validated by every validator of vs
- or(...vs:[]validator) - valid if value is validated by every validator of vs
- not(v:validator) - valid if value is invalidated by v
- is(ref:any) - valid if value is strictly deeply equal to ref

### Examples

- string('I am a string')
- or(string, number)
- and(string, regex(/abc/i))
- optional(string)
- is('test')
- oneOf('apple', 'beer')
- arrayOf(string)

If you enjoy my work, please consider supporting what I do. Thank you.

<a href='https://ko-fi.com/siquylee' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://az743702.vo.msecnd.net/cdn/kofi2.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>