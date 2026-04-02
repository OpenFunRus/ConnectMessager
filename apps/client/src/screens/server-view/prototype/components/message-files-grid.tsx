import { getFileUrl } from '@/helpers/get-file-url';
import { filesize } from 'filesize';
import { Icon } from './icon';
import { MessageImageThumbnail } from './message-image-thumbnail';
import { getFileIconNameByExtension, isImageFile } from '../utils';
import type { TFile } from '@connectmessager/shared';

type TMessageFilesGridProps = {
  files: TFile[];
  onOpenImage: (file: TFile) => void;
  onDownloadFile: (file: TFile) => void;
};

const MessageFilesGrid = ({ files, onOpenImage, onDownloadFile }: TMessageFilesGridProps) => {
  if (!files || files.length === 0) return null;

  return (
    <div className="cmx-message-files-grid">
      {files.map((file) => {
        const isImage = isImageFile(file);
        const fileUrl = getFileUrl(file);

        return (
          <div key={file.id} className="cmx-message-file-col">
            {isImage ? (
              <MessageImageThumbnail
                file={file}
                onOpen={onOpenImage}
                onDownload={onDownloadFile}
              />
            ) : (
              <div className="cmx-message-file-card-wrap">
                <a
                  className="cmx-message-file-card"
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="cmx-message-file-icon-wrap">
                    <Icon
                      name={getFileIconNameByExtension(file.extension)}
                      className="cmx-message-file-icon"
                    />
                  </div>
                  <div className="cmx-message-file-meta">
                    <div className="cmx-message-file-name">{file.originalName}</div>
                    <div className="cmx-message-file-size">{filesize(file.size)}</div>
                  </div>
                </a>
                <button
                  type="button"
                  className="cmx-icon-btn cmx-message-file-download-btn"
                  title="Скачать"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDownloadFile(file);
                  }}
                >
                  <Icon name="download" className="cmx-message-file-download-icon" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export { MessageFilesGrid };
