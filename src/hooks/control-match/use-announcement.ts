import { useEffect, useState } from "react";

export type AnnouncementType = 'text' | 'image' | 'video' | 'youtube';

export interface AnnouncementData {
  type: AnnouncementType;
  content: string; // text content, image URL, video URL, or YouTube URL
  title?: string; // optional title
  duration?: number; // auto-close after X seconds (default 10)
}

// Utility functions for media validation
export const validateImageUrl = (url: string): boolean => {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico|avif)$/i;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check file extension first
    if (imageExtensions.test(pathname)) {
      return true;
    }
    
    // Check popular image hosting services
    const imageHosts = [
      'imgur.com',
      'i.imgur.com',
      'cloudinary.com',
      'unsplash.com',
      'images.unsplash.com',
      'pixabay.com',
      'pexels.com',
      'freepik.com',
      'shutterstock.com',
      'getty.com',
      'flickr.com',
      'live.staticflickr.com',
      'photobucket.com',
      'postimg.cc',
      'tinypic.com',
      'imageshack.us',
      'gyazo.com',
      'prnt.sc',
      'lightshot.com',
      'discord.com',
      'discordapp.com',
      'cdn.discordapp.com',
      'media.discordapp.net',
      'googleusercontent.com',
      'drive.google.com',
      'dropbox.com',
      'onedrive.live.com',
      'sharepoint.com',
      'icloud.com',
      'amazonaws.com',
      's3.amazonaws.com',
      'storage.googleapis.com',
      'azure.com',
      'cloudfront.net',
      'fastly.com',
      'jsdelivr.net',
      'github.com',
      'githubusercontent.com',
      'gitlab.com',
      'bitbucket.org',
      'reddit.com',
      'redd.it',
      'i.redd.it',
      'redgifs.com',
      'gfycat.com',
      'tenor.com',
      'giphy.com',
      'media.giphy.com',
      'tumblr.com',
      'media.tumblr.com',
      'wordpress.com',
      'wp.com',
      'blogspot.com',
      'medium.com',
      'cdn-images-1.medium.com',
      'facebook.com',
      'fbcdn.net',
      'instagram.com',
      'cdninstagram.com',
      'twitter.com',
      'twimg.com',
      'pbs.twimg.com',
      'linkedin.com',
      'licdn.com',
      'pinterest.com',
      'pinimg.com',
      'telegram.org',
      't.me',
      'whatsapp.com',
      'wechat.com'
    ];
    
    // Check if hostname matches any known image hosting service
    const isImageHost = imageHosts.some(host => 
      hostname === host || hostname.endsWith('.' + host)
    );
    
    if (isImageHost) {
      return true;
    }
    
    // Check for common image URL patterns
    const imagePatterns = [
      /\/image\//,
      /\/img\//,
      /\/photo\//,
      /\/picture\//,
      /\/pics?\//,
      /\/media\//,
      /\/uploads?\//,
      /\/assets?\//,
      /\/static\//,
      /\/content\//,
      /\/files?\//,
      /\/storage\//,
      /\/cdn\//,
      /\/thumb/,
      /\/preview/,
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico|avif)/i
    ];
    
    return imagePatterns.some(pattern => pattern.test(url));
  } catch {
    return false;
  }
};

