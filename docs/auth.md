# Auth

## Authentication

All non-administrator roles should use an apiKey key to access the API. Roles are assigned to an apiKey on per-resource basis. This enables the flexibility of having a single apiKey with different roles across different resources in the system. If no role is assigned to an apiKey then access is denied. 

You can generate apiKey & assign roles in sheet **Authentication**.

| Column  | Description                             |
| --------|-----------------------------------------|
| apiKey  | apiKey value                            |
| roles   | Multiple roles separated by commas      |

apiKey value need to have the properties that they:
- uniquely identify an authorized API role
- authenticate that user -- cannot be guessed/forged

**Note**: You might use some online password generator tools to generate random & secured apiKey.

## Authorization

Sheet API offers granular role-based access control to all resources in the system. APIs can be given `guest` access by assigning a default role to an application, detailing what resources should be accessible without user authentication. This is useful, if your API has an open mode.

You can define rules & applied roles in sheet **Authorization**.

| Column  | Description                             |
| --------|-----------------------------------------|
| rule    | Role name                               |
| roles   | Multiple roles separated by commas      |

### Rule Definition

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

If you enjoy my work, please consider supporting what I do. Thank you.

<a href='https://ko-fi.com/siquylee' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://az743702.vo.msecnd.net/cdn/kofi2.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>