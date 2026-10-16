# Math Practice

A browser-based arithmetic practice app for children ages 7–12. It is built with
React, TypeScript, and Vite, and is intended for static deployment on Netlify.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Vite prints the local development URL in the terminal.

## Check code quality

```bash
npm run lint
npm run format
```

To apply Prettier formatting instead of checking it:

```bash
npm run format:write
```

## Run tests

```bash
npm test
```

For watch mode during development:

```bash
npm run test:watch
```

## Production build

```bash
npm run build
```

The static production files are generated in `dist/`. Configure Netlify with
`npm run build` as the build command and `dist` as the publish directory.
