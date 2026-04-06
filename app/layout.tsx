import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spending Tracker",
  description: "Manage and track your spending",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="container navbar-content">
            <Link href="/" className="logo">
              Spending Tracker
            </Link>
            <div className="nav-links">
              <Link href="/transactions" className="nav-link">
                Transactions
              </Link>
              <Link href="/transactions/upload" className="nav-link">
                Upload
              </Link>
              <Link href="/accounts" className="nav-link">
                Accounts
              </Link>
              <Link href="/categories" className="nav-link">
                Categories
              </Link>
              <Link href="/tags" className="nav-link">
                Tags
              </Link>
              <Link href="/projects" className="nav-link">
                Projects
              </Link>
              <Link href="/automation" className="nav-link">
                Automation
              </Link>
              <Link href="/reports" className="nav-link">
                Reports
              </Link>
              <Link href="/backup" className="nav-link">
                Backup
              </Link>
              <Link href="/admin" className="nav-link">
                Admin
              </Link>
            </div>
          </div>
        </nav>
        <main className="container main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
