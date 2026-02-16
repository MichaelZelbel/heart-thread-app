import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noIndex?: boolean;
}

const SITE_NAME = "Cherishly";
const DEFAULT_TITLE = "Cherishly — Your Relationship Companion";
const DEFAULT_DESCRIPTION =
  "Cherishly helps you remember and celebrate your loved ones — start free or upgrade for premium features like reminders, AI guidance, and more.";

export function SEOHead({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogType = "website",
  noIndex = false,
}: SEOHeadProps) {
  const fullTitle = title || DEFAULT_TITLE;
  const fullDescription = description || DEFAULT_DESCRIPTION;

  // Build canonical: use explicit prop, or derive from current pathname (strips query params)
  const canonical =
    canonicalUrl && canonicalUrl.startsWith("http")
      ? canonicalUrl
      : `${window.location.origin}${canonicalUrl || window.location.pathname}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <link rel="canonical" href={canonical} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
}
