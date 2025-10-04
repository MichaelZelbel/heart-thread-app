const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="https://www.privacypolicies.com/live/c31c597d-3b2e-4647-9f97-0fa112857bf3"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Privacy Policy
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="https://www.privacypolicies.com/live/f038b7e6-ea73-4cd2-9a8c-313a4373595e"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Terms of Service
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="https://www.privacypolicies.com/live/9d62cd6c-3001-4c0f-bc51-a44ae87f40d8"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Cookies Policy
            </a>
          </div>

          {/* Contact Line */}
          <p className="text-sm text-muted-foreground">
            Questions or feedback? Reach out at{" "}
            <a
              href="mailto:michael@lotuslovelabs.com"
              className="text-foreground hover:text-primary transition-colors underline"
            >
              michael@lotuslovelabs.com
            </a>
          </p>

          {/* Business Line */}
          <p className="text-sm text-muted-foreground">
            © {currentYear} by Michael Zelbel. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
