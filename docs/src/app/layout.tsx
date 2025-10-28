import "nextra-theme-docs/style.css";

import { Banner, Head } from "nextra/components";
/* eslint-env node */
import { Footer, Layout, Navbar } from "nextra-theme-docs";

import { GlobalStylings } from "./GlobalStylings";
import { getPageMap } from "nextra/page-map";

export const metadata = {
  metadataBase: new URL("https://codableslib.com"),
  title: {
    template: "%s - Codables",
  },
  description: "Codables: JSON serialization for complex types",
  applicationName: "Codables",
  generator: "Next.js",
  appleWebApp: {
    title: "Codables",
  },
  // other: {
  //   "msapplication-TileImage": "/ms-icon-144x144.png",
  //   "msapplication-TileColor": "#fff",
  // },
  twitter: {
    site: "https://codableslib.com",
    card: "summary_large_image",
  },
  openGraph: {
    type: "website",
    url: "https://codableslib.com",
    title: "Codables",
    description: "Codables: JSON serialization for complex types",
    images: [
      {
        url: "https://codableslib.com/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Codables",
      },
    ],
  },
};

export default async function RootLayout({ children }) {
  const navbar = (
    <Navbar
      logo={
        <div>
          <b>Codables</b>
        </div>
      }
      projectLink="https://github.com/pie6k/codables"
    />
  );
  const pageMap = await getPageMap();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head faviconGlyph="✦" />
      <body>
        <Layout
          // banner={<Banner storageKey="Nextra 2">Nextra 2 Alpha</Banner>}
          navbar={navbar}
          footer={<Footer>MIT {new Date().getFullYear()} © Codables.</Footer>}
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/pie6k/codables/blob/main/docs"
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          pageMap={pageMap}
        >
          <GlobalStylings />
          {children}
        </Layout>
      </body>
    </html>
  );
}
