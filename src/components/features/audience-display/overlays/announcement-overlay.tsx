import React from "react";
import { AnnouncementData, extractYouTubeId } from "@/hooks/control-match/use-announcement";

interface AnnouncementOverlayProps {
  announcement: AnnouncementData;
  showAnnouncement: boolean;
  announcementCountdown: number | null;
}

export const AnnouncementOverlay: React.FC<AnnouncementOverlayProps> = ({
  announcement,
  showAnnouncement,
  announcementCountdown,
}) => {
  // DEBUG: Log what props the overlay receives
  console.log('🎭 [AnnouncementOverlay] Component rendered with props:', {
    announcement,
    showAnnouncement,
    announcementCountdown,
    hasContent: !!(announcement?.content),
    contentLength: announcement?.content?.length || 0,
    type: announcement?.type
  });

  if (!showAnnouncement || !announcement?.content) {
    console.log('🎭 [AnnouncementOverlay] Not rendering - showAnnouncement:', showAnnouncement, 'hasContent:', !!(announcement?.content));
    return null;
  }

  console.log('🎭 [AnnouncementOverlay] Will render announcement type:', announcement.type, 'content:', announcement.content.substring(0, 50) + '...');

  // Render YouTube video
  const renderYouTubeVideo = () => {
    const videoId = extractYouTubeId(announcement.content);
    console.log('🎥 [YouTube] Extracted video ID:', videoId, 'from URL:', announcement.content);
    
    if (!videoId) {
      console.error('🎥 [YouTube] Failed to extract video ID from URL:', announcement.content);
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md text-center">
            <strong className="font-bold">YouTube Error:</strong>
            <span className="block sm:inline"> Unable to extract video ID from URL</span>
            <div className="text-sm mt-2 opacity-75">{announcement.content}</div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="w-full h-full flex items-center justify-center">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1`}
          className="w-full h-full max-w-7xl max-h-[90vh] rounded-lg shadow-2xl"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={announcement.title || "YouTube Video"}
        />
      </div>
    );
  };

  // Render image
  const renderImage = () => {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="relative max-w-7xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
          {announcement.title && (
            <div className="absolute top-0 left-0 right-0 bg-black/70 text-white p-4 z-10">
              <h2 className="text-2xl font-bold text-center">{announcement.title}</h2>
            </div>
          )}
          <img
            src={announcement.content}
            alt={announcement.title || "Announcement Image"}
            className="w-full h-full object-contain rounded-lg"
            onError={(e) => {
              console.error('Failed to load image:', announcement.content);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="flex items-center justify-center h-96 text-red-600 text-xl font-bold">Failed to load image</div>';
              }
            }}
          />
        </div>
      </div>
    );
  };

  // Render video
  const renderVideo = () => {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="relative max-w-7xl max-h-[90vh] bg-black rounded-lg shadow-2xl overflow-hidden">
          {announcement.title && (
            <div className="absolute top-0 left-0 right-0 bg-black/70 text-white p-4 z-10">
              <h2 className="text-2xl font-bold text-center">{announcement.title}</h2>
            </div>
          )}
          <video
            src={announcement.content}
            className="w-full h-full object-contain rounded-lg"
            autoPlay
            muted
            controls
            onError={(e) => {
              console.error('Failed to load video:', announcement.content);
              const target = e.target as HTMLVideoElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="flex items-center justify-center h-96 text-red-600 text-xl font-bold">Failed to load video</div>';
              }
            }}
          >
            Your browser does not support the video element.
          </video>
        </div>
      </div>
    );
  };

  // Render text announcement
  const renderText = () => {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="bg-white p-12 rounded-xl max-w-5xl text-center shadow-2xl border-4 border-yellow-400">
          <div className="uppercase text-yellow-600 font-semibold mb-4 text-lg">Important</div>
          {announcement.title && (
            <h2 className="text-5xl font-bold mb-8 text-blue-800 uppercase tracking-wider">
              {announcement.title}
            </h2>
          )}
          <h2 className="text-4xl font-bold mb-6 text-blue-800 uppercase tracking-wider">
            {announcement.title ? "" : "ANNOUNCEMENT"}
          </h2>
          <p className="text-3xl font-medium leading-relaxed whitespace-pre-wrap">
            {announcement.content}
          </p>
        </div>
      </div>
    );
  };

  // Get the appropriate content renderer based on announcement type
  const renderContent = () => {
    console.log('🎭 [AnnouncementOverlay] Rendering content for type:', announcement.type);
    
    switch (announcement.type) {
      case 'youtube':
        console.log('🎥 [AnnouncementOverlay] Rendering YouTube video for:', announcement.content);
        return renderYouTubeVideo();
      case 'image':
        console.log('🖼️ [AnnouncementOverlay] Rendering image for:', announcement.content);
        return renderImage();
      case 'video':
        console.log('🎥 [AnnouncementOverlay] Rendering video for:', announcement.content);
        return renderVideo();
      case 'text':
      default:
        console.log('📝 [AnnouncementOverlay] Rendering text content:', announcement.content.substring(0, 50) + '...');
        return renderText();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-500">
      {renderContent()}
      
      {/* Countdown Timer (always visible) */}
      {announcementCountdown !== null && (
        <div className="absolute bottom-8 right-8 px-6 py-3 bg-black/70 backdrop-blur-sm rounded-full text-white border border-white/20">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span>Closing in {announcementCountdown}s</span>
          </div>
        </div>
      )}
      
      {/* ESC key hint */}
      <div className="absolute top-8 right-8 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-lg text-white text-sm border border-white/20">
        Press ESC to close
      </div>
    </div>
  );
};
