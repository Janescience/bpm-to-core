'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const menuItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/templates', label: 'Templates', icon: '📋' },
    { href: '/products', label: 'Products', icon: '📦' },
    { href: '/flows', label: 'Flow Charts', icon: '🔄' },
    { href: '/functions', label: 'Functions', icon: '⚡' },
    { href: '/soap-logs', label: 'SOAP Logs', icon: '📝' },
    { href: '/config', label: 'Config', icon: '⚙️' }
  ]

  const isActive = (href) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-black text-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold">BPM to Core</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'bg-white text-black'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-300 hover:text-white focus:outline-none focus:text-white"
              id="mobile-menu-button"
              onClick={() => {
                const menu = document.getElementById('mobile-menu')
                menu.classList.toggle('hidden')
              }}
            >
              <span className="sr-only">Open main menu</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="hidden md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-800">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'bg-white text-black'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => {
                  document.getElementById('mobile-menu').classList.add('hidden')
                }}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}