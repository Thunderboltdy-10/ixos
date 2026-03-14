#include "utils/FileOpenPolicy.h"

#include <QMimeDatabase>
#include <QSet>
#include <string>

#ifdef Q_OS_WIN
#include <QDir>
#include <qt_windows.h>
#include <shlwapi.h>
#endif

namespace Ixplorer {

namespace {

const QSet<QString> &externalOnlyExtensions() {
    static const QSet<QString> extensions = {
        // Executables / installers
        QStringLiteral("exe"), QStringLiteral("msi"), QStringLiteral("msix"), QStringLiteral("appx"),
        QStringLiteral("com"), QStringLiteral("scr"), QStringLiteral("dll"), QStringLiteral("ocx"),
        // Shortcuts / links
        QStringLiteral("lnk"), QStringLiteral("url"), QStringLiteral("torrent"),
        // Disk images
        QStringLiteral("iso"), QStringLiteral("dmg"),
        // Game assets
        QStringLiteral("sav"), QStringLiteral("pak"), QStringLiteral("unity"),
        // Scripts (dangerous to host)
        QStringLiteral("hta"),
        // Archives
        QStringLiteral("zip"), QStringLiteral("7z"), QStringLiteral("rar"), QStringLiteral("tar"),
        QStringLiteral("gz"), QStringLiteral("bz2"),
    };
    return extensions;
}

const QSet<QString> &externalOnlyAssociatedApps() {
    static const QSet<QString> executables = {
        // Shell / Terminal
        QStringLiteral("explorer.exe"), QStringLiteral("wt.exe"), QStringLiteral("windowsterminal.exe"),
        QStringLiteral("cmd.exe"), QStringLiteral("powershell.exe"), QStringLiteral("pwsh.exe"),
        QStringLiteral("conhost.exe"),
        // Game launchers
        QStringLiteral("steam.exe"), QStringLiteral("epicgameslauncher.exe"),
        QStringLiteral("riotclientservices.exe"), QStringLiteral("battle.net.exe"), QStringLiteral("upc.exe"),
        // System utilities
        QStringLiteral("openwith.exe"), QStringLiteral("rundll32.exe"),
        QStringLiteral("dllhost.exe"),
    };
    return executables;
}

#ifdef Q_OS_WIN
QString associatedExecutableBaseName(const QString &path) {
    const QString suffix = QFileInfo(path).suffix().trimmed().toLower();
    const QString association = suffix.isEmpty() ? QDir::toNativeSeparators(path) : QStringLiteral(".") + suffix;

    DWORD length = 0;
    AssocQueryStringW(ASSOCF_NONE,
                      ASSOCSTR_EXECUTABLE,
                      reinterpret_cast<LPCWSTR>(association.utf16()),
                      L"open",
                      nullptr,
                      &length);
    if (length == 0) {
        return QString();
    }

    std::wstring buffer;
    buffer.resize(length + 2);
    if (AssocQueryStringW(ASSOCF_NONE,
                          ASSOCSTR_EXECUTABLE,
                          reinterpret_cast<LPCWSTR>(association.utf16()),
                          L"open",
                          buffer.data(),
                          &length) != S_OK) {
        return QString();
    }

    return QFileInfo(QString::fromWCharArray(buffer.c_str())).fileName().toLower();
}
#endif

QString readableTypeLabel(const QFileInfo &info, const QMimeType &mime) {
    if (!mime.comment().isEmpty()) {
        return mime.comment();
    }
    if (!info.suffix().isEmpty()) {
        return info.suffix().toUpper() + QStringLiteral(" file");
    }
    return QStringLiteral("file");
}

FileOpenPolicy makeExternalPolicy(const QString &summary, const QString &detail) {
    FileOpenPolicy policy;
    policy.action = FileOpenAction::External;
    policy.preferredMode = FileOpenHostMode::Fallback;
    policy.confidence = 0.95f;
    policy.summary = summary;
    policy.detail = detail;
    return policy;
}

FileOpenPolicy makeInternalPolicy(
    FileOpenAction action,
    FileOpenHostMode preferredMode,
    float confidence,
    const QString &summary,
    const QString &detail) {
    FileOpenPolicy policy;
    policy.action = action;
    policy.preferredMode = preferredMode;
    policy.confidence = confidence;
    policy.summary = summary;
    policy.detail = detail;
    return policy;
}

} // namespace

namespace {

const QSet<QString> &codeTextExtensions() {
    static const QSet<QString> extensions = {
        // C/C++
        QStringLiteral("c"), QStringLiteral("cpp"), QStringLiteral("cc"), QStringLiteral("cxx"),
        QStringLiteral("h"), QStringLiteral("hpp"), QStringLiteral("hh"),
        // Rust / Go / Swift / Kotlin / Java
        QStringLiteral("rs"), QStringLiteral("go"), QStringLiteral("swift"), QStringLiteral("kt"),
        QStringLiteral("java"), QStringLiteral("scala"),
        // Web
        QStringLiteral("js"), QStringLiteral("jsx"), QStringLiteral("ts"), QStringLiteral("tsx"),
        QStringLiteral("html"), QStringLiteral("htm"), QStringLiteral("css"), QStringLiteral("scss"),
        QStringLiteral("less"), QStringLiteral("vue"), QStringLiteral("svelte"),
        // Scripts
        QStringLiteral("py"), QStringLiteral("rb"), QStringLiteral("php"), QStringLiteral("lua"),
        QStringLiteral("sh"), QStringLiteral("bash"), QStringLiteral("zsh"), QStringLiteral("fish"),
        QStringLiteral("ps1"), QStringLiteral("bat"), QStringLiteral("cmd"),
        // Data / Config
        QStringLiteral("json"), QStringLiteral("yaml"), QStringLiteral("yml"), QStringLiteral("toml"),
        QStringLiteral("xml"), QStringLiteral("csv"), QStringLiteral("ini"), QStringLiteral("cfg"),
        QStringLiteral("env"), QStringLiteral("conf"), QStringLiteral("properties"),
        // Docs / Markup
        QStringLiteral("md"), QStringLiteral("markdown"), QStringLiteral("rst"), QStringLiteral("txt"),
        QStringLiteral("log"), QStringLiteral("diff"), QStringLiteral("patch"),
        // Build
        QStringLiteral("cmake"), QStringLiteral("makefile"), QStringLiteral("mk"),
        QStringLiteral("gradle"), QStringLiteral("bazel"),
        // Other text
        QStringLiteral("sql"), QStringLiteral("graphql"), QStringLiteral("proto"),
        QStringLiteral("r"), QStringLiteral("m"), QStringLiteral("tex"),
    };
    return extensions;
}

const QSet<QString> &imageExtensions() {
    static const QSet<QString> extensions = {
        QStringLiteral("png"), QStringLiteral("jpg"), QStringLiteral("jpeg"),
        QStringLiteral("gif"), QStringLiteral("bmp"), QStringLiteral("tiff"),
        QStringLiteral("tif"), QStringLiteral("webp"), QStringLiteral("ico"),
        QStringLiteral("svg"), QStringLiteral("svgz"),
    };
    return extensions;
}

const QSet<QString> &mediaExtensions() {
    static const QSet<QString> extensions = {
        QStringLiteral("mp4"), QStringLiteral("mkv"), QStringLiteral("avi"),
        QStringLiteral("mov"), QStringLiteral("wmv"), QStringLiteral("flv"),
        QStringLiteral("webm"), QStringLiteral("m4v"),
        QStringLiteral("mp3"), QStringLiteral("flac"), QStringLiteral("aac"),
        QStringLiteral("ogg"), QStringLiteral("wav"), QStringLiteral("m4a"),
        QStringLiteral("wma"), QStringLiteral("opus"),
    };
    return extensions;
}

const QSet<QString> &officeExtensions() {
    static const QSet<QString> extensions = {
        QStringLiteral("docx"), QStringLiteral("doc"),
        QStringLiteral("xlsx"), QStringLiteral("xls"),
        QStringLiteral("pptx"), QStringLiteral("ppt"),
    };
    return extensions;
}

} // anonymous namespace

FileOpenPolicy resolveFileOpenPolicy(const QFileInfo &info) {
    if (!info.exists() || !info.isFile()) {
        return makeExternalPolicy(QStringLiteral("Open externally"),
                                  QStringLiteral("This item is unavailable for hosted opening."));
    }

    const QString extension = info.suffix().trimmed().toLower();
    const QMimeDatabase mimeDatabase;
    const QMimeType mime = mimeDatabase.mimeTypeForFile(info);
    const QString typeLabel = readableTypeLabel(info, mime);

    if (externalOnlyExtensions().contains(extension)) {
        return makeExternalPolicy(QStringLiteral("Open externally"),
                                  QStringLiteral("%1 is safer to open outside the embedded workspace.")
                                      .arg(typeLabel));
    }

    // Native code/text viewer
    if (codeTextExtensions().contains(extension)
        || mime.name().startsWith(QStringLiteral("text/"))
        || mime.inherits(QStringLiteral("text/plain"))) {
        return makeInternalPolicy(FileOpenAction::PreviewInApp,
                                  FileOpenHostMode::CodeViewer,
                                  0.97f,
                                  QStringLiteral("Code viewer"),
                                  QStringLiteral("%1 will open in the built-in code viewer.").arg(typeLabel));
    }

    // Native image viewer
    if (imageExtensions().contains(extension)
        || mime.name().startsWith(QStringLiteral("image/"))) {
        return makeInternalPolicy(FileOpenAction::PreviewInApp,
                                  FileOpenHostMode::ImageViewer,
                                  0.97f,
                                  QStringLiteral("Image viewer"),
                                  QStringLiteral("%1 will open in the built-in image viewer.").arg(typeLabel));
    }

    // Native media player
    if (mediaExtensions().contains(extension)
        || mime.name().startsWith(QStringLiteral("audio/"))
        || mime.name().startsWith(QStringLiteral("video/"))) {
        return makeInternalPolicy(FileOpenAction::PreviewInApp,
                                  FileOpenHostMode::MediaPlayer,
                                  0.97f,
                                  QStringLiteral("Media player"),
                                  QStringLiteral("%1 will open in the built-in media player.").arg(typeLabel));
    }

    // PDF (WebView / Qt PDF module path)
    if (extension == QStringLiteral("pdf")) {
        return makeInternalPolicy(FileOpenAction::PreviewInApp,
                                  FileOpenHostMode::WebView,
                                  0.97f,
                                  QStringLiteral("PDF viewer"),
                                  QStringLiteral("PDF will open in the built-in viewer."));
    }

    // Office COM embed (requires Office installed on Windows)
    if (officeExtensions().contains(extension)) {
        return makeInternalPolicy(FileOpenAction::HostAssociatedApp,
                                  FileOpenHostMode::OfficeEmbed,
                                  0.85f,
                                  QStringLiteral("Office embed"),
                                  QStringLiteral("%1 will open via Office COM embedding.").arg(typeLabel));
    }

#ifdef Q_OS_WIN
    const QString associatedExecutable = associatedExecutableBaseName(info.absoluteFilePath());
    if (!associatedExecutable.isEmpty() && externalOnlyAssociatedApps().contains(associatedExecutable)) {
        return makeExternalPolicy(QStringLiteral("Open externally"),
                                  QStringLiteral("This file type uses a system app that is not embeddable."));
    }
#endif

    // Everything else: try to embed the associated app window
    return makeInternalPolicy(FileOpenAction::HostAssociatedApp,
                              FileOpenHostMode::AssociatedWindow,
                              0.75f,
                              QStringLiteral("Embedded associated app"),
                              QStringLiteral("%1 will open in its associated desktop app inside this pane when possible.")
                                  .arg(typeLabel));
}

bool shouldAutoOpenInWorkspace(const QFileInfo &info) {
    return resolveFileOpenPolicy(info).opensInApp();
}

} // namespace Ixplorer
