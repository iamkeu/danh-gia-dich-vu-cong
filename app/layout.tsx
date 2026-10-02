export const metadata = {
  title: 'Zalo OA Gateway',
  description: 'Đánh giá Dịch vụ Công – Zalo OA và Mini App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
