import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Clock, ShoppingCart, Edit2, Check, X, AlertTriangle, Filter, Image, Upload } from 'lucide-react';

const CATEGORIES = ['All', 'Prop', 'Armor', 'Wig', 'Outfit', 'Electronics', 'General'];

const DEFAULT_PROJECTS = [
  {
    id: 1,
    title: 'Cyberpunk Armor',
    budget: 150,
    image: null,
    items: [
      { id: 101, name: '5mm EVA Foam Sheet', cost: 25, status: 'Crafted', category: 'General' },
      { id: 102, name: 'LED Strip Lights', cost: 15, status: 'Ordered', category: 'Electronics' },
      { id: 103, name: 'Contact Cement Glue', cost: 12, status: 'To Buy', category: 'General' }
    ]
  }
];

export default function CraftingStudio() {
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('coslife_projects');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved projects", e);
      }
    }
    return DEFAULT_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState(() => projects[0]?.id || 1);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectBudget, setNewProjectBudget] = useState('');

  // Item Form States
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemStatus, setNewItemStatus] = useState('To Buy');
  const [newItemCategory, setNewItemCategory] = useState('General');

  // Editing Project States
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectTitle, setEditProjectTitle] = useState('');
  const [editProjectBudget, setEditProjectBudget] = useState('');

  // Category Filter
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  useEffect(() => {
    localStorage.setItem('coslife_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    const handleForceSave = () => {
      localStorage.setItem('coslife_projects', JSON.stringify(projects));
      localStorage.setItem('coslife_saved_checkpoint', JSON.stringify(projects));
    };

    const handleRevert = () => {
      const checkpoint = localStorage.getItem('coslife_saved_checkpoint');
      if (checkpoint) {
        const parsed = JSON.parse(checkpoint);
        setProjects(parsed);
        localStorage.setItem('coslife_projects', JSON.stringify(parsed));
      }
    };

    window.addEventListener('coslife_force_save', handleForceSave);
    window.addEventListener('coslife_revert_changes', handleRevert);

    return () => {
      window.removeEventListener('coslife_force_save', handleForceSave);
      window.removeEventListener('coslife_revert_changes', handleRevert);
    };
  }, [projects]);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const totalSpent = activeProject ? activeProject.items.reduce((sum, item) => sum + Number(item.cost), 0) : 0;
  const remainingBudget = activeProject ? activeProject.budget - totalSpent : 0;

  const totalItemsCount = activeProject?.items.length || 0;
  const craftedItemsCount = activeProject?.items.filter(i => i.status === 'Crafted').length || 0;
  const progressPercentage = totalItemsCount > 0 ? Math.round((craftedItemsCount / totalItemsCount) * 100) : 0;

  const handleKeyDown = (e) => {
    if (['-', '.', 'e', 'E', '+'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const sanitizeWholeNumber = (value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    return cleaned === '' ? '' : String(Math.abs(parseInt(cleaned, 10)));
  };

  const handleAddProject = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const cleanBudget = Math.abs(parseInt(newProjectBudget, 10)) || 0;
    const newProj = {
      id: Date.now(),
      title: newProjectName.trim(),
      budget: cleanBudget,
      image: null,
      items: []
    };
    setProjects([...projects, newProj]);
    setActiveProjectId(newProj.id);
    setNewProjectName('');
    setNewProjectBudget('');
  };

  const handleDeleteProject = (projectId) => {
    if (projects.length <= 1) {
      alert("You must keep at least one project in your studio.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this project and all its tasks?")) {
      const filtered = projects.filter(p => p.id !== projectId);
      setProjects(filtered);
      setActiveProjectId(filtered[0].id);
    }
  };

  const startEditProject = () => {
    if (!activeProject) return;
    setEditProjectTitle(activeProject.title);
    setEditProjectBudget(String(activeProject.budget));
    setIsEditingProject(true);
  };

  const handleSaveProjectEdit = () => {
    if (!editProjectTitle.trim()) return;
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          title: editProjectTitle.trim(),
          budget: Math.abs(parseInt(editProjectBudget, 10)) || 0
        };
      }
      return p;
    }));
    setIsEditingProject(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProjects(projects.map(p => {
          if (p.id === activeProjectId) {
            return { ...p, image: reader.result };
          }
          return p;
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, image: null };
      }
      return p;
    }));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCost || !activeProject) return;
    const cleanCost = Math.abs(parseInt(newItemCost, 10)) || 0;
    const newItem = {
      id: Date.now(),
      name: newItemName.trim(),
      cost: cleanCost,
      status: newItemStatus,
      category: newItemCategory || 'General'
    };

    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, items: [...p.items, newItem] };
      }
      return p;
    }));

    setNewItemName('');
    setNewItemCost('');
  };

  const handleCycleStatus = (itemId) => {
    const statusCycle = { 'To Buy': 'Ordered', 'Ordered': 'Crafted', 'Crafted': 'To Buy' };
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          items: p.items.map(item => {
            if (item.id === itemId) {
              return { ...item, status: statusCycle[item.status] };
            }
            return item;
          })
        };
      }
      return p;
    }));
  };

  const handleDeleteItem = (itemId) => {
    setProjects(projects.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, items: p.items.filter(i => i.id !== itemId) };
      }
      return p;
    }));
  };

  const filteredItems = activeProject?.items.filter(item => {
    if (selectedCategoryFilter === 'All') return true;
    const itemCategory = item.category || 'General';
    return itemCategory === selectedCategoryFilter;
  }) || [];

  return (
    <div className="space-y-6 select-none w-full max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top Banner & Project Switcher */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Crafting Studio</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Manage your cosplay build tasks and expense budgets.</p>
        </div>

        {/* Create Project Form */}
        <form onSubmit={handleAddProject} className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <input
            type="text"
            placeholder="New Project Title..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 w-full sm:w-48"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Budget (₱)"
              value={newProjectBudget}
              onKeyDown={handleKeyDown}
              onChange={(e) => setNewProjectBudget(sanitizeWholeNumber(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm w-full sm:w-28 focus:outline-none focus:border-amber-500"
            />
            <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 shrink-0">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </form>
      </div>

      {/* Select Active Project Tab & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProjectId(p.id);
                setIsEditingProject(false);
              }}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium border transition whitespace-nowrap shrink-0 ${
                p.id === activeProjectId
                  ? 'bg-slate-800 border-amber-500/50 text-amber-400 shadow-md'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>

        {activeProject && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {!isEditingProject ? (
              <>
                <button
                  onClick={startEditProject}
                  className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 border border-slate-800 hover:border-amber-500/30 rounded-xl transition"
                  title="Edit Active Project"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProject(activeProject.id)}
                  className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 hover:border-rose-500/30 rounded-xl transition"
                  title="Delete Active Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl max-w-full overflow-x-auto">
                <input
                  type="text"
                  value={editProjectTitle}
                  onChange={(e) => setEditProjectTitle(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs px-2 py-1 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500 w-24 sm:w-32"
                  placeholder="Title"
                />
                <input
                  type="number"
                  value={editProjectBudget}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setEditProjectBudget(sanitizeWholeNumber(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-xs px-2 py-1 rounded-lg text-slate-100 w-16 focus:outline-none focus:border-amber-500"
                  placeholder="Budget"
                />
                <button onClick={handleSaveProjectEdit} className="p-1 text-emerald-400 hover:bg-slate-800 rounded-md">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingProject(false)} className="p-1 text-rose-400 hover:bg-slate-800 rounded-md">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {activeProject && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Summary Cards & Reference Image */}
          <div className="space-y-4">
            {/* Reference Image Card */}
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-amber-400" /> Reference Image
                </span>
                {activeProject.image && (
                  <button 
                    onClick={handleRemoveImage}
                    className="text-rose-400 hover:text-rose-300 text-[11px] font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              {activeProject.image ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                  <img 
                    src={activeProject.image} 
                    alt="Costume Reference" 
                    className="w-full h-auto max-h-60 sm:max-h-72 object-contain rounded-xl"
                  />
                  <label className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-xs text-amber-400 cursor-pointer transition">
                    <Upload className="w-5 h-5" />
                    <span>Change Reference Image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-950/40 hover:bg-slate-950 p-6 rounded-xl cursor-pointer text-xs text-slate-400 transition group">
                  <Upload className="w-6 h-6 text-slate-500 group-hover:text-amber-400 transition" />
                  <span className="font-medium text-slate-300">Upload Costume / Prop Photo</span>
                  <span className="text-[10px] text-slate-500">PNG, JPG, WEBP reference preview</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Build Progress Card */}
            <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-slate-400">
                <span>Build Completion</span>
                <span className="text-amber-400 font-bold">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {craftedItemsCount} of {totalItemsCount} items completed
              </p>
            </div>

            {/* Budget Analytics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Total Budget</span>
                <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1">${activeProject.budget}</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Total Spent</span>
                <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-400 mt-1">${totalSpent}</div>
              </div>

              <div className="col-span-2 sm:col-span-1 lg:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Remaining</span>
                <div className={`text-xl sm:text-2xl lg:text-3xl font-extrabold mt-1 ${remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${remainingBudget}
                </div>
              </div>
            </div>

            {remainingBudget < 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/50 p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Budget exceeded by ${Math.abs(remainingBudget)}!</span>
              </div>
            )}
          </div>

          {/* Right Checklist & Form */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-400" /> Material & Task Checklist
              </h3>

              {/* Category Filter Horizontal Scroll */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-none w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 shrink-0" />
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                      selectedCategoryFilter === cat
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsive Form Inputs */}
            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="Item / Task Name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="sm:col-span-4 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
              <div className="grid grid-cols-2 sm:contents gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="Cost(₱)"
                  value={newItemCost}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setNewItemCost(sanitizeWholeNumber(e.target.value))}
                  className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="sm:col-span-3 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-4 sm:contents gap-2">
                <select
                  value={newItemStatus}
                  onChange={(e) => setNewItemStatus(e.target.value)}
                  className="col-span-3 sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="To Buy">To Buy</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Crafted">Crafted</option>
                </select>
                <button type="submit" className="col-span-1 sm:col-span-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center justify-center p-2 font-bold transition">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Checklist Items */}
            <div className="divide-y divide-slate-800 border-t border-slate-800 pt-2">
              {filteredItems.length === 0 ? (
                <p className="text-slate-500 text-xs sm:text-sm text-center py-6">No items found for this filter.</p>
              ) : (
                filteredItems.map(item => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button 
                        onClick={() => handleCycleStatus(item.id)} 
                        title="Click to cycle status"
                        className="hover:scale-110 transition shrink-0"
                      >
                        {item.status === 'Crafted' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {item.status === 'Ordered' && <Clock className="w-5 h-5 text-amber-400" />}
                        {item.status === 'To Buy' && <ShoppingCart className="w-5 h-5 text-slate-400" />}
                      </button>

                      <div className="min-w-0">
                        <div className="font-medium text-xs sm:text-sm flex flex-wrap items-center gap-1.5">
                          <span className="truncate">{item.name}</span>
                          <span className="text-[9px] sm:text-[10px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-700 shrink-0">
                            {item.category || 'General'}
                          </span>
                        </div>
                        
                        <button 
                          onClick={() => handleCycleStatus(item.id)}
                          className={`text-[11px] sm:text-xs font-semibold hover:underline cursor-pointer ${
                            item.status === 'Crafted' ? 'text-emerald-400' :
                            item.status === 'Ordered' ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          {item.status}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-xs sm:text-sm">${item.cost}</span>
                      <button onClick={() => handleDeleteItem(item.id)} className="text-slate-500 hover:text-rose-400 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}