import { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar as CalendarIcon, CheckSquare, Plus, Trash2, Clock, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const DEFAULT_CONVENTIONS = [
  {
    id: 1,
    name: 'Bohol Cosplay Convention 2026',
    date: '2026-11-20',
    location: 'Tagbilaran City, Bohol, Philippines',
    cosplayPlanned: 'Cyberpunk Armor'
  }
];

const DEFAULT_PACKING_ITEMS = [
  { id: 1, task: 'Convention Badge / E-Tickets', packed: false },
  { id: 2, task: 'Wig Caps & Bobby Pins', packed: false },
  { id: 3, task: 'Hot Glue Gun & Sticks', packed: false },
  { id: 4, task: 'Makeup & Touch-Up Kit', packed: false },
  { id: 5, task: 'Emergency Safety Pins & Tape', packed: false },
  { id: 6, task: 'Water Bottle & Snacks', packed: false }
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ConCompanion() {
  const [conventions, setConventions] = useState(() => {
    const saved = localStorage.getItem('coslife_conventions');
    return saved ? JSON.parse(saved) : DEFAULT_CONVENTIONS;
  });

  const [packingList, setPackingList] = useState(() => {
    const saved = localStorage.getItem('coslife_packing');
    return saved ? JSON.parse(saved) : DEFAULT_PACKING_ITEMS;
  });

  // Con Form States
  const [conName, setConName] = useState('');
  const [conDate, setConDate] = useState('');
  const [conLocation, setConLocation] = useState('');
  const [conCosplay, setConCosplay] = useState('');

  // Map preview active selection (defaults to Bohol)
  const [activeMapQuery, setActiveMapQuery] = useState(
    DEFAULT_CONVENTIONS[0]?.location || 'Tagbilaran City, Bohol, Philippines'
  );

  // Custom Calendar Picker States
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const calendarRef = useRef(null);

  // Packing Item Input
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    localStorage.setItem('coslife_conventions', JSON.stringify(conventions));
  }, [conventions]);

  useEffect(() => {
    localStorage.setItem('coslife_packing', JSON.stringify(packingList));
  }, [packingList]);

  // Close calendar popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCon = (e) => {
    e.preventDefault();
    if (!conName.trim() || !conDate) return;

    const newCon = {
      id: Date.now(),
      name: conName.trim(),
      date: conDate,
      location: conLocation.trim() || 'Tagbilaran City, Bohol',
      cosplayPlanned: conCosplay.trim() || 'TBD'
    };

    setConventions([...conventions, newCon]);
    setActiveMapQuery(newCon.location);
    setConName('');
    setConDate('');
    setConLocation('');
    setConCosplay('');
  };

  const handleDeleteCon = (id) => {
    setConventions(conventions.filter(c => c.id !== id));
  };

  const handleTogglePacked = (id) => {
    setPackingList(packingList.map(item => 
      item.id === id ? { ...item, packed: !item.packed } : item
    ));
  };

  const handleAddPackingItem = (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setPackingList([...packingList, { id: Date.now(), task: newItem.trim(), packed: false }]);
    setNewItem('');
  };

  const handleDeletePackingItem = (id) => {
    setPackingList(packingList.filter(item => item.id !== id));
  };

  const getDaysRemaining = (targetDateStr) => {
    const today = new Date();
    const target = new Date(targetDateStr);
    const diffTime = target - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calendar Helpers
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelectDate = (dayNum) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    setConDate(dateStr);
    setIsCalendarOpen(false);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'Select Con Date';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 select-none w-full max-w-7xl mx-auto px-2 sm:px-4">
      {/* Banner Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" /> Con Companion
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">Track upcoming conventions, locate venues on interactive maps, and manage emergency packing lists.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Register Convention Form */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-amber-400" /> Add Upcoming Con
          </h3>

          <form onSubmit={handleAddCon} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Convention Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Bohol Pop Con / Otaku Expo"
                value={conName}
                onChange={(e) => setConName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Custom Date Picker Popup Input */}
              <div className="relative" ref={calendarRef}>
                <label className="text-xs text-slate-400 font-medium block mb-1">Con Date</label>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-left text-slate-200 flex items-center justify-between focus:outline-none focus:border-amber-500"
                >
                  <span className={conDate ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                    {formatDisplayDate(conDate)}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-amber-500 shrink-0 ml-1" />
                </button>

                {/* Calendar Dropdown */}
                {isCalendarOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-slate-950 border border-slate-800 p-3 rounded-2xl shadow-2xl space-y-3">
                    {/* Month Navigator */}
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span>{MONTH_NAMES[month]} {year}</span>
                      <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Weekday Labels */}
                    <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {Array.from({ length: firstDayIndex }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const formattedMonth = String(month + 1).padStart(2, '0');
                        const formattedDay = String(dayNum).padStart(2, '0');
                        const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
                        const isSelected = conDate === dateStr;

                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => handleSelectDate(dayNum)}
                            className={`py-1 rounded-lg font-medium transition text-[11px] ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-amber-400'
                            }`}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Venue / City Location</label>
                <input
                  type="text"
                  placeholder="e.g. Tagbilaran City, Bohol"
                  value={conLocation}
                  onChange={(e) => setConLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Planned Cosplay</label>
              <input
                type="text"
                placeholder="e.g. Cyberpunk Armor / Wig Character"
                value={conCosplay}
                onChange={(e) => setConCosplay(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs sm:text-sm transition mt-2"
            >
              Add Convention
            </button>
          </form>
        </div>

        {/* Right Column: Conventions List & Interactive Venue Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Conventions Grid */}
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> Convention Schedule & Countdowns
            </h3>

            {conventions.length === 0 ? (
              <p className="text-slate-500 text-xs sm:text-sm text-center py-6">No upcoming conventions scheduled.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {conventions.map(con => {
                  const daysLeft = getDaysRemaining(con.date);
                  return (
                    <div key={con.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-slate-100">{con.name}</h4>
                          <button 
                            onClick={() => setActiveMapQuery(con.location)}
                            className="text-xs text-amber-400 hover:underline flex items-center gap-1 mt-0.5 text-left"
                            title="Click to view on Map"
                          >
                            <MapPin className="w-3 h-3 text-rose-400 shrink-0" /> {con.location}
                          </button>
                        </div>
                        <button onClick={() => handleDeleteCon(con.id)} className="text-slate-500 hover:text-rose-400 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-xs">
                        <span className="text-slate-400">Cosplay: <strong className="text-slate-200">{con.cosplayPlanned}</strong></span>
                        <span className={`font-extrabold px-2 py-0.5 rounded-full text-[10px] ${
                          daysLeft > 0 ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50' : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                        }`}>
                          {daysLeft > 0 ? `${daysLeft} Days Left` : 'Event Passed'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interactive Venue Map */}
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" /> Venue Location Map
              </h3>

              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeMapQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Google Maps
                </a>
              </div>
            </div>

            {/* Embedded Map Frame centered on Bohol */}
            <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <iframe
                title="Convention Venue Map"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(activeMapQuery)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          </div>

          {/* Emergency Packing Checklist */}
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" /> Emergency Repair & Packing Kit
              </h3>
            </div>

            {/* Add Item Input */}
            <form onSubmit={handleAddPackingItem} className="flex gap-2">
              <input
                type="text"
                placeholder="Add emergency item or tool..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
              <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shrink-0">
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Checklist items */}
            <div className="divide-y divide-slate-800/80 border-t border-slate-800 pt-2">
              {packingList.map(item => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none min-w-0">
                    <input
                      type="checkbox"
                      checked={item.packed}
                      onChange={() => handleTogglePacked(item.id)}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                    />
                    <span className={`text-xs sm:text-sm ${item.packed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {item.task}
                    </span>
                  </label>

                  <button onClick={() => handleDeletePackingItem(item.id)} className="text-slate-600 hover:text-rose-400 transition shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}