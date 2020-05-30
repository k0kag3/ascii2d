import bytes from 'bytes';
import FormData from 'form-data';
import fs from 'fs';
import {JSDOM} from 'jsdom';
import fetch from 'node-fetch';

type SearchMode = 'color' | 'bovw';
type FileType = 'jpeg' | 'png';
type SourceType =
  | 'pixiv'
  | 'twitter'
  | 'amazon'
  | 'dlsite'
  | 'tinami'
  | 'ニコニコ静画';

export interface Author {
  name: string;
  url: string;
}

export interface ExternalSource {
  type: 'external';
  ref: string;
  content: string;
}

export interface Source {
  type: SourceType;
  title: string;
  url: string;
  author?: Author;
}

export interface Item {
  hash: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileType: FileType;
  fileSize: number;
  source: Source | ExternalSource | undefined;
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

function parseItem(detailBox: Element): Item {
  const hash = detailBox.querySelector<HTMLDivElement>('.hash')!.textContent!;
  const [size, fileType, fileSizeString] = detailBox
    .querySelector<HTMLSpanElement>('small.text-muted')!
    .textContent!.split(' ');
  const thumbnailUrl =
    'https://ascii2d.net' +
    detailBox.querySelector<HTMLImageElement>('.image-box > img')!.src;
  const [width, height] = size.split('x').map((s) => parseInt(s));
  const fileSize = bytes(fileSizeString);

  const item = {
    hash,
    thumbnailUrl,
    width,
    height,
    fileType: fileType.toLowerCase() as FileType,
    fileSize,
  } as Item;

  item.source = (() => {
    const detailElement = detailBox.querySelector('.detail-box');
    if (detailElement && detailElement.textContent!.trim() !== '') {
      const infoHeader = detailElement.querySelector('.info-header');
      const sourceElement = detailElement.querySelector('h6');
      if (infoHeader) {
        // external
        return {
          type: 'external',
          ref: infoHeader.textContent,
          content: detailElement
            .querySelector('.external')!
            .textContent!.trim(),
        } as ExternalSource;
      } else if (sourceElement) {
        const anchors = Array.from(
          sourceElement.querySelectorAll<HTMLAnchorElement>('a')!,
        );
        if (anchors[0] && anchors[0].textContent === 'amazon') {
          // amazon
          return {
            type: 'amazon',
            title: sourceElement.childNodes[0].textContent!.trim(),
            url: anchors[0].href,
          } as Source;
        } else {
          // typical
          const [titleElement, authorElement] = anchors;
          return {
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
        }
      }
      return undefined;
    }
  })();

  return item;
}

function parseSearchResult(htmlString: string): Item[] {
  const document = getDocument(htmlString);
  const items = Array.from(document.querySelectorAll('.item-box'))
    .slice(1)
    .map(parseItem);
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

  const url = response.headers.get('location');
  if (!url) {
    throw new Error(`Image size is too large`);
  }
  const searchHash = url.match(/\/([^/]+)$/)?.[1];
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
