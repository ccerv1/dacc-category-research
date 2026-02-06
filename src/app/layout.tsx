import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "d/acc Market Map",
  description: "Strategic positioning map of d/acc projects across atoms/bits and survive/thrive axes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
