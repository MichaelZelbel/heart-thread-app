import { Helmet } from "react-helmet-async";

interface BlogSEOProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  author?: string;
  articleData?: {
    headline: string;
    datePublished: string;
    dateModified?: string;
    author?: string;
    image?: string;
    description: string;
  };
}

const SITE_NAME = "Cherishly";
const SITE_URL = typeof window !== "undefined" ? window.location.origin : "";

export function BlogSEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = "website",
  publishedTime,
  author,
  articleData,
}: BlogSEOProps) {
  const fullCanonical = canonical.startsWith("http") ? canonical : `${SITE_URL}${canonical}`;
  const fullOgImage = ogImage?.startsWith("http") ? ogImage : ogImage ? `${SITE_URL}${ogImage}` : undefined;

  // JSON-LD structured data for articles
  const jsonLd = articleData
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: articleData.headline,
        datePublished: articleData.datePublished,
        dateModified: articleData.dateModified || articleData.datePublished,
        author: articleData.author
          ? {
              "@type": "Person",
              name: articleData.author,
            }
          : undefined,
        image: articleData.image,
        description: articleData.description,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": fullCanonical,
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
        },
      }
    : null;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullCanonical} />

      {/* RSS Autodiscovery */}
      <link
        rel="alternate"
        type="application/rss+xml"
        title={`${SITE_NAME} Blog RSS Feed`}
        href={`${SITE_URL}/functions/v1/rss-feed`}
      />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      {fullOgImage && <meta property="og:image" content={fullOgImage} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={fullOgImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {fullOgImage && <meta name="twitter:image" content={fullOgImage} />}

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
