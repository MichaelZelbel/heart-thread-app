import { useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const CookiesPolicy = () => {
  useEffect(() => {
    document.title = "Cookies Policy - Cherishly";
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const sections = [
    { id: "interpretation", title: "Interpretation and Definitions" },
    { id: "use", title: "The use of the Cookies" },
    { id: "choices", title: "Your Choices Regarding Cookies" },
    { id: "more", title: "More Information about Cookies" },
    { id: "contact", title: "Contact Us" },
  ];

  return (
    <>
      <SEOHead title="Cookies Policy | Cherishly" description="Learn how Cherishly uses cookies and your choices regarding them." />
      <style>{`
        @media print {
          nav, footer, .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Table of Contents */}
            <aside className="lg:w-64 shrink-0 no-print">
              <nav className="sticky top-8 space-y-2">
                <h2 className="font-semibold text-lg mb-4">Table of Contents</h2>
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 prose prose-slate dark:prose-invert max-w-none">
              <div className="flex justify-between items-start mb-8 not-prose">
                <div>
                  <h1 className="text-4xl font-bold mb-2">Cookies Policy</h1>
                  <p className="text-muted-foreground">
                    <strong>Last updated:</strong> October 9, 2025
                  </p>
                </div>
                <Button onClick={handlePrint} variant="outline" size="sm" className="no-print">
                  <Printer className="w-4 h-4 mr-2" />
                  Print / Save PDF
                </Button>
              </div>

              <div className="print-only mb-8">
                <h1 className="text-3xl font-bold">Cookies Policy - Cherishly</h1>
                <p className="text-sm text-muted-foreground">Last updated: October 9, 2025</p>
              </div>

              <p>
                This Cookies Policy explains what Cookies are and how We use them. You should read this policy so You can understand what type of cookies We use, or the information We collect using Cookies and how that information is used.
              </p>

              <p>
                Cookies do not typically contain any information that personally identifies a user, but personal information that we store about You may be linked to the information stored in and obtained from Cookies. For further information on how We use, store and keep your personal data secure, see our <Link to="/privacy">Privacy Policy</Link>.
              </p>

              <p>
                We do not store sensitive personal information, such as mailing addresses, account passwords, etc. in the Cookies We use.
              </p>

              <h2 id="interpretation">Interpretation and Definitions</h2>

              <h3>Interpretation</h3>

              <p>
                The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
              </p>

              <h3>Definitions</h3>

              <p>For the purposes of this Cookies Policy:</p>

              <ul>
                <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Cookies Policy) refers to Zelbel Ltd., 69 Great Hampton Street Birmingham, B18 6EW United Kingdom.</li>
                <li><strong>Cookies</strong> means small files that are placed on Your computer, mobile device or any other device by a website, containing details of your browsing history on that website among its many uses.</li>
                <li><strong>Website</strong> refers to Cherishly, accessible from <a href="https://cherishly.ai">https://cherishly.ai</a></li>
                <li><strong>You</strong> means the individual accessing or using the Website, or a company, or any legal entity on behalf of which such individual is accessing or using the Website, as applicable.</li>
              </ul>

              <h2 id="use">The use of the Cookies</h2>

              <h3>Type of Cookies We Use</h3>

              <p>
                Cookies can be "Persistent" or "Session" Cookies. Persistent Cookies remain on your personal computer or mobile device when You go offline, while Session Cookies are deleted as soon as You close your web browser.
              </p>

              <p>We use both session and persistent Cookies for the purposes set out below:</p>

              <ul>
                <li>
                  <strong>Necessary / Essential Cookies</strong><br />
                  Type: Session Cookies<br />
                  Administered by: Us<br />
                  Purpose: These Cookies are essential to provide You with services available through the Website and to enable You to use some of its features. They help to authenticate users and prevent fraudulent use of user accounts. Without these Cookies, the services that You have asked for cannot be provided, and We only use these Cookies to provide You with those services.
                </li>
                <li>
                  <strong>Functionality Cookies</strong><br />
                  Type: Persistent Cookies<br />
                  Administered by: Us<br />
                  Purpose: These Cookies allow us to remember choices You make when You use the Website, such as remembering your login details or language preference. The purpose of these Cookies is to provide You with a more personal experience and to avoid You having to re-enter your preferences every time You use the Website.
                </li>
              </ul>

              <h2 id="choices">Your Choices Regarding Cookies</h2>

              <p>
                If You prefer to avoid the use of Cookies on the Website, first You must disable the use of Cookies in your browser and then delete the Cookies saved in your browser associated with this website. You may use this option for preventing the use of Cookies at any time.
              </p>

              <p>
                If You do not accept Our Cookies, You may experience some inconvenience in your use of the Website and some features may not function properly.
              </p>

              <p>
                If You'd like to delete Cookies or instruct your web browser to delete or refuse Cookies, please visit the help pages of your web browser.
              </p>

              <ul>
                <li>For the Chrome web browser, please visit this page from Google: <a href="https://support.google.com/accounts/answer/32050" target="_blank" rel="noopener noreferrer">https://support.google.com/accounts/answer/32050</a></li>
                <li>For the Internet Explorer web browser, please visit this page from Microsoft: <a href="http://support.microsoft.com/kb/278835" target="_blank" rel="noopener noreferrer">http://support.microsoft.com/kb/278835</a></li>
                <li>For the Firefox web browser, please visit this page from Mozilla: <a href="https://support.mozilla.org/en-US/kb/delete-cookies-remove-info-websites-stored" target="_blank" rel="noopener noreferrer">https://support.mozilla.org/en-US/kb/delete-cookies-remove-info-websites-stored</a></li>
                <li>For the Safari web browser, please visit this page from Apple: <a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer">https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac</a></li>
              </ul>

              <p>For any other web browser, please visit your web browser's official web pages.</p>

              <h2 id="more">More Information about Cookies</h2>

              <p>
                You can learn more about cookies: <a href="https://www.privacypolicies.com/blog/cookies/" target="_blank" rel="noopener noreferrer">What Are Cookies?</a>
              </p>

              <h2 id="contact">Contact Us</h2>

              <p>If you have any questions about this Cookies Policy, You can contact us:</p>

              <ul>
                <li>By email: <a href="mailto:support@cherishly.ai">support@cherishly.ai</a></li>
              </ul>

              <div className="mt-12 pt-8 border-t text-sm text-muted-foreground not-prose">
                <p>
                  See also: <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link> | <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default CookiesPolicy;
