import { Download, Upload, Database } from 'lucide-react';

export default function DataBackup() {
  const handleExportData = () => {
    const backupData = {
      projects: JSON.parse(localStorage.getItem('coslife_projects') || '[]'),
      blueprints: JSON.parse(localStorage.getItem('coslife_blueprints') || '[]'),
      conventions: JSON.parse(localStorage.getItem('coslife_conventions') || '[]'),
      packing: JSON.parse(localStorage.getItem('coslife_packing') || '[]'),
      exportDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CosLife_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (imported.projects) localStorage.setItem('coslife_projects', JSON.stringify(imported.projects));
          if (imported.blueprints) localStorage.setItem('coslife_blueprints', JSON.stringify(imported.blueprints));
          if (imported.conventions) localStorage.setItem('coslife_conventions', JSON.stringify(imported.conventions));
          if (imported.packing) localStorage.setItem('coslife_packing', JSON.stringify(imported.packing));
          
          alert("Workspace data imported successfully! Reloading page...");
          window.location.reload();
        } catch {
          alert("Invalid backup file format.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
        <Database className="w-4 h-4 text-amber-400" /> Data Backup & Migration
      </h3>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExportData}
          className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition"
        >
          <Download className="w-4 h-4 text-amber-400" /> Export Backup (.JSON)
        </button>

        <label className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition">
          <Upload className="w-4 h-4 text-amber-400" /> Import Backup (.JSON)
          <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
        </label>
      </div>
    </div>
  );
}