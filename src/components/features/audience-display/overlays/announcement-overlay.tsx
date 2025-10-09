import React from "react";
import { AnnouncementData, extractYouTubeId } from "@/hooks/control-match/use-announcement";
import Image from "next/image";

interface AnnouncementOverlayProps {
  announcement: AnnouncementData;
  showAnnouncement: boolean;
  announcementCountdown: number | null;
  textSize?: 'small' | 'medium' | 'large' | 'xlarge';
  textColor?: string;
}

export const AnnouncementOverlay: React.FC<AnnouncementOverlayProps> = ({
  announcement,
  showAnnouncement,
  announcementCountdown,
  textSize = 'large',
  textColor = '#ffffff',
}) => {
  if (!showAnnouncement || !announcement?.content) {
    return null;
  }

  // Render YouTube video
  const renderYouTubeVideo = () => {
    const videoId = extractYouTubeId(announcement.content);

    if (!videoId) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-white p-8">
            <div className="text-2xl font-bold mb-4">YouTube Error</div>
            <div className="text-lg">Unable to extract video ID from URL</div>
            <div className="text-sm mt-2 opacity-75 max-w-md">{announcement.content}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1`}
          className="w-full h-full"
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
      <div className="w-full h-full">
        <img
          src={announcement.content}
          alt={announcement.title || "Announcement Image"}
          className="w-full h-full object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="flex items-center justify-center h-full text-white text-xl md:text-2xl font-bold">
                  Failed to load image
                </div>
              `;
            }
          }}
        />
      </div>
    );
  };

  // Render video
  const renderVideo = () => {
    return (
      <div className="w-full h-full">
        <video
          src={announcement.content}
          className="w-full h-full object-contain"
          autoPlay
          muted
          controls
          onError={(e) => {
            const target = e.target as HTMLVideoElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="flex items-center justify-center h-full text-white text-xl md:text-2xl font-bold">
                  Failed to load video
                </div>
              `;
            }
          }}
        >
          Your browser does not support the video element.
        </video>
      </div>
    );
  };

  // Get text size classes based on textSize prop
  const getTextSizeClasses = (size: string) => {
    switch (size) {
      case 'small':
        return 'text-xl md:text-2xl lg:text-3xl';
      case 'medium':
        return 'text-2xl md:text-3xl lg:text-4xl';
      case 'large':
        return 'text-3xl md:text-4xl lg:text-5xl';
      case 'xlarge':
        return 'text-9xl md:text-11xl lg:text-13xl';
      default:
        return 'text-3xl md:text-4xl lg:text-5xl';
    }
  };

  // Render text announcement
  const renderText = () => {
    const titleClasses = `${getTextSizeClasses(textSize)} font-bold mb-8 uppercase tracking-wider`;
    const contentClasses = `${getTextSizeClasses(textSize)} font-medium leading-relaxed whitespace-pre-wrap`;

    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="text-center">
          {announcement.title && (
            <h2 className={titleClasses} style={{ color: textColor }}>
              {announcement.title}
            </h2>
          )}
          <p className={contentClasses} style={{ color: textColor }}>
            {announcement.content}
          </p>
        </div>
      </div>
    );
  };

  // Get the appropriate content renderer based on announcement type
  const renderContent = () => {
    switch (announcement.type) {
      case 'youtube':
        return renderYouTubeVideo();
      case 'image':
        return renderImage();
      case 'video':
        return renderVideo();
      case 'text':
      default:
        return renderText();
    }
  };

  // Check if this is a media announcement (image, video, youtube)
  const isMediaAnnouncement = announcement.type === 'image' || announcement.type === 'video' || announcement.type === 'youtube';

  return (
    <div className="fixed inset-0 bg-black text-white w-full h-full flex flex-col relative overflow-hidden z-50 animate-in fade-in duration-500" style={{ aspectRatio: '16/9' }}>
      {/* Top White Bar - Only show for text announcements */}
      {!isMediaAnnouncement && (
        <div className="absolute top-0 left-0 right-0 h-[120px] bg-white z-30 flex items-center justify-center">
          <h1 className="text-black text-4xl md:text-5xl font-bold text-center">
            Thông báo từ Ban Tổ Chức
          </h1>
        </div>
      )}

      {/* Main content area */}
      <div className={`relative z-10 flex-1 flex flex-col ${isMediaAnnouncement ? '' : 'pt-[120px] pb-[10%]'}`}>
        {/* Announcement Content */}
        <div className={`flex-1 flex items-center justify-center ${isMediaAnnouncement ? '' : 'px-8'}`}>
          {renderContent()}
        </div>
      </div>

      {/* Bottom White Bar - Footer - Only show for text announcements */}
      {!isMediaAnnouncement && (
        <footer className="bg-white h-[10%] w-full flex items-center px-8 relative z-20">
          {/* Logos */}
          <div className="flex items-center gap-4 h-full py-2 w-[400px]">
            <div className="relative h-full aspect-square w-full">
              <Image
                src="/btc_trans.png"
                alt="Logo STEAM For Vietnam, Đại học Bách khoa Hà Nội, UNICEF, Đại sứ quán Hoa Kỳ"
                fill
                className="object-contain"
                sizes="400px"
              />
            </div>
          </div>

          {/* Event info */}
          <div className="flex-1 text-center">
            <p className="text-black text-2xl md:text-3xl font-bold">
              STEMESE Festival - 19/10 - Đại học Bách Khoa Hà Nội
            </p>
          </div>

          {/* LIVE indicator */}
          <div className="flex items-center justify-end gap-2 w-[320px]">
            <div className="w-[18px] h-[18px] bg-[#00FF2F] rounded-full animate-pulse" />
            <span className="text-[#00FF2F] text-[32px] font-bold">LIVE</span>
          </div>
        </footer>
      )}

      {/* Countdown Timer - Only show for text announcements */}
      {!isMediaAnnouncement && announcementCountdown !== null && (
        <div className="absolute bottom-[12%] right-8 px-6 py-3 bg-black/80 backdrop-blur-sm rounded-full text-white border-2 border-white/20 shadow-lg">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span>{announcementCountdown}s</span>
          </div>
        </div>
      )}

      {/* ESC key hint - Only show for text announcements */}
      {!isMediaAnnouncement && (
        <div className="absolute top-[130px] right-8 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg text-white text-sm border border-white/20 shadow-lg">
          Press ESC to close
        </div>
      )}
    </div>
  );
};
