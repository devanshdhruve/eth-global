import Link from "next/link"
import { Github, Linkedin, Twitter, MessageCircle } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-background/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4 gradient-text">DataChain</h3>
            <p className="text-foreground/60 text-sm">Decentralized data annotation powered by blockchain.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li>
                <Link href="/projects" className="hover:text-foreground transition-colors">
                  Projects
                </Link>
              </li>
              <li>
                <Link href="/annotate" className="hover:text-foreground transition-colors">
                  Annotate
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Whitepaper
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Docs
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                <MessageCircle size={20} />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex justify-between items-center text-sm text-foreground/60">
          <p>&copy; 2025 DataChain. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
