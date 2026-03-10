#include "IconFont.h"
#include <QFontDatabase>
#include <QStringList>

namespace Ixplorer::Icons {

QFont iconFont(int pixelSize) {
    static QString resolvedFamily;
    
    if (resolvedFamily.isEmpty()) {
        QStringList families = QFontDatabase::families();
        if (families.contains("Segoe Fluent Icons")) {
            resolvedFamily = "Segoe Fluent Icons";
        } else if (families.contains("Segoe MDL2 Assets")) {
            resolvedFamily = "Segoe MDL2 Assets";
        } else {
            // Fallback font
            resolvedFamily = "Segoe UI Symbol";
        }
    }
    
    QFont font(resolvedFamily);
    font.setPixelSize(pixelSize);
    return font;
}

} // namespace Ixplorer::Icons
