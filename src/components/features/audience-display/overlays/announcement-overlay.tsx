import React from "react";
import { colors, typography, spacing, components, responsive, cn } from "../design-system";

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
    <div className={cn("fixed inset-0 bg-black/80 flex items-center justify-center z-50", responsive.containerPadding)}>
      <div className={cn("bg-white", spacing.padding.xl, "rounded-xl max-w-3xl w-full text-center shadow-2xl border-4 border-yellow-400")}>
        <div className={cn(typography.label.md, "text-yellow-600 mb-2")}>Important</div>
        <h2 className={cn(responsive.text.display, colors.text.blue, "mb-6 uppercase tracking-wider")}>ANNOUNCEMENT</h2>
        <p className={cn(responsive.text.subheading, colors.text.primary, "mb-6")}>{announcement}</p>
        {announcementCountdown !== null && (
          <div className={cn("mt-6 px-4 py-2", colors.gray[100], "rounded-full inline-block", colors.text.secondary)}>
            Closing in <span className="font-bold">{announcementCountdown}</span> seconds...
          </div>
        )}
      </div>
    </div>
  );
};
