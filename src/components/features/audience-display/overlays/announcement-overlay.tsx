import React from "react";

interface AnnouncementOverlayProps {
  announcement: string;
  showAnnouncement: boolean;
  announcementCountdown: number | null;
}

export const AnnouncementOverlay: React.FC<AnnouncementOverlayProps> = ({
  announcement,
  showAnnouncement,
  announcementCountdown,
}) => {
  if (!showAnnouncement || !announcement) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-pulse">
      <div className="bg-white p-10 rounded-xl max-w-3xl text-center shadow-2xl border-4 border-yellow-400">
        <div className="uppercase text-yellow-600 font-semibold mb-2">Important</div>
        <h2 className="text-4xl font-bold mb-6 text-blue-800 uppercase tracking-wider">ANNOUNCEMENT</h2>
        <p className="text-3xl font-medium">{announcement}</p>
        {announcementCountdown !== null && (
          <div className="mt-6 px-4 py-2 bg-gray-100 rounded-full inline-block text-gray-600">
            Closing in <span className="font-bold">{announcementCountdown}</span> seconds...
          </div>
        )}
      </div>
    </div>
  );
};
