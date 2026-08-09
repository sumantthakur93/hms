export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — placeholder, to be built in #10 prototype */}
      <aside className="hidden w-64 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-lg font-bold text-blue-800">CarePoint</span>
        </div>
        <nav className="p-4">
          <p className="text-xs text-gray-400">Sidebar navigation placeholder</p>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Header — placeholder */}
        <header className="flex h-16 items-center border-b border-gray-200 bg-white px-6">
          <p className="text-sm text-gray-400">Header placeholder</p>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
