import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, MousePointer2, PenLine, Square, Undo } from 'lucide-react';
import { TEAM_COLORS } from '../utils/theme';
import { exportTacticalMap, downloadFile } from '../services/mapExport';
import { useEventsStore } from '../store/eventsStore';

const MAP_SOURCES = {
  RR: '/rr_map_base.png',
  SVS: '/svs-map.png',
  KOTH: '/KOTH-map.png',
};

const TacticalMapDialog = ({ isOpen, onClose, teams, teamInstructions, teamLeaders, eventType }) => {
  const mapContainerRef = useRef(null);
  const mapImageRefLayout = useRef(null);
  const mapImageRef = useRef(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 1200, height: 800 });

  const { mapLayout, saveMapLayout } = useEventsStore((state) => ({
    mapLayout: state.mapLayout,
    saveMapLayout: state.saveMapLayout,
  }));

  // Component State
  const [tokens, setTokens] = useState([]);
  const [zones, setZones] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [newZoneText, setNewZoneText] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedSidebarToken, setDraggedSidebarToken] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [scale, setScale] = useState(1);

  // Drawing State
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'line', 'area'
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState(null);

  const teamColors = TEAM_COLORS.slice(0, teams.length);

  // Load and Save layout from Zustand store
  useEffect(() => {
    if (!isOpen) return;

    const layout = mapLayout[eventType] || { tokens: [], zones: [], drawings: [] };

    // Initialize tokens if they don't exist in the layout
    if (!layout.tokens || layout.tokens.length === 0) {
      const initialTokens = [];
      teams.forEach((_, teamIdx) => {
        for (let i = 0; i < 5; i++) {
          initialTokens.push({
            id: `token-${teamIdx}-${i}`,
            teamIdx,
            x: 0,
            y: 0,
            isPlaced: false,
          });
        }
      });
      setTokens(initialTokens);
    } else {
      setTokens(layout.tokens.map(t => ({ ...t, isPlaced: t.isPlaced !== false })));
    }

    setZones(layout.zones || []);
    setDrawings(layout.drawings || []);

  }, [isOpen, eventType, teams, mapLayout]);

  useEffect(() => {
    const handleWindowWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    
    // Non-passive listener on window to completely block browser zoom via mouse wheel
    window.addEventListener('wheel', handleWindowWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWindowWheel);
  }, []);

  const getMapCoordinates = (e) => {
    if (!mapImageRefLayout.current) return { x: 0, y: 0 };
    const rect = mapImageRefLayout.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);
    return { x, y };
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prevScale => Math.min(Math.max(prevScale * zoomFactor, 0.2), 5));
    }
  };

  useEffect(() => {
    const container = mapContainerRef.current;
    if (container) {
       container.addEventListener('wheel', handleWheel, { passive: false });
       return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [scale]);

  const handleMouseDown = (e, itemId, itemType) => {
    if (activeTool !== 'select') return;
    const coords = getMapCoordinates(e);
    setDraggedItem({ id: itemId, type: itemType, startX: coords.x, startY: coords.y });
  };

  const handleMouseMove = (e) => {
    if (activeTool === 'select' && draggedItem) {
      const coords = getMapCoordinates(e);
      const deltaX = coords.x - draggedItem.startX;
      const deltaY = coords.y - draggedItem.startY;

      if (draggedItem.type === 'token') {
        setTokens(tokens.map(token =>
          token.id === draggedItem.id ? { ...token, x: token.x + deltaX, y: token.y + deltaY } : token
        ));
      } else if (draggedItem.type === 'zone') {
        setZones(zones.map(zone =>
          zone.id === draggedItem.id ? { ...zone, x: zone.x + deltaX, y: zone.y + deltaY } : zone
        ));
      }
      setDraggedItem({ ...draggedItem, startX: coords.x, startY: coords.y });

    } else if (eventType === 'KOTH' && isDrawing && currentDrawing) {
        const coords = getMapCoordinates(e);
        setCurrentDrawing(prev => ({ ...prev, points: [...prev.points, coords] }));
    }
    
    if (draggedSidebarToken) {
       setDraggedSidebarToken({ ...draggedSidebarToken, clientX: e.clientX, clientY: e.clientY });
    }
  };

  const handleMouseUp = (e) => {
    if (isDrawing && currentDrawing) {
      const newDrawings = [...drawings, currentDrawing];
      setDrawings(newDrawings);
      saveMapLayout(eventType, { tokens, zones, drawings: newDrawings });
    }
    setIsDrawing(false);
    setCurrentDrawing(null);
    setDraggedItem(null);

    if (draggedSidebarToken && e) {
      const coords = getMapCoordinates(e);
      const unplacedToken = tokens.find(t => t.teamIdx === draggedSidebarToken.teamIdx && !t.isPlaced);
      if (unplacedToken && coords.x >= 0 && coords.x <= mapDimensions.width && coords.y >= 0 && coords.y <= mapDimensions.height) {
        const newTokens = tokens.map(t => t.id === unplacedToken.id ? { ...t, isPlaced: true, x: coords.x, y: coords.y } : t);
        setTokens(newTokens);
        saveMapLayout(eventType, { tokens: newTokens, zones, drawings });
      }
      setDraggedSidebarToken(null);
    }
  };

  const handleResetTokens = () => {
    const newTokens = tokens.map(t => ({ ...t, isPlaced: false }));
    setTokens(newTokens);
    saveMapLayout(eventType, { tokens: newTokens, zones, drawings });
  };

  const handleAddZone = () => {
    if (newZoneText.trim()) {
      const newZone = { id: `zone-${Date.now()}`, text: newZoneText, x: 100, y: 100 };
      const newZones = [...zones, newZone];
      setZones(newZones);
      saveMapLayout(eventType, { tokens, zones: newZones, drawings });
      setNewZoneText('');
    }
  };

  const handleDeleteZone = (id) => {
    const newZones = zones.filter(zone => zone.id !== id);
    setZones(newZones);
    saveMapLayout(eventType, { tokens, zones: newZones, drawings });
  };

  const handleUndo = () => {
    if (drawings.length === 0) return;
    const newDrawings = drawings.slice(0, -1);
    setDrawings(newDrawings);
    saveMapLayout(eventType, { tokens, zones, drawings: newDrawings });
  };

  const handleClearDrawings = () => {
    setDrawings([]);
    saveMapLayout(eventType, { tokens, zones, drawings: [] });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportTacticalMap(
        mapImageRef.current,
        { tokens, zones, drawings },
        teamInstructions,
        teamColors,
        eventType,
        scale,
        teamLeaders,
        teams
      );
      downloadFile(blob, `tactical-map-${eventType}.png`);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Load map image and set dimensions
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setMapDimensions({ width: img.width, height: img.height });
      mapImageRef.current = img;
    };
    img.src = MAP_SOURCES[eventType] || MAP_SOURCES.RR;
  }, [eventType]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative rounded-lg w-[95%] h-[90%] overflow-hidden bg-gray-800 flex flex-col">
        <div className="px-6 py-3 border-b border-gray-700 flex justify-between items-center bg-gray-900">
          <h2 className="text-xl font-bold text-white flex items-center gap-4">
            🗺️ Interactive Tactical Map - {eventType}
            <div className="flex bg-gray-900 rounded-md overflow-hidden text-sm border border-gray-600">
                <button onClick={() => setScale(s => Math.max(s - 0.2, 0.2))} className="px-3 py-1 hover:bg-gray-700">-</button>
                <div className="px-3 py-1 border-x border-gray-600">{Math.round(scale * 100)}%</div>
                <button onClick={() => setScale(s => Math.min(s + 0.2, 5))} className="px-3 py-1 hover:bg-gray-700">+</button>
            </div>
            <span className="text-xs text-gray-400 ml-2">(Hold Ctrl and scroll mouse to zoom)</span>
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-600">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="w-24 bg-gray-900 p-2 flex flex-col items-center gap-3 overflow-y-auto flex-shrink-0 z-20 shadow-md border-r border-gray-800">
             <div className="w-full flex flex-col items-center border-b border-gray-700 pb-4 mb-2">
                <h3 className="text-white font-bold text-xs mb-3 text-center uppercase tracking-wider">Unplaced<br/>Tokens</h3>
                <div className="flex flex-col gap-2 w-full px-2">
                   {teams.map((team, idx) => {
                      const unplacedCount = tokens.filter(t => t.teamIdx === idx && !t.isPlaced).length;
                      if (unplacedCount === 0) return null;
                      return (
                         <div 
                             key={idx} 
                             className="relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-white cursor-grab mx-auto shadow-lg hover:brightness-110 active:cursor-grabbing border-2 border-gray-800"
                             style={{ backgroundColor: teamColors[idx] }}
                             onMouseDown={(e) => {
                                 e.preventDefault();
                                 setDraggedSidebarToken({ teamIdx: idx, clientX: e.clientX, clientY: e.clientY });
                             }}
                         >
                             {(() => {
                                 const leaderId = teamLeaders && teamLeaders[idx + 1];
                                 const leaderName = leaderId ? teams[idx].find((m) => m.id === leaderId)?.chief_name : null;
                                 return leaderName ? `T${idx + 1} (${leaderName})` : `T${idx + 1}`;
                             })()}
                             <span className="absolute -top-1 -right-1 bg-red-600 font-normal outline outline-2 outline-gray-900 text-[11px] rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                               {unplacedCount}
                             </span>
                         </div>
                      );
                   })}
                </div>
                <button onClick={handleResetTokens} className="mt-4 bg-gray-700 hover:bg-gray-600 transition-colors text-white text-[10px] uppercase font-bold tracking-wider px-2 py-2 rounded-md w-full border border-gray-500 shadow" title="Recall all tokens to sidebar">
                  Recall All
                </button>
             </div>
             {eventType === 'KOTH' && (
                <>
                  <h3 className="text-white font-bold text-xs mt-2 uppercase tracking-wider">Draw Tools</h3>
                  <div className="flex flex-wrap justify-center gap-1">
                     <button onClick={() => setActiveTool('select')} className={`p-2 rounded ${activeTool === 'select' ? 'bg-blue-600 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} title="Select/Move"><MousePointer2 size={18}/></button>
                     <button onClick={() => { setActiveTool('line'); setIsDrawing(true); }} className={`p-2 rounded ${activeTool === 'line' ? 'bg-blue-600 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} title="Draw Path"><PenLine size={18}/></button>
                     <button onClick={() => { setActiveTool('area'); setIsDrawing(true); }} className={`p-2 rounded ${activeTool === 'area' ? 'bg-blue-600 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} title="Draw Area"><Square size={18}/></button>
                  </div>
                  <div className="flex gap-1 w-full mt-1">
                     <button onClick={handleUndo} className="p-2 flex-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 flex justify-center" title="Undo Last Line"><Undo size={16}/></button>
                     <button onClick={handleClearDrawings} className="p-2 flex-1 rounded text-red-400 hover:text-red-300 hover:bg-gray-800 flex justify-center" title="Clear All Drawings"><Trash2 size={16}/></button>
                  </div>
                  <div className="mt-3 w-full border-t border-gray-700 pt-3">
                    <h3 className="text-white font-bold text-xs mb-3 text-center uppercase tracking-wider">Pen Color</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                       {teamColors.map(color => (
                         <div key={color} onClick={() => setSelectedColor(color)}
                              className={`w-6 h-6 rounded-full cursor-pointer shadow-sm transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-white scale-110' : 'ring-1 ring-gray-600 opacity-60'}`}
                              style={{ backgroundColor: color }}>
                         </div>
                       ))}
                    </div>
                  </div>
                </>
             )}
          </div>

          <div
            ref={mapContainerRef}
            className="flex-1 relative overflow-auto bg-[#1a1c1e] min-w-0"
            onMouseDown={(e) => {
              if (e.button !== 0) return; // Only process left clicks
              if (activeTool !== 'select' && activeTool !== 'line' && activeTool !== 'area') return;
              
              const coords = getMapCoordinates(e);
              if (eventType === 'KOTH' && (activeTool === 'line' || activeTool === 'area')) {
                setIsDrawing(true);
                setCurrentDrawing({
                  id: `draw-${Date.now()}`,
                  type: activeTool,
                  teamColor: selectedColor,
                  points: [coords],
                  brushSize: activeTool === 'line' ? 12 : 8,
                });
              }
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              ref={mapImageRefLayout}
              className="relative bg-no-repeat bg-contain bg-center origin-top-left shadow-2xl"
              style={{
                width: mapDimensions.width,
                height: mapDimensions.height,
                transform: `scale(${scale})`,
                backgroundImage: `url(${MAP_SOURCES[eventType] || MAP_SOURCES.RR})`,
                cursor: activeTool !== 'select' ? 'crosshair' : 'default',
              }}
            >
              {/* SVG Overlay for Drawings */}
              <svg className="absolute top-0 left-0 w-full h-full" pointerEvents="none">
                 {drawings.map(d => {
                   const path = d.points.map(p => `${p.x},${p.y}`).join(' ');
                   if (d.type === 'line') {
                     return <polyline key={d.id} points={path} stroke={d.teamColor} strokeWidth={d.brushSize / scale} fill="none" />;
                   }
                   if (d.type === 'area') {
                     return <polygon key={d.id} points={path} fill={d.teamColor} fillOpacity="0.3" />;
                   }
                   return null;
                 })}
                 {currentDrawing && (
                    <polyline points={currentDrawing.points.map(p => `${p.x},${p.y}`).join(' ')}
                              stroke={currentDrawing.teamColor} strokeWidth={currentDrawing.brushSize / scale}
                              fill={currentDrawing.type === 'area' ? currentDrawing.teamColor : 'none'}
                              fillOpacity={currentDrawing.type === 'area' ? "0.3" : '1'}
                    />
                 )}
              </svg>

              {/* Tokens */}
              {tokens.filter(t => t.isPlaced).map(token => (
                <div
                  key={token.id}
                  className="absolute bg-gray-900 rounded-full flex items-center justify-center font-bold text-white cursor-grab active:cursor-grabbing border-2 border-gray-800 shadow-md group"
                  style={{ 
                    left: token.x, 
                    top: token.y, 
                    backgroundColor: teamColors[token.teamIdx],
                    transform: `translate(-50%, -50%) scale(${1/scale})`,
                    width: '40px',
                    height: '40px',
                    pointerEvents: 'auto',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, token.id, 'token')}
                >
                  {(() => {
                      const leaderId = teamLeaders && teamLeaders[token.teamIdx + 1];
                      const leaderName = leaderId ? teams[token.teamIdx].find((m) => m.id === leaderId)?.chief_name : null;
                      return leaderName ? `T${token.teamIdx + 1} (${leaderName})` : `T${token.teamIdx + 1}`;
                  })()}
                  <button 
                     onClick={(e) => {
                         e.stopPropagation();
                         const newTokens = tokens.map(t => t.id === token.id ? { ...t, isPlaced: false } : t);
                         setTokens(newTokens);
                         saveMapLayout(eventType, { tokens: newTokens, zones, drawings });
                     }} 
                     className="absolute -top-1 -right-1 p-[3px] bg-red-600 rounded-full border border-gray-900 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer shadow-sm hover:scale-110"
                     title="Return to Pool"
                  >
                     <X size={10} className="text-white" />
                  </button>
                </div>
              ))}

              {/* Zones */}
              {zones.map(zone => (
                <div
                  key={zone.id}
                  className="absolute p-2 rounded-md bg-black bg-opacity-70 text-white text-sm cursor-grab whitespace-nowrap"
                  style={{ 
                    left: zone.x, 
                    top: zone.y,
                    transform: `translate(-50%, -50%) scale(${1/scale})`, 
                  }}
                  onMouseDown={(e) => handleMouseDown(e, zone.id, 'zone')}
                >
                  {zone.text}
                  <button onClick={() => handleDeleteZone(zone.id)} className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full"><X size={12}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="w-72 bg-gray-900 p-5 flex flex-col gap-5 flex-shrink-0 border-l border-gray-800 z-20 shadow-[-4px_0_15px_rgba(0,0,0,0.5)]">
            <div>
              <h3 className="text-white text-sm mb-2">Add Zone Text</h3>
              <input type="text" value={newZoneText} onChange={(e) => setNewZoneText(e.target.value)} className="w-full p-1 rounded bg-gray-700 text-white"/>
              <button onClick={handleAddZone} className="w-full mt-2 p-2 rounded bg-blue-500 text-white">Add</button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <h3 className="text-white text-sm mb-2">Teams</h3>
                {teams.map((team, idx) => {
                    const leaderId = teamLeaders && teamLeaders[idx + 1];
                    const leaderName = leaderId ? teams[idx].find((m) => m.id === leaderId)?.chief_name : null;
                    const teamName = leaderName ? `Team ${idx + 1} (${leaderName})` : `Team ${idx + 1}`;
                    return (
                        <div key={idx} className="flex items-center gap-2 text-white">
                            <div className="w-4 h-4 rounded-full" style={{backgroundColor: teamColors[idx]}}></div>
                            <span>{teamName}</span>
                        </div>
                    );
                })}
            </div>
            <button onClick={handleExport} disabled={isExporting} className="mt-auto p-2 rounded bg-green-500 text-white">
              {isExporting ? 'Exporting...' : 'Export Map'}
            </button>
          </div>
        </div>
      </div>

      {draggedSidebarToken && (
         <div 
             className="fixed pointer-events-none w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-[9999] opacity-80 border-2 border-white shadow-xl"
             style={{ 
                 left: draggedSidebarToken.clientX, 
                 top: draggedSidebarToken.clientY, 
                 backgroundColor: teamColors[draggedSidebarToken.teamIdx],
                 transform: 'translate(-50%, -50%)'
             }}
         >
             {(() => {
                 const leaderId = teamLeaders && teamLeaders[draggedSidebarToken.teamIdx + 1];
                 const leaderName = leaderId ? teams[draggedSidebarToken.teamIdx].find((m) => m.id === leaderId)?.chief_name : null;
                 return leaderName ? `T${draggedSidebarToken.teamIdx + 1} (${leaderName})` : `T${draggedSidebarToken.teamIdx + 1}`;
             })()}
         </div>
      )}
    </div>
  );
};

export default TacticalMapDialog;
