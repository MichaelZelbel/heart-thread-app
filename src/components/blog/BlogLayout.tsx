import { Link } from "react-router-dom";
import { BlogSidebar } from "./BlogSidebar";
import { ArrowLeft } from "lucide-react";

interface BlogLayoutProps {
  children: React.ReactNode;
  showBackLink?: boolean;
}

export function BlogLayout({ children, showBackLink = false }: BlogLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/blog" className="flex items-center gap-2">
              {showBackLink && <ArrowLeft className="h-4 w-4" />}
              <h1 className="text-2xl font-bold">Blog</h1>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr,300px] gap-8">
          <div>{children}</div>
          <BlogSidebar />
        </div>
      </main>
    </div>
  );
}
