#include "theme/ThemeManager.h"
#include "theme/Colors.h"

#include <QFile>
#include <QTextStream>

namespace Ixplorer {

void ThemeManager::apply(QApplication *app) {
    app->setStyle("Fusion");
    app->setPalette(buildPalette());
    app->setStyleSheet(loadStylesheet());
}

QString ThemeManager::loadStylesheet() {
    QFile file(":/styles/ixplorer_dark.qss");
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text))
        return {};
    QTextStream stream(&file);
    return stream.readAll();
}

QPalette ThemeManager::buildPalette() {
    using namespace Colors;
    QPalette p;

    p.setColor(QPalette::Window,          qc(BgGraphite1));
    p.setColor(QPalette::WindowText,      qc(FgPrimary));
    p.setColor(QPalette::Base,            qc(BgGraphite1));
    p.setColor(QPalette::AlternateBase,   qc(BgGraphite2));
    p.setColor(QPalette::Text,            qc(FgPrimary));
    p.setColor(QPalette::Button,          qc(BgGraphite0));
    p.setColor(QPalette::ButtonText,      qc(FgPrimary));
    p.setColor(QPalette::Highlight,       qc(AccentTeal));
    p.setColor(QPalette::HighlightedText, qc(FgPrimary));
    p.setColor(QPalette::ToolTipBase,     qc(BgGraphite2));
    p.setColor(QPalette::ToolTipText,     qc(FgPrimary));
    p.setColor(QPalette::PlaceholderText, qc(FgMuted));
    p.setColor(QPalette::Mid,             qc(BorderHairline));
    p.setColor(QPalette::Dark,            qc(BgGraphite0));
    p.setColor(QPalette::Shadow,          QColor(0, 0, 0));

    // Disabled
    p.setColor(QPalette::Disabled, QPalette::WindowText, qc(FgMuted));
    p.setColor(QPalette::Disabled, QPalette::Text,       qc(FgMuted));
    p.setColor(QPalette::Disabled, QPalette::ButtonText, qc(FgMuted));

    return p;
}

} // namespace Ixplorer
