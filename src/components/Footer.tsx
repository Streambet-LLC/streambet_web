import { Link } from 'react-router-dom';
import { Instagram, Twitter, Gamepad2, Video } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-background border-t border-border mt-16">
      <div className="container py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#B4FF39]">Streambet</h3>
            <p className="text-sm text-muted-foreground">
              Live betting for games created by the internet.
            </p>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Contact</h3>
            <a
              href="mailto:jeff@streambet.tv"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              jeff@streambet.tv
            </a>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Follow Us</h3>
            <div className="flex space-x-4">
              <a
                href="https://tiktok.com/@streambet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Video className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com/streambet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com/streambet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://kick.com/streambet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Gamepad2 className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-center text-muted-foreground">
            © {new Date().getFullYear()} Streambet. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
