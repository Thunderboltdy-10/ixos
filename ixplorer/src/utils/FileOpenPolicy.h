#pragma once

#include <QFileInfo>
#include <QString>

namespace Ixplorer {

enum class FileOpenAction {
    External,
    PreviewInApp,
    EditorHost,
    HostAssociatedApp,
};

enum class FileOpenHostMode {
    AssociatedWindow,
    WebView,
    MediaPlayer,
    ImageViewer,
    CodeViewer,
    Fallback,
};

struct FileOpenPolicy {
    FileOpenAction action = FileOpenAction::External;
    FileOpenHostMode preferredMode = FileOpenHostMode::Fallback;
    float confidence = 0.0f;
    QString summary;
    QString detail;

    bool opensInApp() const {
        return action == FileOpenAction::HostAssociatedApp ||
               action == FileOpenAction::PreviewInApp ||
               action == FileOpenAction::EditorHost;
    }

    bool usesHostedWindow() const {
        return action == FileOpenAction::HostAssociatedApp;
    }
};

FileOpenPolicy resolveFileOpenPolicy(const QFileInfo &info);
bool shouldAutoOpenInWorkspace(const QFileInfo &info);

} // namespace Ixplorer
