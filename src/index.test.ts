import * as lib from './index';

it('searchByUrl', async () => {
  const result = await lib.searchByUrl(
    'https://unity-chan.com/images/imgKohaku.png',
    'bovw',
  );
  console.log(result.url);
  // console.log(JSON.stringify(result, null, 2));
});

it('searchByFile', async () => {
  const result = await lib.searchByFile('test.jpg');
  console.log(result.url);
  // console.log(JSON.stringify(result, null, 2));
});
