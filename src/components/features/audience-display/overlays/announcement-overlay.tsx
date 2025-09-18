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
      <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 lg:p-8">
        <div className="relative max-w-7xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden mx-2">
          {announcement.title && (
            <div className="absolute top-0 left-0 right-0 bg-black/70 text-white p-2 sm:p-3 lg:p-4 z-10">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-center">{announcement.title}</h2>
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
                parent.innerHTML = '<div class="flex items-center justify-center h-96 text-red-600 text-base sm:text-lg lg:text-xl font-bold">Failed to load image</div>';
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
      <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 lg:p-8">
        <div className="relative max-w-7xl max-h-[90vh] bg-black rounded-lg shadow-2xl overflow-hidden mx-2">
          {announcement.title && (
            <div className="absolute top-0 left-0 right-0 bg-black/70 text-white p-2 sm:p-3 lg:p-4 z-10">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-center">{announcement.title}</h2>
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
                parent.innerHTML = '<div class="flex items-center justify-center h-96 text-red-600 text-base sm:text-lg lg:text-xl font-bold">Failed to load video</div>';
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
      <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 lg:p-8">
        <div className="bg-white p-4 sm:p-6 lg:p-8 xl:p-12 rounded-xl max-w-5xl text-center shadow-2xl border-4 border-yellow-400 mx-2">
          <div className="uppercase text-yellow-600 font-semibold mb-2 sm:mb-3 lg:mb-4 text-sm sm:text-base lg:text-lg">Important</div>
          {announcement.title && (
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 sm:mb-4 lg:mb-6 xl:mb-8 text-blue-800 uppercase tracking-wider">
              {announcement.title}
            </h2>
          )}
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 sm:mb-3 lg:mb-4 xl:mb-6 text-blue-800 uppercase tracking-wider">
            {announcement.title ? "" : "ANNOUNCEMENT"}
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium leading-relaxed whitespace-pre-wrap">
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
        <div className="absolute bottom-2 sm:bottom-4 lg:bottom-8 right-2 sm:right-4 lg:right-8 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-black/70 backdrop-blur-sm rounded-full text-white border border-white/20">
          <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base lg:text-lg font-semibold">
            <div className="w-2 sm:w-2.5 lg:w-3 h-2 sm:h-2.5 lg:h-3 bg-red-500 rounded-full animate-pulse" />
            <span>Closing in {announcementCountdown}s</span>
          </div>
        </div>
      )}
      
      {/* ESC key hint */}
      <div className="absolute top-2 sm:top-4 lg:top-8 right-2 sm:right-4 lg:right-8 px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs sm:text-sm border border-white/20">
        Press ESC to close
      </div>
    </div>
  );
};
