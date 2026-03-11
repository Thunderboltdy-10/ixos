#include "IconFont.h"
#include <QFontDatabase>
#include <QStringList>
#include <QPixmap>
#include <QPainter>

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

QIcon makeIconFromFont(QChar codepoint, int size) {
    return makeIconFromFont(codepoint, size, QColor("#EAEAEA"));
}

QIcon makeIconFromFont(QChar codepoint, int size, QColor color) {
    QPixmap pixmap(size, size);
    pixmap.fill(Qt::transparent);
    
    QPainter painter(&pixmap);
    painter.setRenderHint(QPainter::Antialiasing);
    painter.setRenderHint(QPainter::TextAntialiasing);
    
    QFont font = iconFont(size);
    painter.setFont(font);
    painter.setPen(color);
    
    painter.drawText(pixmap.rect(), Qt::AlignCenter, QString(codepoint));
    return QIcon(pixmap);
}

QIcon makeIconFromFont(QChar codepoint, int size, QColor normalColor, QColor disabledColor) {
    QIcon icon;
    
    QPixmap normalPixmap(size, size);
    normalPixmap.fill(Qt::transparent);
    QPainter normalPainter(&normalPixmap);
    normalPainter.setRenderHint(QPainter::Antialiasing);
    normalPainter.setRenderHint(QPainter::TextAntialiasing);
    normalPainter.setFont(iconFont(size));
    normalPainter.setPen(normalColor);
    normalPainter.drawText(normalPixmap.rect(), Qt::AlignCenter, QString(codepoint));
    icon.addPixmap(normalPixmap, QIcon::Normal);
    
    QPixmap disabledPixmap(size, size);
    disabledPixmap.fill(Qt::transparent);
    QPainter disabledPainter(&disabledPixmap);
    disabledPainter.setRenderHint(QPainter::Antialiasing);
    disabledPainter.setRenderHint(QPainter::TextAntialiasing);
    disabledPainter.setFont(iconFont(size));
    disabledPainter.setPen(disabledColor);
    disabledPainter.drawText(disabledPixmap.rect(), Qt::AlignCenter, QString(codepoint));
    icon.addPixmap(disabledPixmap, QIcon::Disabled);
    
    return icon;
}

} // namespace Ixplorer::Icons
