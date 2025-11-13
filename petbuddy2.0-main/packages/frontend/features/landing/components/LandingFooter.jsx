import Logo from "@/shared/components/ui/Logo";
import { IconButton } from "@/shared/components/ui";

export default function LandingFooter() {
  return (
    <footer className="bg-neutral-900 text-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <Logo size="lg" />
            <p className="text-neutral-400 mt-4 max-w-xs">
              The ultimate platform for modern pet grooming businesses.
              Streamline operations and delight customers.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Product</h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  API
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Integrations
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Support</h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Status
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Community
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex gap-4">
              <IconButton
                as="a"
                href="#"
                variant="ghost"
                className="text-neutral-400 hover:text-white"
                aria-label="Facebook"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22 12c0-5.522-4.477-10-10-10S2 6.478 2 12c0 4.991 3.657 9.128 8.438 9.877v-6.987h-2.54v-2.89h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.242 0-1.632.771-1.632 1.562v1.875h2.773l-.443 2.89h-2.33v6.987C18.343 21.128 22 16.991 22 12" />
                </svg>
              </IconButton>
              <IconButton
                as="a"
                href="#"
                variant="ghost"
                className="text-neutral-400 hover:text-white"
                aria-label="Instagram"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5zm4.25 2.25a6.25 6.25 0 1 1 0 12.5a6.25 6.25 0 0 1 0-12.5zm0 1.5a4.75 4.75 0 1 0 0 9.5a4.75 4.75 0 0 0 0-9.5zm6.25 1.25a1 1 0 1 1-2 0a1 1 0 0 1 2 0z" />
                </svg>
              </IconButton>
              <IconButton
                as="a"
                href="#"
                variant="ghost"
                className="text-neutral-400 hover:text-white"
                aria-label="LinkedIn"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-9h3v9zm-1.5-10.28c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75s1.75.784 1.75 1.75s-.784 1.75-1.75 1.75zm13.5 10.28h-3v-4.5c0-1.08-.02-2.47-1.5-2.47c-1.5 0-1.73 1.17-1.73 2.38v4.59h-3v-9h2.89v1.23h.04c.4-.76 1.38-1.56 2.84-1.56c3.04 0 3.6 2 3.6 4.59v4.74z" />
                </svg>
              </IconButton>
              <IconButton
                as="a"
                href="#"
                variant="ghost"
                className="text-neutral-400 hover:text-white"
                aria-label="WhatsApp"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967c-.273-.099-.472-.148-.67.15c-.197.297-.767.967-.94 1.164c-.173.198-.347.223-.644.075c-.297-.149-1.255-.463-2.39-1.475c-.883-.788-1.48-1.761-1.653-2.059c-.173-.297-.018-.458.13-.606c.134-.133.298-.347.447-.52c.149-.174.198-.298.298-.497c.099-.198.05-.372-.025-.521c-.075-.149-.669-1.612-.916-2.207c-.242-.579-.487-.5-.669-.51c-.173-.008-.372-.01-.571-.01c-.198 0-.52.074-.792.372c-.272.297-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074c.149.198 2.099 3.2 5.077 4.366c.71.306 1.263.489 1.695.626c.712.227 1.36.195 1.872.118c.571-.085 1.758-.719 2.006-1.413c.248-.695.248-1.29.173-1.413c-.074-.124-.272-.198-.57-.347m-5.421 7.617h-.001a9.87 9.87 0 0 1-5.031-1.378l-.361-.214l-3.741.982l1-3.656l-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.455 4.436-9.89 9.892-9.89c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.902 6.992c-.003 5.456-4.438 9.891-9.892 9.891m8.413-18.304A11.815 11.815 0 0 0 12.05.001C5.495.001.06 5.436.058 12.003c0 2.122.555 4.199 1.607 6.032L.057 24l6.116-1.635a11.93 11.93 0 0 0 5.877 1.501h.005c6.557 0 11.993-5.435 11.995-12.002a11.93 11.93 0 0 0-3.504-8.486" />
                </svg>
              </IconButton>
            </div>

            <div className="text-center text-sm text-neutral-400">
              <p className="mb-2">
                Operated by შპს ფეთბადი (LLC Petbuddy), Registered in Georgia by
                Bezhan Kalichava and Aleksandre Phiphia.
              </p>
              <p className="mb-2">+995 599 857 128</p>
              <div className="flex items-center justify-center gap-4">
                <a
                  href="/terms"
                  className="hover:text-white transition-colors underline"
                >
                  Terms of Use
                </a>
                <a
                  href="/privacy"
                  className="hover:text-white transition-colors underline"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