export const validateVideoUrl = (url: string): boolean => {
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp|f4v)$/i;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check file extension first
    if (videoExtensions.test(pathname)) {
      return true;
    }
    
    // Check popular video hosting services
    const videoHosts = [
      'vimeo.com',
      'player.vimeo.com',
      'dailymotion.com',
      'twitch.tv',
      'clips.twitch.tv',
      'streamable.com',
      'reddit.com',
      'v.redd.it',
      'redgifs.com',
      'gfycat.com',
      'imgur.com',
      'i.imgur.com',
      'tenor.com',
      'giphy.com',
      'media.giphy.com',
      'cloudinary.com',
      'wistia.com',
      'fast.wistia.com',
      'brightcove.com',
      'jwplatform.com',
      'jwpcdn.com',
      'kaltura.com',
      'amazonaws.com',
      's3.amazonaws.com',
      'storage.googleapis.com',
      'azure.com',
      'cloudfront.net',
      'fastly.com',
      'jsdelivr.net',
      'discord.com',
      'discordapp.com',
      'cdn.discordapp.com',
      'media.discordapp.net',
      'googleusercontent.com',
      'drive.google.com',
      'dropbox.com',
      'onedrive.live.com',
      'sharepoint.com',
      'icloud.com',
      'facebook.com',
      'fbcdn.net',
      'instagram.com',
      'cdninstagram.com',
      'twitter.com',
      'twimg.com',
      'pbs.twimg.com',
      'linkedin.com',
      'licdn.com',
      'telegram.org',
      't.me',
      'whatsapp.com',
      'wechat.com',
      'tiktok.com',
      'muscdn.com',
      'snapchat.com'
    ];
    
    // Check if hostname matches any known video hosting service
    const isVideoHost = videoHosts.some(host => 
      hostname === host || hostname.endsWith('.' + host)
    );
    
    if (isVideoHost) {
      return true;
    }
    
    // Check for common video URL patterns
    const videoPatterns = [
      /\/video\//,
      /\/vid\//,
      /\/movie\//,
      /\/clip\//,
      /\/stream\//,
      /\/media\//,
      /\/uploads?\//,
      /\/assets?\//,
      /\/static\//,
      /\/content\//,
      /\/files?\//,
      /\/storage\//,
      /\/cdn\//,
      /\/embed\//,
      /\/watch\//,
      /\/play\//,
      /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp|f4v)/i
    ];
    
    return videoPatterns.some(pattern => pattern.test(url));
  } catch {
    return false;
  }
};

export const extractYouTubeId = (url: string): string | null => {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
};

export const validateYouTubeUrl = (url: string): boolean => {
  return extractYouTubeId(url) !== null;
};

export function useAnnouncement(options: { disableAutoCountdown?: boolean } = {}) {
  const [announcement, setAnnouncement] = useState<AnnouncementData>({
    type: 'text',
    content: '',
    title: '',
    duration: 10
  });
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementCountdown, setAnnouncementCountdown] = useState<number | null>(null);

  // Validation function for current announcement
  const validateAnnouncement = (): { isValid: boolean; error?: string } => {
    if (!announcement.content.trim()) {
      return { isValid: false, error: 'Content cannot be empty' };
    }

    switch (announcement.type) {
      case 'image':
        if (!validateImageUrl(announcement.content)) {
          return { isValid: false, error: 'Please provide a valid image URL (supports various hosting services and direct links)' };
        }
        break;
      case 'video':
        if (!validateVideoUrl(announcement.content)) {
          return { isValid: false, error: 'Please provide a valid video URL (supports various hosting services and direct links)' };
        }
        break;
      case 'youtube':
        if (!validateYouTubeUrl(announcement.content)) {
          return { isValid: false, error: 'Please provide a valid YouTube URL (youtube.com or youtu.be)' };
        }
        break;
      case 'text':
      default:
        // Text is always valid if not empty
        break;
    }

    return { isValid: true };
  };

  useEffect(() => {
    // Skip auto countdown if disabled (for audience display)
    if (options.disableAutoCountdown) {
      return;
    }
    
    if (!showAnnouncement) {
      setAnnouncementCountdown(null);
      return;
    }
    
    // Use the duration from announcement data or default to 10 seconds
    const duration = announcement.duration || 10;
    
    if (announcementCountdown === null) {
      setAnnouncementCountdown(duration);
    }
    
    const intervalId = setInterval(() => {
      setAnnouncementCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (prev === 1) setTimeout(() => setShowAnnouncement(false), 100);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [showAnnouncement, announcementCountdown, announcement.duration, options.disableAutoCountdown]);

  // Helper function to update specific announcement fields
  const updateAnnouncement = (updates: Partial<AnnouncementData>) => {
    setAnnouncement(prev => ({ ...prev, ...updates }));
  };

  // Helper function to reset announcement to defaults
  const resetAnnouncement = () => {
    setAnnouncement({
      type: 'text',
      content: '',
      title: '',
      duration: 10
    });
  };

  return {
    announcement,
    setAnnouncement,
    updateAnnouncement,
    resetAnnouncement,
    showAnnouncement,
    setShowAnnouncement,
    announcementCountdown,
    setAnnouncementCountdown,
    validateAnnouncement,
    // Utility functions for media validation
    validateImageUrl,
    validateVideoUrl,
    validateYouTubeUrl,
    extractYouTubeId,
  };
}
