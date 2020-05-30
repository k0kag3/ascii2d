import bytes from 'bytes';
import FormData from 'form-data';
import fs from 'fs';
import {JSDOM} from 'jsdom';
import fetch from 'node-fetch';

type SearchMode = 'color' | 'bovw';
type FileType = 'jpeg' | 'png';
type SourceType = 'pixiv' | 'twitter' | 'amazon' | 'ニコニコ静画';

export interface Author {
  name: string;
  url: string;
}

export interface Source {
  type: SourceType;
  title: string;
  url: string;
  author?: Author;
}

export interface Item {
  hash: string;
  width: number;
  height: number;
  fileType: FileType;
  fileSize: number;
  source: Source | string | undefined;
}

export interface SearchResult {
  url: string;
  items: Item[];
}

function getDocument(htmlString: string) {
  const {
    window: {document},
  } = new JSDOM(htmlString);
  return document;
}

async function fetchDOM(endpoint: string) {
  return getDocument(await fetch(endpoint).then((res) => res.text()));
}

async function getAuthToken() {
  const document = await fetchDOM('https://ascii2d.net/');
  const token = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  )!.content;
  return token;
}

function parseSearchResult(htmlString: string): Item[] {
  const document = getDocument(htmlString);
  const items = Array.from(document.querySelectorAll('.item-box'))
    .slice(1)
    .map((item) => {
      const hash = item.querySelector<HTMLDivElement>('.hash')!.textContent!;
      const [size, fileType, fileSizeString] = item
        .querySelector<HTMLSpanElement>('small.text-muted')!
        .textContent!.split(' ');
      const [width, height] = size.split('x').map((s) => parseInt(s));
      const fileSize = bytes(fileSizeString);

      const parsed = {
        hash,
        width,
        height,
        fileType: fileType.toLowerCase() as FileType,
        fileSize,
      } as Item;

      const detailElement = item.querySelector('.detail-box');
      if (detailElement) {
        const sourceElement = detailElement.querySelector('h6');
        if (sourceElement) {
          const anchors = Array.from(
            sourceElement.querySelectorAll<HTMLAnchorElement>('a')!,
          );
          // amazon
          if (anchors[0] && anchors[0].textContent === 'amazon') {
            const source = {
              type: 'amazon',
              title: sourceElement.childNodes[0].textContent!.trim(),
              url: anchors[0].href,
            } as Source;
            parsed.source = source;
          } else {
            const [titleElement, authorElement] = anchors;
            const source = {
              type: sourceElement
                .querySelector('small')!
                .textContent!.trim() as SourceType,
              title: titleElement.textContent!,
              url: titleElement.href,
              author: {
                name: authorElement.textContent!,
                url: authorElement.href,
              },
            } as Source;
            parsed.source = source;
          }
        } else {
          parsed.source = detailElement
            .querySelector('.external')!
            .textContent!.trim();
        }
      }

      return parsed;
    });
  return items;
}

async function getSearchHash(query: string | fs.ReadStream) {
  const searchType = query instanceof fs.ReadStream ? 'file' : 'uri';
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('authenticity_token', token);
  formData.append(searchType, query);
  const response = await fetch(`https://ascii2d.net/search/${searchType}`, {
    method: 'POST',
    body: formData,
    redirect: 'manual',
  });

  const url = response.headers.get('location')!;
  const searchHash = url.match(/\/([^/]+)$/)![1];
  return searchHash;
}

export async function searchByUrl(
  imageUrl: string,
  mode: SearchMode = 'color',
): Promise<SearchResult> {
  const hash = await getSearchHash(imageUrl);
  const url = `https://ascii2d.net/search/${mode}/${hash}`;
  const result = await fetch(url).then((res) => res.text());
  const items = parseSearchResult(result);

  return {url, items};
}

export async function searchByFile(
  filePath: string,
  mode: SearchMode = 'color',
): Promise<SearchResult> {
  const readStream = fs.createReadStream(filePath);
  const hash = await getSearchHash(readStream);
  const url = `https://ascii2d.net/search/${mode}/${hash}`;
  const result = await fetch(url).then((res) => res.text());
  const items = parseSearchResult(result);

  return {url, items};
}
