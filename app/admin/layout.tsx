export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The admin layout inherits from root layout
  // We just return children here, and the root layout handles the sidebar
  return <>{children}</>;
}
