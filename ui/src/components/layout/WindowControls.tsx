import { Settings, Minus, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAuth } from '@clerk/clerk-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

// Safe Tauri window import - falls back to no-op in browser
const getTauriWindow = async () => {
    try {
        return getCurrentWindow();
    } catch {
        console.log('Tauri window API not available (browser mode)');
        return {
            minimize: async () => { },
            toggleMaximize: async () => { },
            hide: async () => { },
        };
    }
};

interface WindowControlProps {
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
}

function WindowControl({ icon, onClick, variant = 'default' }: WindowControlProps) {
    return (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md",
                "transition-colors duration-150 cursor-pointer select-none",
                variant === 'default'
                    ? "text-fg-muted hover:text-porcelain hover:bg-graphite-2"
                    : "text-fg-muted hover:text-white hover:bg-error"
            )}
        >
            {icon}
        </button>
    );
}



export function WindowControls() {
    const { isSignedIn } = useAuth();
    const { transferRequired } = useAuthStore();
    const openSettings = useUIStore(state => state.openSettings);

    const showSettings = isSignedIn && !transferRequired;


    const handleMinimize = async () => {
        try {
            const window = await getTauriWindow();
            await window.minimize();
        } catch (err) {
            console.error('Failed to minimize:', err);
        }
    };

    const handleMaximize = async () => {
        try {
            const window = await getTauriWindow();
            await window.toggleMaximize();
        } catch (err) {
            console.error('Failed to maximize:', err);
        }
    };

    const handleClose = async () => {
        try {
            const window = await getTauriWindow();
            await window.hide();
        } catch (err) {
            console.error('Failed to close:', err);
        }
    };

    return (
        <>
            {/* Invisible drag region - covers top of window */}
            <div
                data-tauri-drag-region
                className="fixed top-0 left-0 right-0 h-10 z-[9998] pointer-events-auto"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            />

            {/* Window controls - absolute top-right, Z-index high to sit above everything */}
            <div className="fixed top-2 right-3 flex items-center gap-0.5 z-[9999]">
                {showSettings && (
                    <>
                        <WindowControl
                            icon={<Settings className="w-3.5 h-3.5" />}
                            onClick={() => openSettings('search')}
                        />
                        <div className="w-px h-4 bg-stroke-hairline mx-1" />
                    </>
                )}

                <WindowControl icon={<Minus className="w-3.5 h-3.5" />} onClick={handleMinimize} />
                <WindowControl icon={<Square className="w-3 h-3" />} onClick={handleMaximize} />
                <WindowControl icon={<X className="w-3.5 h-3.5" />} onClick={handleClose} variant="danger" />
            </div>
        </>
    );
}
