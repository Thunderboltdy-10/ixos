export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-surface-0 flex items-center justify-center">
            {/* Background gradient */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.1)_0%,rgba(10,10,15,0)_50%)] pointer-events-none" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}
