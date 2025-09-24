// Force all routes in this directory to be dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function MatchesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}