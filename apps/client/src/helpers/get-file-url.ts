import type { TFile } from '@connectmessager/shared';

const getHostFromServer = () => {
  if (import.meta.env.MODE === 'development') {
    return 'localhost:4991';
  }

  return window.location.host;
};

const getUrlFromServer = () => {
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:4991';
  }

  const host = window.location.host;
  const currentProtocol = window.location.protocol;

  const finalUrl = `${currentProtocol}//${host}`;

  return finalUrl;
};

type TGetFileUrlOptions = {
  includeVersion?: boolean;
};

const buildFileUrl = (
  fileName: string,
  accessToken?: string,
  versionKey?: string | null
) => {
  const url = getUrlFromServer();
  const encodedBaseUrl = encodeURI(`${url}/public/${fileName}`);
  const parsedUrl = new URL(encodedBaseUrl);

  if (accessToken) {
    parsedUrl.searchParams.set('accessToken', accessToken);
  }

  if (versionKey) {
    parsedUrl.searchParams.set('v', versionKey);
  }

  return parsedUrl.toString();
};

const getFileUrl = (
  file: TFile | undefined | null,
  options?: TGetFileUrlOptions
) => {
  if (!file) return '';

  const includeVersion = options?.includeVersion ?? true;
  const versionKey = includeVersion
    ? file.md5 || (typeof file.createdAt === 'number' ? String(file.createdAt) : '0')
    : null;

  return buildFileUrl(file.name, file._accessToken, versionKey);
};

const getFileThumbnailUrl = (file: TFile | undefined | null) => {
  if (!file) return '';

  const lastSlashIndex = file.name.lastIndexOf('/');
  const directory = lastSlashIndex >= 0 ? file.name.slice(0, lastSlashIndex + 1) : '';
  const fileName = lastSlashIndex >= 0 ? file.name.slice(lastSlashIndex + 1) : file.name;
  const dotIndex = fileName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;

  return buildFileUrl(`${directory}${baseName}_thumb.png`, file._accessToken);
};

export { getFileThumbnailUrl, getFileUrl, getHostFromServer, getUrlFromServer };


