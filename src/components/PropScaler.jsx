import { useState, useRef } from 'react';
import { Ruler, Upload, Trash2, RefreshCw, Calculator, HelpCircle } from 'lucide-react';

export default function PropScaler() {
  const [image, setImage] = useState(null);
  const [characterHeight, setCharacterHeight] = useState(170); // in cm
  const [unit, setUnit] = useState('cm');

  const [points, setPoints] = useState([]);
  const [calculatedLength, setCalculatedLength] = useState(null);

  const imageRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setPoints([]);
        setCalculatedLength(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasClick = (e) => {
    if (points.length >= 2) {
      setPoints([{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }]);
      setCalculatedLength(null);
      return;
    }

    const newPoints = [...points, { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }];
    setPoints(newPoints);

    if (newPoints.length === 2) {
      const dx = newPoints[1].x - newPoints[0].x;
      const dy = newPoints[1].y - newPoints[0].y;
      const distPx = Math.sqrt(dx * dx + dy * dy);

      if (imageRef.current) {
        const imageHeightPx = imageRef.current.clientHeight;
        const cmPerPixel = Number(characterHeight) / imageHeightPx;
        const realLength = Math.round(distPx * cmPerPixel);
        setCalculatedLength(realLength);
      }
    }
  };

  const handleReset = () => {
    setPoints([]);
    setCalculatedLength(null);
  };

  const displayValue = (cmVal) => {
    if (!cmVal) return 0;
    if (unit === 'in') return (cmVal / 2.54).toFixed(1);
    return cmVal;
  };

  return (
    <div className="space-y-6 select-none w-full max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Ruler className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" /> Prop Scaler Engine
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">Scale weapons, armor, and props accurately from character reference photos.</p>
        </div>

        {/* Inputs */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs sm:text-sm flex-1 sm:flex-none">
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase">Height:</span>
            <input
              type="number"
              min="50"
              max="250"
              value={characterHeight}
              onChange={(e) => setCharacterHeight(e.target.value)}
              className="w-12 sm:w-16 bg-transparent text-amber-400 font-bold focus:outline-none text-right"
            />
            <span className="text-[10px] sm:text-xs text-slate-400">cm</span>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setUnit('cm')}
              className={`px-2.5 py-1 rounded-lg transition ${unit === 'cm' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
            >
              cm
            </button>
            <button
              onClick={() => setUnit('in')}
              className={`px-2.5 py-1 rounded-lg transition ${unit === 'in' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
            >
              in
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
            <span className="text-slate-300">Reference Photo Canvas</span>
            {points.length > 0 && (
              <button onClick={handleReset} className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>

          {!image ? (
            <label className="flex flex-col items-center justify-center gap-3 border border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-950/50 hover:bg-slate-950 p-8 sm:p-12 rounded-2xl cursor-pointer text-xs text-slate-400 transition group text-center">
              <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500 group-hover:text-amber-400 transition" />
              <span className="font-semibold text-slate-300 text-xs sm:text-sm">Upload Reference Image</span>
              <span className="text-[11px] text-slate-500">Tap two points on the photo to calculate dimensions</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex justify-center max-w-full">
              <div className="relative inline-block cursor-crosshair max-w-full" onClick={handleCanvasClick}>
                <img
                  ref={imageRef}
                  src={image}
                  alt="Prop Reference"
                  className="max-h-[60vh] sm:max-h-[500px] w-auto max-w-full object-contain select-none"
                />

                {points.map((pt, idx) => (
                  <div
                    key={idx}
                    className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 bg-amber-500 border-2 border-slate-950 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg"
                    style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
                  />
                ))}

                {points.length === 2 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line
                      x1={points[0].x}
                      y1={points[0].y}
                      x2={points[1].x}
                      y2={points[1].y}
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                    />
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Measurement Info */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" /> Measurement Results
            </h3>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Estimated Prop Length</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                {calculatedLength ? `${displayValue(calculatedLength)} ${unit}` : '---'}
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-2 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
              <div className="font-semibold text-slate-300 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Instructions:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] sm:text-xs">
                <li>Upload character full-body reference art.</li>
                <li>Set target cosplayer height.</li>
                <li>Tap <strong>two points</strong> on the image to measure real-world prop dimensions.</li>
              </ol>
            </div>

            {image && (
              <button
                onClick={() => setImage(null)}
                className="w-full bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/50 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Clear Image
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}