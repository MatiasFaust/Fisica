import { FileText, Image, FileType2, File } from 'lucide-react';

const ICONS = { pdf: FileText, image: Image, doc: FileType2, other: File };

export default function FileTypeIcon({ type, size = 20 }) {
  const Icon = ICONS[type] ?? File;
  return (
    <span className={`file-icon file-icon--${type}`}>
      <Icon size={size} />
    </span>
  );
}
