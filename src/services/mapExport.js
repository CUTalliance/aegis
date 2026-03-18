const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const exportTacticalMap = async (
  mapImage,
  layout,
  teamInstructions,
  teamColors,
  eventType,
  scale = 1,
  teamLeaders,
  teams
) => {
  return new Promise((resolve, reject) => {
    try {
      const { tokens, zones, drawings } = layout;
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');

      exportCanvas.width = mapImage.width;
      exportCanvas.height = mapImage.height;

      // Draw base map
      ctx.drawImage(mapImage, 0, 0);

      // Draw KOTH Drawings
      if (eventType === 'KOTH' && drawings) {
        drawings.forEach(drawing => {
          if (drawing.points.length < 1) return;

          ctx.beginPath();
          ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
          for (let i = 1; i < drawing.points.length; i++) {
            ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
          }

          if (drawing.type === 'line') {
            ctx.strokeStyle = drawing.teamColor;
            ctx.lineWidth = drawing.brushSize / scale;
            ctx.stroke();
          } else if (drawing.type === 'area') {
            ctx.fillStyle = hexToRgba(drawing.teamColor, 0.3);
            ctx.closePath();
            ctx.fill();
          }
        });
      }

      // Draw Tokens
      if (tokens) {
        tokens.filter(t => t.isPlaced).forEach(token => {
            const radius = 20 / scale;
            ctx.fillStyle = teamColors[token.teamIdx];
            ctx.beginPath();
            ctx.arc(token.x, token.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.max(12, 18 / scale)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const leaderId = teamLeaders && teamLeaders[token.teamIdx + 1];
            const leaderName = leaderId ? teams[token.teamIdx].find((m) => m.id === leaderId)?.chief_name : null;
            const tokenText = leaderName ? `Team ${leaderName}` : `Team ${token.teamIdx + 1}`;
            ctx.fillText(tokenText, token.x, token.y);
        });
      }

      // Draw Zone Texts
      if (zones) {
        zones.forEach(zone => {
            const fontSize = Math.max(12, 16 / scale);
            ctx.font = `bold ${fontSize}px Arial`;
            const textWidth = ctx.measureText(zone.text).width;
            
            // Draw background pill relative to the scaled font size
            const paddingX = 8 / scale;
            const paddingY = 4 / scale;
            const bgX = zone.x - textWidth / 2 - paddingX;
            const bgY = zone.y - fontSize / 2 - paddingY;
            const bgW = textWidth + paddingX * 2;
            const bgH = fontSize + paddingY * 2;
            
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(bgX, bgY, bgW, bgH, 4 / scale) : ctx.fillRect(bgX, bgY, bgW, bgH);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zone.text, zone.x, zone.y);
        });
      }

      exportCanvas.toBlob(resolve, 'image/png');

    } catch (error) {
      reject(error);
    }
  });
};

export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};