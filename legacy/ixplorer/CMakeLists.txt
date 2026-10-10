cmake_minimum_required(VERSION 3.21)
project(Ixplorer VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets)
find_package(Qt6 OPTIONAL_COMPONENTS WebEngineWidgets Multimedia MultimediaWidgets Pdf PdfWidgets AxContainer)

set(SOURCES
    src/main.cpp
    src/app/Application.cpp
    src/app/MainWindow.cpp
    src/search/IxosCliSearchProvider.cpp
    src/data/ActivityTracker.cpp
    src/data/SessionState.cpp
    src/data/PersonalRanker.cpp
    src/data/WorkstreamManager.cpp
    src/data/ResumptionEngine.cpp
    src/data/InterruptionDetector.cpp
    src/data/BundlePredictor.cpp
    src/data/Orchestrator.cpp
    src/data/CommandTelemetry.cpp
    src/data/TodaySection.cpp
    src/data/RelationshipView.cpp
    src/widgets/ExplorerToolbar.cpp
    src/widgets/BreadcrumbBar.cpp
    src/widgets/AppSidebar.cpp
    src/widgets/FileListDelegate.cpp
    src/widgets/AnimationHelper.cpp
    src/widgets/CommandPalette.cpp
    src/widgets/DocumentPane.cpp
    src/widgets/CodeViewerWidget.cpp
    src/widgets/ToastNotification.cpp
    src/widgets/SidebarSection.cpp
    src/widgets/TabWorkspace.cpp
    src/widgets/ExplorerPane.cpp
    src/widgets/HomeDashboardPane.cpp
    src/widgets/IxosRail.cpp
    src/widgets/SearchResultCard.cpp
    src/widgets/ActivityIndicator.cpp
    src/widgets/StatusStrip.cpp
    src/models/FileSystemProxyModel.cpp
    src/theme/ThemeManager.cpp
    src/theme/IconFont.cpp
    src/theme/ThemedFileIconProvider.cpp
    src/theme/HoverAnimationFilter.cpp
    src/utils/FileOperations.cpp
    src/utils/FileOpenPolicy.cpp
    src/utils/FuzzyMatch.cpp
)

set(HEADERS
    src/app/Application.h
    src/app/MainWindow.h
    src/search/SearchTypes.h
    src/search/IxosCliSearchProvider.h
    src/data/ActivityTracker.h
    src/data/SessionState.h
    src/data/PersonalRanker.h
    src/data/WorkstreamManager.h
    src/data/ResumptionEngine.h
    src/data/InterruptionDetector.h
    src/data/BundlePredictor.h
    src/data/Orchestrator.h
    src/data/CommandTelemetry.h
    src/data/TodaySection.h
    src/data/RelationshipView.h
    src/widgets/ExplorerToolbar.h
    src/widgets/BreadcrumbBar.h
    src/widgets/AppSidebar.h
    src/widgets/FileListDelegate.h
    src/widgets/AnimationHelper.h
    src/widgets/CommandPalette.h
    src/widgets/DocumentPane.h
    src/widgets/CodeViewerWidget.h
    src/widgets/ToastNotification.h
    src/widgets/SidebarSection.h
    src/widgets/TabWorkspace.h
    src/widgets/ExplorerPane.h
    src/widgets/HomeDashboardPane.h
    src/widgets/IxosRail.h
    src/widgets/SearchResultCard.h
    src/widgets/ActivityIndicator.h
    src/widgets/StatusStrip.h
    src/models/FileSystemProxyModel.h
    src/theme/ThemeManager.h
    src/theme/Colors.h
    src/theme/IconFont.h
    src/theme/ThemedFileIconProvider.h
    src/theme/HoverAnimationFilter.h
    src/interfaces/ISearchProvider.h
    src/interfaces/IIpcBridge.h
    src/interfaces/ICommandRegistry.h
    src/utils/FileOperations.h
    src/utils/FileOpenPolicy.h
    src/utils/FuzzyMatch.h
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

if(TARGET Qt6::WebEngineWidgets)
    target_link_libraries(Ixplorer PRIVATE Qt6::WebEngineWidgets)
    target_compile_definitions(Ixplorer PRIVATE QT_WEBENGINEWIDGETS_LIB)
endif()

if(TARGET Qt6::Multimedia)
    target_link_libraries(Ixplorer PRIVATE Qt6::Multimedia Qt6::MultimediaWidgets)
    target_compile_definitions(Ixplorer PRIVATE QT_MULTIMEDIA_LIB)
endif()

if(TARGET Qt6::Pdf AND TARGET Qt6::PdfWidgets)
    target_link_libraries(Ixplorer PRIVATE Qt6::Pdf Qt6::PdfWidgets)
    target_compile_definitions(Ixplorer PRIVATE QT_PDF_LIB)
endif()

if(WIN32)
    target_link_libraries(Ixplorer PRIVATE shell32 shlwapi)
endif()

if(TARGET Qt6::AxContainer)
    target_link_libraries(Ixplorer PRIVATE Qt6::AxContainer)
    target_compile_definitions(Ixplorer PRIVATE QT_AXCONTAINER_LIB)
endif()

find_program(WINDEPLOYQT windeployqt HINTS "${Qt6_DIR}/../../../bin")
if(WINDEPLOYQT AND WIN32)
    add_custom_command(TARGET Ixplorer POST_BUILD
        COMMAND "${WINDEPLOYQT}" --no-translations --no-opengl-sw "$<TARGET_FILE:Ixplorer>"
        COMMENT "Running windeployqt..."
    )
endif()
