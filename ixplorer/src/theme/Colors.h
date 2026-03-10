#pragma once

#include <QColor>

namespace Ixplorer::Colors {

// Background tiers (Charcoal Studio)
constexpr auto BgBase        = 0xFF1C1C1E; // Sidebar, toolbar, status bar
constexpr auto BgSurface     = 0xFF2C2C2E; // Main content area
constexpr auto BgElevated    = 0xFF3C3C3E; // Hover states, elevated surfaces
constexpr auto BgActive      = 0xFF4C4C4E; // Pressed states

// Foreground
constexpr auto FgPrimary     = 0xFFF2F2F7; // Primary text
constexpr auto FgSecondary   = 0xFF98989D; // Secondary text
constexpr auto FgMuted       = 0xFF636366; // Muted text

// Borders
constexpr auto BorderHairline = 0xFF3A3A3C;

// Accent
constexpr auto AccentPrimary = 0xFF0A84FF; // Selection, focus

inline QColor qc(uint32_t argb) {
    return QColor((argb >> 16) & 0xFF, (argb >> 8) & 0xFF, argb & 0xFF);
}

} // namespace Ixplorer::Colors
