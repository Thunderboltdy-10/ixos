export default function SubpageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        paddingTop: 60,
        minHeight: "100vh",
        backgroundColor: "transparent",
        color: "#F3F5F7",
      }}
    >
      {children}
    </main>
  );
}
