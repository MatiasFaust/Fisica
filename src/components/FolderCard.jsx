import { Folder } from 'lucide-react';
import ActionMenu from './ui/ActionMenu';

export default function FolderCard({ folder, itemCount, accent, onOpen, menuItems, icon: Icon = Folder }) {
  return (
    <div
      className="folder-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => event.key === 'Enter' && onOpen()}
      style={accent ? { '--folder-color': accent } : undefined}
    >
      <span className="folder-card__icon">
        <Icon size={22} />
      </span>
      <div className="folder-card__info">
        <span className="folder-card__name">{folder.name}</span>
        <span className="folder-card__meta">{itemCount === 1 ? '1 elemento' : `${itemCount} elementos`}</span>
      </div>
      {menuItems?.length > 0 && <ActionMenu items={menuItems} />}
    </div>
  );
}
