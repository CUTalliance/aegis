import React, { useState } from 'react';
import { COLORS } from '../utils/theme';

const CurrentEvent = () => {
  const [mediaLink, setMediaLink] = useState('');
  const [images, setImages] = useState([]);
  const [excelLink, setExcelLink] = useState('');

  const handleLinkSubmit = (e) => {
    e.preventDefault();
    // This is a simplified example. In a real application, you would need to parse the Discord media link 
    // and extract the image and file URLs. This often requires a server-side component to fetch the data from Discord.
    // For this example, we'll just simulate the extracted links.

    const imageUrls = [
      'https://cdn.discordapp.com/attachments/123456789/123456789/image1.jpg',
      'https://cdn.discordapp.com/attachments/123456789/123456789/image2.jpg',
      'https://cdn.discordapp.com/attachments/123456789/123456789/image3.jpg',
      'https://cdn.discordapp.com/attachments/123456789/123456789/image4.jpg',
    ];

    const excelUrl = 'https://cdn.discordapp.com/attachments/123456789/123456789/data.xlsx';

    setImages(imageUrls);
    setExcelLink(excelUrl);
  };

  return (
    <div
      className="min-h-screen p-8"
      style={{ backgroundColor: COLORS.bg_primary, color: COLORS.text_primary }}
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Current Event</h1>
        <p style={{ color: COLORS.text_secondary }}>
          Paste a Discord media link to view images and download the event data.
        </p>
      </div>

      <form onSubmit={handleLinkSubmit} className="mb-8">
        <input
          type="text"
          value={mediaLink}
          onChange={(e) => setMediaLink(e.target.value)}
          placeholder="Paste Discord Media Link Here"
          className="w-full p-2 bg-gray-700 rounded-md mb-4"
        />
        <button 
          type="submit" 
          className="bg-orange-600 px-4 py-2 rounded-md"
        >
          Load Event
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {images.map((url, index) => (
          <img key={index} src={url} alt={`Event image ${index + 1}`} className="rounded-lg" />
        ))}
      </div>

      {excelLink && (
        <div>
          <a 
            href={excelLink} 
            download 
            className="bg-green-600 px-4 py-2 rounded-md"
          >
            Download Excel File
          </a>
        </div>
      )}
    </div>
  );
};

export default CurrentEvent;
