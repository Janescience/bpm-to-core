import { Kanit } from 'next/font/google'
import "./globals.css"
import Navbar from './components/Navbar'

const kanit = Kanit({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['thai', 'latin'],
  variable: '--font-kanit',
})

export const metadata = {
  title: "BPM to Core",
  description: "BPM to Core Application",
}

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={kanit.variable}>
      <body className="font-kanit antialiased bg-white text-black">
        <Navbar />
        <main className="min-h-screen pt-16">
          {children}
        </main>
      </body>
    </html>
  )
}
