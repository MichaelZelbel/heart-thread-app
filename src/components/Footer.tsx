const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Privacy Policy
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Terms of Service
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="/cookies"
              className="text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Cookies Policy
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Pricing
            </a>
          </div>

          {/* Contact Line */}
          <p className="text-sm text-muted-foreground">
            Questions or feedback? Reach us anytime at{" "}
            <a
              href="mailto:support@cherishly.ai"
              className="text-foreground hover:text-primary transition-colors underline"
            >
              support@cherishly.ai
            </a>
            {" "}💗
          </p>

          {/* Business Line */}
          <p className="text-sm text-muted-foreground">
            © {currentYear} by Zelbel Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
