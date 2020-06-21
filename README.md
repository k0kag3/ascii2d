# ascii2d

[![npm-version]][npm-url]
[![npm-downloads]][npm-url]
[![docs]][docs-url]

[npm-version]: https://badgen.net/npm/v/ascii2d
[npm-downloads]: https://badgen.net/npm/dt/ascii2d
[npm-url]: https://npmjs.org/package/ascii2d
[docs]: https://badgen.net/badge/documentation/available/purple
[docs-url]: https://k0kag3.github.io/ascii2d/modules/_ascii2d_.html

> ascii2d wrapper for Node.js.

## Usage

```bash
yarn add ascii2d
```

```js
import {searchByUrl, searchByFile} from 'ascii2d';

searchByUrl('https://example.com/yourimage.jpg', 'color').then((result) =>
  console.log(result),
);

searchByFile('./input.jpg', 'bovw').then((result) => console.log(result));
```
