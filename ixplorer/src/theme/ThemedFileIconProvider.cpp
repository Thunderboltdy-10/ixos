#include "ThemedFileIconProvider.h"
#include "IconFont.h"
#include "Colors.h"
#include <QFileInfo>
#include <QIcon>
#include <QString>

namespace Ixplorer {

ThemedFileIconProvider::ThemedFileIconProvider() = default;

QIcon ThemedFileIconProvider::icon(IconType type) const {
    if (type == Folder) {
        return Icons::makeIconFromFont(Icons::Folder, 18, Colors::qc(Colors::AccentAmber));
    } else if (type == File) {
        return Icons::makeIconFromFont(Icons::Code, 18, Colors::qc(Colors::FgMuted)); // Generic file fallback
    }
    return QFileIconProvider::icon(type);
}

QIcon ThemedFileIconProvider::icon(const QFileInfo &info) const {
    if (info.isDir()) {
        return Icons::makeIconFromFont(Icons::Folder, 18, Colors::qc(Colors::AccentAmber));
    }
    
    QString ext = info.suffix().toLower();
    QColor fileColor = Colors::qc(Colors::FgSecondary);
    
    // Code files
    if (ext == "cpp" || ext == "h" || ext == "py" || ext == "rs" || ext == "js" || ext == "ts" || 
        ext == "java" || ext == "go" || ext == "json" || ext == "xml" || ext == "yaml" || 
        ext == "toml" || ext == "sh" || ext == "txt" || ext == "md" || ext == "log" || ext == "csv") {
        return Icons::makeIconFromFont(Icons::Code, 18, fileColor);
    }
    // Images
    if (ext == "jpg" || ext == "jpeg" || ext == "png" || ext == "gif" || ext == "bmp" || 
        ext == "webp" || ext == "ico" || ext == "svg") {
        return Icons::makeIconFromFont(Icons::Image, 18, fileColor);
    }
    // Video
    if (ext == "mp4" || ext == "avi" || ext == "mkv" || ext == "mov" || ext == "wmv" || ext == "webm") {
        return Icons::makeIconFromFont(Icons::Video, 18, fileColor);
    }
    // Audio
    if (ext == "mp3" || ext == "wav" || ext == "flac" || ext == "ogg" || ext == "aac") {
        return Icons::makeIconFromFont(Icons::Music, 18, fileColor);
    }
    // Archives
    if (ext == "zip" || ext == "tar" || ext == "gz" || ext == "7z" || ext == "rar") {
        return Icons::makeIconFromFont(Icons::Archive, 18, fileColor);
    }
    // PDF
    if (ext == "pdf") {
        return Icons::makeIconFromFont(Icons::PDF, 18, fileColor);
    }
    // Executables
    if (ext == "exe" || ext == "bat" || ext == "cmd" || ext == "ps1" || ext == "msi") {
        return Icons::makeIconFromFont(Icons::Executable, 18, fileColor);
    }
    
    return QFileIconProvider::icon(info);
}

}
