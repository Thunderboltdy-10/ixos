#pragma once

#include <QApplication>

namespace Ixplorer {

class Application : public QApplication {
    Q_OBJECT
public:
    Application(int &argc, char **argv);
};

} // namespace Ixplorer
