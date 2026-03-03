import React from "react";
import { Shield, Github, Mail, Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface-dark border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-2xl font-display font-bold text-white">FortCode</span>
            </div>
            <p className="text-gray-400 text-sm text-center md:text-left">
              Master programming through strategic challenges and epic battles.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center">
            <h3 className="font-display font-semibold text-white mb-3">Quick Links</h3>
            <nav className="flex flex-col gap-2">
              <a href="/home" className="text-gray-400 hover:text-primary transition-colors text-sm">
                Home
              </a>
              <a href="/training" className="text-gray-400 hover:text-primary transition-colors text-sm">
                Training Grounds
              </a>
              <a href="/arena" className="text-gray-400 hover:text-primary transition-colors text-sm">
                Battle Arena
              </a>
              <a href="/dashboard" className="text-gray-400 hover:text-primary transition-colors text-sm">
                Dashboard
              </a>
            </nav>
          </div>

          {/* Contact & Social */}
          <div className="flex flex-col items-center md:items-end">
            <h3 className="font-display font-semibold text-white mb-3">Connect</h3>
            <div className="flex gap-4 mb-4">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="mailto:contact@fortcode.com" 
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
            <p className="text-gray-400 text-sm text-center md:text-right">
              Need help? <a href="/settings" className="text-primary hover:underline">Contact Support</a>
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-gray-500 text-sm">
            © {currentYear} FortCode. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-500 fill-current" /> by the FortCode Team
          </p>
        </div>
      </div>
    </footer>
  );
}
