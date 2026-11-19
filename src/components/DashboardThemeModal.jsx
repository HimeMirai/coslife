import { useState, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Palette, ImagePlus, Check, X, RotateCcw } from 'lucide-react';

const CLOUDINARY_CLOUD_NAME = 'nqta4cz9';
const CLOUDINARY_UPLOAD_PRESET = 'coslife_uploads';

const PRESET_BACKGROUNDS = [
  { id: 'default', label: 'Midnight Slate', type: 'color', value: '#0f172a' },
  { id: 'obsidian', label: 'Obsidian Black', type: 'color', value: '#09090b' },
  { id: 'royal', label: 'Con Night', type: 'gradient', value: 'linear-gradient(135deg, #0f172a 0%, #311042 50%, #1e1b4b 100%)' },
  { id: 'sunset', label: 'Amber Dusk', type: 'gradient', value: 'linear-gradient(135deg, #1c1917 0%, #451a03 50%, #0f172a 100%)' },
  { id: 'cyber', label: 'Cyber Teal', type: 'gradient', value: 'linear-gradient(135deg, #042f2e 0%, #0f172a 60%, #172554 100%)' },
];

export default function DashboardThemeModal({ currentTheme, onPreviewChange, onClose }) {
  const [theme, setTheme] = useState(currentTheme);
  const [customUrl, setCustomUrl] = useState(currentTheme.bgType === 'image' ? currentTheme.bgValue : '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef(null);

  const updateTheme = (partial) => {
    const next = { ...theme, ...partial };
    setTheme(next);
    onPreviewChange(next);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.secure_url) throw new Error('Upload failed');

      setCustomUrl(data.secure_url);
      updateTheme({ bgType: 'image', bgValue: data.secure_url });
    } catch {
      alert('Background upload failed. Please try a smaller image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'user_preferences', user.uid), theme, { merge: true });
      onClose();
    } catch (err) {
      console.error('Failed to save theme:', err);
      alert('Could not save theme preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-4 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" /> Customize Dashboard Background
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Swatches */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">
            Preset Themes & Solid Color
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_BACKGROUNDS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateTheme({ bgType: preset.type, bgValue: preset.value })}
                className={`p-2 rounded-xl border text-left transition ${
                  theme.bgValue === preset.value ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                <div
                  className="w-full h-8 rounded-lg mb-1.5 border border-white/10"
                  style={{ background: preset.value }}
                />
                <span className="text-[10px] font-semibold text-slate-200 block truncate">{preset.label}</span>
              </button>
            ))}

            {/* Custom Color Picker */}
            <label className="p-2 rounded-xl border border-slate-800 hover:border-slate-600 cursor-pointer flex flex-col justify-between">
              <input
                type="color"
                value={theme.bgType === 'color' ? theme.bgValue : '#0f172a'}
                onChange={(e) => updateTheme({ bgType: 'color', bgValue: e.target.value })}
                className="w-full h-8 rounded-lg bg-transparent cursor-pointer border-0"
              />
              <span className="text-[10px] font-semibold text-slate-200 mt-1.5">Custom Color</span>
            </label>
          </div>
        </div>

        {/* Custom Wallpaper Upload or URL */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase">
            Custom Wallpaper Image
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste image URL (https://...)"
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                if (e.target.value.trim()) {
                  updateTheme({ bgType: 'image', bgValue: e.target.value.trim() });
                }
              }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition"
            >
              <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>
        </div>

        {/* Readability Overlay Slider (shown when using an image) */}
        {theme.bgType === 'image' && (
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Dark Tint Overlay (for text readability)</span>
              <span>{Math.round((theme.overlayOpacity ?? 0.65) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.85"
              step="0.05"
              value={theme.overlayOpacity ?? 0.65}
              onChange={(e) => updateTheme({ overlayOpacity: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => updateTheme({ bgType: 'color', bgValue: '#0f172a', overlayOpacity: 0.65 })}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="button"
            disabled={isSaving || isUploading}
            onClick={handleSave}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>
    </div>
  );
}