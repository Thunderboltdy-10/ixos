#pragma once

#include <QColor>
#include <cstdint>

namespace Ixplorer::Colors {

// Background tiers
constexpr auto BgDeep        = 0xFF121214; // deepest, behind sidebar
constexpr auto BgBase        = 0xFF1C1C1E; // sidebar, toolbar
constexpr auto BgSurface     = 0xFF242426; // main content — slightly darker than current #2C2C2E
constexpr auto BgElevated    = 0xFF2C2C2E; // cards, elevated surfaces
constexpr auto BgOverlay     = 0xFF3A3A3C; // hover states
constexpr auto BgActive      = 0xFF4A4A4E; // pressed

// Foreground
constexpr auto FgPrimary     = 0xFFF2F2F7; // keep
constexpr auto FgSecondary   = 0xFFA1A1A6; // slightly brighter than current #98989D
constexpr auto FgMuted       = 0xFF636366; // keep
constexpr auto FgGhost       = 0xFF48484A; // decorative/disabled

// Borders
constexpr auto BorderSubtle  = 0xFF2A2A2C; // barely visible
constexpr auto BorderDefault = 0xFF3A3A3C; // standard
constexpr auto BorderHover   = 0xFF4C4C4E; // emphasis

// Accents
constexpr auto AccentPrimary = 0xFF0A84FF; // keep — blue
constexpr auto AccentAmber   = 0xFFE8A317; // from Ixos desktop app
constexpr auto AccentAmberDim= 0xFFB8820F;
constexpr auto AccentAmberBg = 0xFF2D2517; // dark amber tint

// Semantic
constexpr auto SemanticGreen = 0xFF34C759;
constexpr auto SemanticRed   = 0xFFFF453A;
constexpr auto SemanticYellow= 0xFFFFD60A;

inline QColor qc(uint32_t argb) {
    return QColor((argb >> 16) & 0xFF, (argb >> 8) & 0xFF, argb & 0xFF, (argb >> 24) & 0xFF);
}

} // namespace Ixplorer::Colors
