# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

### Installation

```
$ npm install
```

### Local Development

```
$ npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Generate LLM.txt files

```
$ npm run generate:llms
```

This command generates `LLM.txt` files used for SEO purposes.

### Generate docs

```
$ npm run generate:docs
```

This command generates documentation files for the website using the custom LanguageInclude system. To see how to use LanguageInclude, check out the [Language Include documentation](./LANGUAGE-INCLUDE.md).

### Watch docs generation

```
$ npm run generate:docs:watch
```

Watches for changes and regenerates documentation files automatically.

### TypeScript type checking

```
$ npm run typecheck
```

Runs TypeScript type checking on the codebase.

### Prebuild

```
$ npm run prebuild
```

Runs docs generation before building the site.

### Scaffold folders/files

```
$ npm run scaffold -- <path>
```

Scaffolds template/include folders and files. See `src/scripts/scaffold.js` for details.
