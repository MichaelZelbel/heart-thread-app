import { Helmet } from "react-helmet-async";

interface BlogSEOProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  author?: string;
}

export function BlogSEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = "website",
  publishedTime,
  author,
}: BlogSEOProps) {
  const siteUrl = window.location.origin;
  const fullCanonical = canonical.startsWith("http") ? canonical : `${siteUrl}${canonical}`;
  const fullOgImage = ogImage?.startsWith("http") ? ogImage : ogImage ? `${siteUrl}${ogImage}` : undefined;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullCanonical} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:type" content={ogType} />
      {fullOgImage && <meta property="og:image" content={fullOgImage} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={fullOgImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {fullOgImage && <meta name="twitter:image" content={fullOgImage} />}
    </Helmet>
  );
}
