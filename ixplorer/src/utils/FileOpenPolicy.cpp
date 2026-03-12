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
        // Browsers
        QStringLiteral("chrome.exe"),          QStringLiteral("msedge.exe"),        QStringLiteral("firefox.exe"),
        QStringLiteral("iexplore.exe"),        QStringLiteral("brave.exe"),         QStringLiteral("opera.exe"),
        // Shell / Terminal
        QStringLiteral("explorer.exe"),        QStringLiteral("wt.exe"),            QStringLiteral("windowsterminal.exe"),
        QStringLiteral("cmd.exe"),             QStringLiteral("powershell.exe"),    QStringLiteral("pwsh.exe"),
        QStringLiteral("conhost.exe"),
        // Game launchers
        QStringLiteral("steam.exe"),           QStringLiteral("epicgameslauncher.exe"),
        QStringLiteral("riotclientservices.exe"), QStringLiteral("battle.net.exe"), QStringLiteral("upc.exe"),
        // System utilities
        QStringLiteral("applicationframehost.exe"), QStringLiteral("openwith.exe"), QStringLiteral("rundll32.exe"),
        QStringLiteral("dllhost.exe"),
    };
    return executables;
}

const QSet<QString> &codeExtensions() {
    static const QSet<QString> extensions = {
        QStringLiteral("c"),    QStringLiteral("cc"),   QStringLiteral("cpp"),  QStringLiteral("cxx"),
        QStringLiteral("h"),    QStringLiteral("hpp"),  QStringLiteral("hh"),   QStringLiteral("rs"),
        QStringLiteral("py"),   QStringLiteral("js"),   QStringLiteral("jsx"),  QStringLiteral("ts"),
        QStringLiteral("tsx"),  QStringLiteral("json"), QStringLiteral("toml"), QStringLiteral("yaml"),
        QStringLiteral("yml"),  QStringLiteral("md"),   QStringLiteral("txt"),  QStringLiteral("log"),
        QStringLiteral("ini"),  QStringLiteral("cfg"),  QStringLiteral("cmake"),QStringLiteral("java"),
        QStringLiteral("go"),   QStringLiteral("swift"),QStringLiteral("kt"),   QStringLiteral("css"),
        QStringLiteral("scss"), QStringLiteral("xml"),  QStringLiteral("sql"),  QStringLiteral("sh"),
        QStringLiteral("r"),    QStringLiteral("rb"),   QStringLiteral("lua"),  QStringLiteral("zig"),
        QStringLiteral("dart"), QStringLiteral("vue"),  QStringLiteral("svelte"),
    };
    return extensions;
}

const QSet<QString> &imageExtensions() {
    static const QSet<QString> extensions = {
        QStringLiteral("png"), QStringLiteral("jpg"),  QStringLiteral("jpeg"),
        QStringLiteral("gif"), QStringLiteral("bmp"), QStringLiteral("webp"),
        QStringLiteral("ico"), QStringLiteral("svg"),
    };
    return extensions;
}

const QSet<QString> &webExtensions() {
    static const QSet<QString> extensions = {
        QStringLiteral("pdf"),
        QStringLiteral("htm"),
        QStringLiteral("html"),
    };
    return extensions;
}

const QSet<QString> &mediaExtensions() {
    static const QSet<QString> extensions = {
        QStringLiteral("mp3"), QStringLiteral("wav"), QStringLiteral("m4a"),
        QStringLiteral("mp4"), QStringLiteral("mkv"), QStringLiteral("mov"),
        QStringLiteral("avi"), QStringLiteral("webm"),
    };
    return extensions;
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

FileOpenPolicy resolveFileOpenPolicy(const QFileInfo &info) {
    if (!info.exists() || !info.isFile()) {
        return makeExternalPolicy(QStringLiteral("Open externally"),
                                  QStringLiteral("This item is unavailable for hosted opening."));
    }

    const QString extension = info.suffix().trimmed().toLower();
    const QMimeDatabase mimeDatabase;
    const QMimeType mime = mimeDatabase.mimeTypeForFile(info);
    const QString typeLabel = readableTypeLabel(info, mime);

    // Completely bypass all constraints and force embedding for EVERYTHING per the user's explicit request.
    return makeInternalPolicy(
        FileOpenAction::HostAssociatedApp,
        FileOpenHostMode::AssociatedWindow,
        1.0f,
        QStringLiteral("Host associated app"),
        QStringLiteral("%1 will be opened with its Windows-associated app inside the workspace.")
            .arg(typeLabel));
}

bool shouldAutoOpenInWorkspace(const QFileInfo &info) {
    return resolveFileOpenPolicy(info).opensInApp();
}

} // namespace Ixplorer
