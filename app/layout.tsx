import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Job Scraper Dashboard | Professional Multi-Platform Job Collection",
  description: "Advanced job scraping dashboard for collecting opportunities from Indeed, LinkedIn, and company websites. Built with Next.js and optimized for cloud deployment.",
  keywords: ["job scraper", "indeed", "linkedin", "job search", "recruitment", "automation"],
  authors: [{ name: "Job Scraper Team" }],
  creator: "Job Scraper Dashboard",
  openGraph: {
    title: "Job Scraper Dashboard",
    description: "Professional job collection from multiple platforms",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          {children}
        </main>
      </body>
    </html>
  )
} 