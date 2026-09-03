import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { uploadMedia } from "../../api/galleryApi";

export default function FeaturedImagePicker({ image, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const data = await uploadMedia([file], [image?.alt || ""], () => {});
      const uploaded = data.items[0];
      onChange({ url: uploaded.url, alt: uploaded.alt || "" });
    } catch (err) {
      setError(err?.response?.data?.message || "Upload failed — this uses the Gallery, so you'll need gallery:upload permission");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      {image?.url ? (
        <div className="relative overflow-hidden rounded-xl border border-paper-line">
          <img src={image.url} alt={image.alt || ""} className="h-40 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/60 text-white hover:bg-ink/80"
          >
            <X size={14} />
          </button>
          <input
            value={image.alt || ""}
            onChange={(e) => onChange({ ...image, alt: e.target.value })}
            placeholder="Alt text for this image"
            className="w-full border-t border-paper-line bg-paper-card px-3 py-2 text-xs text-ink placeholder:text-muted/70 focus:outline-none"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-paper-line text-muted transition-colors hover:border-ink/20"
        >
          {uploading ? <Loader2 size={22} className="animate-spin text-signal" /> : <ImagePlus size={22} />}
          <span className="text-xs font-medium">{uploading ? "Uploading..." : "Set featured image"}</span>
        </button>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
