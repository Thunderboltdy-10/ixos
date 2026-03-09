cmake_minimum_required(VERSION 3.21)
project(Ixplorer VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets)

set(SOURCES
    src/main.cpp
    src/app/Application.cpp
    src/app/MainWindow.cpp
    src/search/IxosCliSearchProvider.cpp
    src/widgets/ExplorerToolbar.cpp
    src/widgets/BreadcrumbBar.cpp
    src/widgets/AppSidebar.cpp
    src/widgets/SidebarSection.cpp
    src/widgets/TabWorkspace.cpp
    src/widgets/ExplorerPane.cpp
    src/widgets/IxosRail.cpp
    src/widgets/StatusStrip.cpp
    src/models/FileSystemProxyModel.cpp
    src/theme/ThemeManager.cpp
    src/utils/FileOperations.cpp
)

set(HEADERS
    src/app/Application.h
    src/app/MainWindow.h
    src/search/SearchTypes.h
    src/search/IxosCliSearchProvider.h
    src/widgets/ExplorerToolbar.h
    src/widgets/BreadcrumbBar.h
    src/widgets/AppSidebar.h
    src/widgets/SidebarSection.h
    src/widgets/TabWorkspace.h
    src/widgets/ExplorerPane.h
    src/widgets/IxosRail.h
    src/widgets/StatusStrip.h
    src/models/FileSystemProxyModel.h
    src/theme/ThemeManager.h
    src/theme/Colors.h
    src/interfaces/ISearchProvider.h
    src/interfaces/IIpcBridge.h
    src/interfaces/ICommandRegistry.h
    src/utils/FileOperations.h
)

qt_add_resources(RESOURCES resources/ixplorer.qrc)

add_executable(Ixplorer WIN32
    ${SOURCES}
    ${HEADERS}
    ${RESOURCES}
    resources/ixplorer.rc
)

target_include_directories(Ixplorer PRIVATE src)
target_link_libraries(Ixplorer PRIVATE Qt6::Widgets)

find_program(WINDEPLOYQT windeployqt HINTS "${Qt6_DIR}/../../../bin")
if(WINDEPLOYQT AND WIN32)
    add_custom_command(TARGET Ixplorer POST_BUILD
        COMMAND "${WINDEPLOYQT}" --no-translations --no-opengl-sw "$<TARGET_FILE:Ixplorer>"
        COMMENT "Running windeployqt..."
    )
endif()
