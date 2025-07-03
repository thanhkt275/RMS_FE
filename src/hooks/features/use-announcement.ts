import { useEffect, useState } from "react";

export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState("");
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementCountdown, setAnnouncementCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!showAnnouncement) {
      setAnnouncementCountdown(null);
      return;
    }
    if (announcementCountdown === null) {
      setAnnouncementCountdown(10);
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
  }, [showAnnouncement, announcementCountdown]);

  return {
    announcement,
    setAnnouncement,
    showAnnouncement,
    setShowAnnouncement,
    announcementCountdown,
    setAnnouncementCountdown,
  };
}
