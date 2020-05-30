import * as lib from './index';

it.only('searchByUrl', async () => {
  const result = await lib.searchByUrl(
    'https://media.discordapp.net/attachments/715927408053846016/716215082882695168/73741641_p0_master1200.jpg',
    'color',
  );
  console.log(result.url);
  console.log(JSON.stringify(result, null, 2));
});

it('searchByFile', async () => {
  const result = await lib.searchByFile('test.jpg');
  console.log(result.url);
  // console.log(JSON.stringify(result, null, 2));
});
