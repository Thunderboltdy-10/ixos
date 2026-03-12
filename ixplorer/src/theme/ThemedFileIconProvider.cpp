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
        return Icons::makeIconFromFont(Icons::Folder, 18, QColor(0xF6, 0xCA, 0x56)); // Yellowish folder
    }
    
    QString ext = info.suffix().toLower();
    
    // Code files
    if (ext == "cpp" || ext == "h" || ext == "cc" || ext == "c" || ext == "cs") {
        return Icons::makeIconFromFont(Icons::Code, 18, QColor(0x3B, 0x86, 0xCB)); // C++ Blue
    }
    if (ext == "py" || ext == "rs" || ext == "go" || ext == "java") {
        return Icons::makeIconFromFont(Icons::Code, 18, QColor(0x56, 0x9A, 0xD6)); // Code Blue
    }
    if (ext == "js" || ext == "json") {
        return Icons::makeIconFromFont(Icons::Code, 18, QColor(0xEB, 0xCB, 0x64)); // JS Yellow
    }
    if (ext == "ts" || ext == "tsx" || ext == "jsx") {
        return Icons::makeIconFromFont(Icons::Code, 18, QColor(0x40, 0xA0, 0xDB)); // TS Blue
    }
    if (ext == "html" || ext == "css" || ext == "scss" || ext == "xml") {
        return Icons::makeIconFromFont(Icons::Code, 18, QColor(0xE3, 0x76, 0x3E)); // Orange/Red
    }
    if (ext == "sh" || ext == "bat" || ext == "cmd" || ext == "ps1") {
        return Icons::makeIconFromFont(Icons::Executable, 18, QColor(0x75, 0xC1, 0x62)); // Script Green
    }
    if (ext == "yaml" || ext == "yml" || ext == "toml" || ext == "ini" || ext == "md" || ext == "txt" || ext == "log" || ext == "csv") {
        return Icons::makeIconFromFont(Icons::Document, 18, QColor(0xA0, 0xA0, 0xA5)); // Gray text
    }

    // Office Docs
    if (ext == "docx" || ext == "doc") {
        return Icons::makeIconFromFont(Icons::Document, 18, QColor(0x2B, 0x57, 0x9A)); // Word Blue
    }
    if (ext == "xlsx" || ext == "xls" || ext == "csv") {
        return Icons::makeIconFromFont(Icons::Document, 18, QColor(0x21, 0x73, 0x46)); // Excel Green
    }
    if (ext == "pptx" || ext == "ppt") {
        return Icons::makeIconFromFont(Icons::Document, 18, QColor(0xD2, 0x47, 0x26)); // PowerPoint Orange
    }

    // Images
    if (ext == "jpg" || ext == "jpeg" || ext == "png" || ext == "gif" || ext == "bmp" || 
        ext == "webp" || ext == "ico" || ext == "svg") {
        return Icons::makeIconFromFont(Icons::Image, 18, QColor(0x68, 0xB7, 0x82)); // Image Green
    }
    // Video
    if (ext == "mp4" || ext == "avi" || ext == "mkv" || ext == "mov" || ext == "wmv" || ext == "webm") {
        return Icons::makeIconFromFont(Icons::Video, 18, QColor(0xAC, 0x7B, 0xE3)); // Video Purple
    }
    // Audio
    if (ext == "mp3" || ext == "wav" || ext == "flac" || ext == "ogg" || ext == "aac") {
        return Icons::makeIconFromFont(Icons::Music, 18, QColor(0xE5, 0x6B, 0x9A)); // Audio Pink
    }
    // Archives
    if (ext == "zip" || ext == "tar" || ext == "gz" || ext == "7z" || ext == "rar") {
        return Icons::makeIconFromFont(Icons::Archive, 18, QColor(0xC9, 0x9E, 0x6A)); // Archive Brown/Gold
    }
    // PDF
    if (ext == "pdf") {
        return Icons::makeIconFromFont(Icons::PDF, 18, QColor(0xE2, 0x5B, 0x5B)); // PDF Red
    }
    // Executables
    if (ext == "exe" || ext == "msi") {
        return Icons::makeIconFromFont(Icons::Executable, 18, QColor(0x8C, 0x99, 0xB2)); // Executable Slate
    }
    
    return QFileIconProvider::icon(info);
}

}
