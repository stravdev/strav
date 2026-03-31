# @stravigor/create

Scaffold a new [Strav](https://www.npmjs.com/package/@stravigor/core) application.

## Usage

```bash
bunx @stravigor/create@latest my-app --api   # headless REST API
bunx @stravigor/create@latest my-app --web   # full-stack with views
bunx @stravigor/create@latest my-app         # interactive prompt
```

## Templates

- **api** — Headless REST API with CORS enabled
- **web** — Full-stack with `.strav` views, sessions, and static files

## Options

```
bunx @stravigor/create <project-name> [options]

--api                     Headless REST API template
--web                     Full-stack template with views and static files
--template, -t api|web    Alias for --api / --web
--db <name>               Database name (default: project name)
-h, --help                Show help
```

## What's scaffolded

```
my-app/
├── index.ts              Server entry point
├── strav.ts              CLI (migrations, generators)
├── config/               Configuration files
├── database/schemas/     Schema definitions
├── start/routes.ts       Route registration
├── tests/                Test files
├── .env                  Environment variables
└── package.json
```

## License

MIT
