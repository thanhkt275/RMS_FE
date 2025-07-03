import React from 'react';

export const metadata = {
  title: 'Audience Display | Tournament Management',
  description: 'Live match information for audience display',
};

export default function AudienceDisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="audience-display-layout">
      {children}
    </div>
  );
}