#pragma once

#include <QApplication>
#include <QPalette>
#include <QString>

namespace Ixplorer {

class ThemeManager {
public:
    static void apply(QApplication *app);

private:
    static QString loadStylesheet();
    static QPalette buildPalette();
};

} // namespace Ixplorer
