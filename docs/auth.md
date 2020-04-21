# Auth

## Authentication

All non-administrator roles should use a token key to access the API. Roles are assigned to a token on per-resource basis. This enables the flexibility of having a single token with different roles across different resources in the system. If no role is assigned to a token then access is denied. 

You can generate tokens & assign roles in sheet **Authentication**.

| Column  | Description                             |
| --------|-----------------------------------------|
| token   | Token value                             |
| roles   | Multiple roles separated by commas      |

Token value need to have the properties that they:
- uniquely identify an authorized API role
- authenticate that user -- cannot be guessed/forged

**Note**: You might use some online password generator tools to generate random & secured token.

## Authorization

Sheet API offers granular role-based access control to all resources in the system. APIs can be given `guest` access by assigning a default role to an application, detailing what resources should be accessible without user authentication. This is useful, if your API has an open mode.

### Define Rules

__All reject rules higher than any accept rule!__

Start your rule without any flag to create an accept rule

```
accept.rule
```

Start your rule with `!` flag to create a reject rule

```
!reject.rule
```

Start your rule with `@` flag to ignore it

```
@ignored.rule
```
#### Rule Convention

The rule name formed by the following format

```
resource.action
```

- **resource** - The resource name
- **action** - The action might be **create**, **read**, **update**, **delete** and __*__ covers 4 actions. By default, GET request (verb GET) equals to   **read* action.

You could list all rules in sheet **Authorization**

| Column  | Description                             |
| --------|-----------------------------------------|
| rule    | Rule name                               |
| role    | The role will be applied by rule        |
