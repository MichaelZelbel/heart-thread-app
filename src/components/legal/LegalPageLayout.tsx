import { useEffect, ReactNode } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Section {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  title: string;
  seoTitle: string;
  seoDescription: string;
  lastUpdated: string;
  sections: Section[];
  children: ReactNode;
  footer?: ReactNode;
}

export function LegalPageLayout({
  title,
  seoTitle,
  seoDescription,
  lastUpdated,
  sections,
  children,
  footer,
}: LegalPageLayoutProps) {
  useEffect(() => {
    document.title = `${title} - Cherishly`;
    window.scrollTo(0, 0);
  }, [title]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <SEOHead title={seoTitle} description={seoDescription} />
      <style>{`
        @media print {
          nav, footer, .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Table of Contents — tinted sidebar */}
            <aside className="lg:w-64 shrink-0 no-print">
              <nav className="sticky top-8 rounded-xl bg-muted/60 p-5 space-y-1">
                <h2 className="font-semibold text-base mb-3 text-foreground">Table of Contents</h2>
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1.5 leading-snug"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 legal-prose max-w-none">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-4xl font-bold mb-2 text-foreground">{title}</h1>
                  <p className="text-muted-foreground">
                    <strong>Last updated:</strong> {lastUpdated}
                  </p>
                </div>
                <Button onClick={handlePrint} variant="outline" size="sm" className="no-print shrink-0">
                  <Printer className="w-4 h-4 mr-2" />
                  Print / Save PDF
                </Button>
              </div>

              <div className="print-only mb-8">
                <h1 className="text-3xl font-bold">{title} - Cherishly</h1>
                <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
              </div>

              {children}

              {footer}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
