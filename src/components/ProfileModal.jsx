import { useState } from 'react';
import { X, Upload, Check, UserCircle2 } from 'lucide-react';
import DataBackup from './DataBackup';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cosplayer1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cosplayer2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cosplayer3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cosplayer4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Hero1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Hero2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mage1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ninja1'
];

export default function ProfileModal({ isOpen, onClose, user, onUpdateProfile }) {
  const [selectedAvatar, setSelectedAvatar] = useState(user?.photoURL || PRESET_AVATARS[0]);
  const [displayName, setDisplayName] = useState(user?.displayName || 'Cosplayer');

  if (!isOpen) return null;

  // Handle local image file upload preview
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedAvatar(imageUrl);
    }
  };

  const handleSave = () => {
    onUpdateProfile({
      displayName,
      photoURL: selectedAvatar
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserCircle2 className="w-6 h-6 text-amber-500" /> Customize Profile
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Preview & Display Name */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <img 
              src={selectedAvatar} 
              alt="Avatar Preview" 
              className="w-24 h-24 rounded-full border-2 border-amber-500 object-cover shadow-lg bg-slate-950"
            />
          </div>
          <div className="w-full space-y-1">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Upload Custom Image Option */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Upload Custom Avatar</label>
          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-700 hover:border-amber-500 bg-slate-950/50 hover:bg-slate-950 p-3 rounded-xl cursor-pointer text-sm text-slate-300 transition">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Choose image file...</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        {/* Preset Avatars Selection */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Or Pick a Preset Avatar</label>
          <div className="grid grid-cols-4 gap-3 max-h-40 overflow-y-auto p-1">
            {PRESET_AVATARS.map((avatar, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAvatar(avatar)}
                className={`relative rounded-xl p-1 border transition hover:scale-105 bg-slate-950 ${
                  selectedAvatar === avatar ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-800'
                }`}
              >
                <img src={avatar} alt={`Preset ${idx}`} className="w-12 h-12 rounded-lg" />
                {selectedAvatar === avatar && (
                  <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 rounded-full p-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Data Backup & Migration Tool */}
        <div className="border-t border-slate-800 pt-4">
          <DataBackup />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-sm font-semibold transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 rounded-xl text-sm font-bold transition"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}