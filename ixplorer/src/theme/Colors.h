#pragma once

#include <QColor>

namespace Ixplorer::Colors {

// Background tiers
constexpr auto BgGraphite0   = 0xFF15171B; // Sidebar, toolbar, status bar
constexpr auto BgGraphite1   = 0xFF1B1E23; // Main content area
constexpr auto BgGraphite2   = 0xFF23272E; // Hover states, elevated surfaces
constexpr auto BgGraphite3   = 0xFF2D323B; // Splitter hover, scrollbar thumb

// Foreground
constexpr auto FgPrimary     = 0xFFF3F5F7; // Primary text
constexpr auto FgSecondary   = 0xFFB8BCC2; // Secondary text
constexpr auto FgMuted       = 0xFF7A7F87; // Column headers, status text

// Borders
constexpr auto BorderHairline = 0xFF1E2026;

// Accent
constexpr auto AccentTeal    = 0xFF14B8A6; // Active tab, selection accent, focus
constexpr auto SelectionBg   = 0xFF1A3A35; // Selected row background

inline QColor qc(uint32_t argb) {
    return QColor((argb >> 16) & 0xFF, (argb >> 8) & 0xFF, argb & 0xFF);
}

} // namespace Ixplorer::Colors
