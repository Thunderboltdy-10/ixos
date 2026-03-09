#include "app/Application.h"
#include "app/MainWindow.h"

int main(int argc, char *argv[]) {
    Ixplorer::Application app(argc, argv);
    Ixplorer::MainWindow window;
    window.show();
    return app.exec();
}
