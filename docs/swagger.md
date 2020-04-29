# Swagger

As developers, one of the most cumbersome tasks we often face in our day-to-day lives is writing good and understandable documentation. It doesn't matter if our documentation is only a few lines long explaining the core functionality of a feature or if it's a full-blown essay demonstrating the ins and outs of a system. What matters is that the message we're trying to convey through our documentation is precise and understandable.

In order to generate the REST API documentation, Sheet API uses a combination of the OpenAPI specification and Swagger UI.

## Parameters

Sheet API Swagger uses some settings to generate the adequate documentation.
- To edit the settings, select the **File** > **Project properties** menu item in the script editor.
- In the **Project properties** dialog, switch to **Script properties** tab


| Property           | Default Value  | Description                                                          |
| -------------------|----------------| ---------------------------------------------------------------------|
| app.name           | Sheet API      | The name of app which is also the name of added menu in Google Sheet |
| app.title          | Sheet REST API | The API document title                                               |
| app.description    |                | The API document descritpion                                         |
| app.version        | 1.0.0          | The API version                                                      |
| app.contact.name   | GSlack Team    | Contact name                                                         |
| app.contact.url    | https://gslack.app | Contact website address                                          |
| app.contact.email  | info@gslack.app| Contact email                                                        |

## Swagger UI

Swagger UI allows anyone — be it your development team or your end consumers — to visualize and interact with the API’s resources without having any of the implementation logic in place. It’s automatically generated from Sheet API Swagger Specification, with the visual documentation making it easy for back end implementation and client side consumption.

- Goto [Swagger Editor](http://editor.swagger.io/)
- Select **File** > **Import URL**
- Input the url of published app (`<script_url>`)

With the generated Swagger documentation, you're able to instantly learn what REST endpoints your application has registered, what HTTP methods are available for each endpoint and execute HTTP requests for those endpoints directly from the Swagger UI. If you're not sure what is required in the request body, you can find the request body models at the bottom of the documentation, under the **Models** section.

## Swagger Codegen

Select **Generate Client** and choose the language of your choice. The end result is a zip file you can download with the generated client code. There are many supported languages, you can generate clients for Python, Ruby, Java, C#, Scala and many more.

## Known Issues

- Only support Swagger 2.0
- Swagger UI works fine with GET requests/responses BUT has issues when handling Google Apps Script POST response due to 301 status. You might try Postman or other REST tools to invoke POST requests.
