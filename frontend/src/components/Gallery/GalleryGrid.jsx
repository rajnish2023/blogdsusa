import MediaCard from "./MediaCard";

export default function GalleryGrid({ items, onPreview, onCopyLink, onDownload, onDelete, selectedIds, onToggleSelect, selectionMode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <MediaCard
          key={item._id}
          item={item}
          onPreview={() => onPreview(item)}
          onCopyLink={onCopyLink}
          onDownload={onDownload}
          onDelete={onDelete}
          isSelected={selectedIds?.has(item._id)}
          onToggleSelect={onToggleSelect}
          selectionMode={selectionMode}
        />
      ))}
    </div>
  );
}
