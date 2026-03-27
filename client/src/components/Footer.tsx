import { SITE } from '../config/site'

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 text-xs text-slate-500 flex justify-between items-center">
        <span>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</span>
        <span>Made just for you.</span>
      </div>
    </footer>
  )
}
