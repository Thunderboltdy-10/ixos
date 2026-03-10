#pragma once

#include <QFileInfo>
#include <QString>

namespace Ixplorer {

enum class FileOpenAction {
    External,
    HostAssociatedApp,
};

struct FileOpenPolicy {
    FileOpenAction action = FileOpenAction::External;
    QString summary;
    QString detail;

    bool opensInApp() const {
        return action == FileOpenAction::HostAssociatedApp;
    }
};

FileOpenPolicy resolveFileOpenPolicy(const QFileInfo &info);
bool shouldAutoOpenInWorkspace(const QFileInfo &info);

} // namespace Ixplorer
