import { useState, useEffect } from 'react';
import { FileBox, Upload, Trash2, Download, FileText, Image as ImageIcon, Search, Tag } from 'lucide-react';

const CATEGORIES = ['All', 'Armor Pattern', 'Weapon Blueprint', 'Sewing Template', '3D Model', 'Reference Sheet'];

const DEFAULT_BLUEPRINTS = [
  {
    id: 1,
    title: 'Cyberpunk Helmet Foam Template',
    category: 'Armor Pattern',
    fileName: 'cyber_helmet_v1.pdf',
    fileSize: '2.4 MB',
    dateAdded: '2026-10-24',
    fileUrl: null
  }
];

export default function BlueprintVault() {
  const [blueprints, setBlueprints] = useState(() => {
    const saved = localStorage.getItem('coslife_blueprints');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved blueprints", e);
      }
    }
    return DEFAULT_BLUEPRINTS;
  });

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Armor Pattern');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    localStorage.setItem('coslife_blueprints', JSON.stringify(blueprints));
  }, [blueprints]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.split('.')[0].replace(/[-_]/g, ' '));
      }
    }
  };

  const handleAddBlueprint = (e) => {
    e.preventDefault();
    if (!title.trim() || !selectedFile) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newBp = {
        id: Date.now(),
        title: title.trim(),
        category,
        fileName: selectedFile.name,
        fileSize: (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB',
        dateAdded: new Date().toISOString().split('T')[0],
        fileUrl: reader.result
      };

      setBlueprints([newBp, ...blueprints]);
      setTitle('');
      setSelectedFile(null);
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleDeleteBlueprint = (id) => {
    if (window.confirm("Are you sure you want to delete this blueprint asset?")) {
      setBlueprints(blueprints.filter(bp => bp.id !== id));
    }
  };

  const filteredBlueprints = blueprints.filter(bp => {
    const matchesCategory = selectedCategory === 'All' || bp.category === selectedCategory;
    const matchesSearch = bp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          bp.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 select-none w-full max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileBox className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" /> Blueprint Vault
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">Store, organize, and manage your cosplay templates and vector patterns.</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search blueprints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-400" /> Upload Blueprint Asset
          </h3>

          <form onSubmit={handleAddBlueprint} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Asset Title</label>
              <input
                type="text"
                placeholder="e.g. EVA Foam Pauldron Template"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Select File (PDF, SVG, PNG, JPG)</label>
              <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 hover:border-amber-500/50 bg-slate-950/40 rounded-xl cursor-pointer transition text-center group">
                <Upload className="w-5 h-5 text-slate-500 group-hover:text-amber-400 mb-1" />
                <span className="text-xs text-slate-300 font-medium truncate max-w-[200px]">
                  {selectedFile ? selectedFile.name : 'Choose File'}
                </span>
                <input type="file" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            <button
              type="submit"
              disabled={!selectedFile || !title.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl text-xs sm:text-sm transition mt-2"
            >
              Save to Vault
            </button>
          </form>
        </div>

        {/* Blueprint Library List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" /> Stored Blueprint Assets
            </h3>

            {/* Category Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <Tag className="w-3.5 h-3.5 text-slate-500 mr-1 shrink-0" />
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Asset Grid */}
          {filteredBlueprints.length === 0 ? (
            <p className="text-slate-500 text-xs sm:text-sm text-center py-12">No blueprint assets stored in this category.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredBlueprints.map(bp => (
                <div key={bp.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {bp.fileName.endsWith('.pdf') ? (
                        <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-amber-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-200 truncate">{bp.title}</h4>
                        <span className="text-[10px] text-slate-500 block truncate">{bp.fileName}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteBlueprint(bp.id)}
                      className="text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-900 pt-2">
                    <span className="bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">{bp.category}</span>
                    <div className="flex items-center gap-2">
                      <span>{bp.fileSize}</span>
                      {bp.fileUrl && (
                        <a
                          href={bp.fileUrl}
                          download={bp.fileName}
                          className="text-amber-400 hover:underline flex items-center gap-0.5 font-semibold"
                        >
                          <Download className="w-3 h-3" /> Get
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}