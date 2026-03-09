#include "app/Application.h"
#include "theme/ThemeManager.h"

namespace Ixplorer {

Application::Application(int &argc, char **argv)
    : QApplication(argc, argv) {
    setApplicationName("Ixplorer");
    setApplicationVersion("0.1.0");
    setOrganizationName("Ixos");

    ThemeManager::apply(this);
}

} // namespace Ixplorer
