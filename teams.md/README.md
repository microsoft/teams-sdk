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
