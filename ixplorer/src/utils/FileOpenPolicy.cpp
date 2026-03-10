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
        QStringLiteral("exe"), QStringLiteral("msi"), QStringLiteral("msix"), QStringLiteral("appx"),
        QStringLiteral("com"), QStringLiteral("scr"), QStringLiteral("dll"), QStringLiteral("ocx"),
        QStringLiteral("lnk"), QStringLiteral("url"), QStringLiteral("torrent"), QStringLiteral("iso"),
        QStringLiteral("dmg"), QStringLiteral("sav"), QStringLiteral("pak"), QStringLiteral("unity"),
        QStringLiteral("bat"), QStringLiteral("cmd"), QStringLiteral("ps1"), QStringLiteral("hta"),
    };
    return extensions;
}

const QSet<QString> &externalOnlyAssociatedApps() {
    static const QSet<QString> executables = {
        QStringLiteral("chrome.exe"),          QStringLiteral("msedge.exe"),        QStringLiteral("firefox.exe"),
        QStringLiteral("iexplore.exe"),        QStringLiteral("brave.exe"),         QStringLiteral("opera.exe"),
        QStringLiteral("explorer.exe"),        QStringLiteral("wt.exe"),            QStringLiteral("windowsterminal.exe"),
        QStringLiteral("cmd.exe"),             QStringLiteral("powershell.exe"),    QStringLiteral("pwsh.exe"),
        QStringLiteral("conhost.exe"),         QStringLiteral("steam.exe"),         QStringLiteral("epicgameslauncher.exe"),
        QStringLiteral("riotclientservices.exe"), QStringLiteral("battle.net.exe"), QStringLiteral("upc.exe"),
        QStringLiteral("applicationframehost.exe"), QStringLiteral("openwith.exe"), QStringLiteral("rundll32.exe"),
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

    if (externalOnlyExtensions().contains(extension)) {
        return makeExternalPolicy(QStringLiteral("Open externally"),
                                  QStringLiteral("%1 stays external because it is app-like or unsafe to host.")
                                      .arg(typeLabel));
    }

#ifdef Q_OS_WIN
    const QString associatedExecutable = associatedExecutableBaseName(info.absoluteFilePath());
    if (externalOnlyAssociatedApps().contains(associatedExecutable)) {
        return makeExternalPolicy(QStringLiteral("Open externally"),
                                  QStringLiteral("%1 stays external because its default app is not a good embedded host.")
                                      .arg(typeLabel));
    }
#endif

    FileOpenPolicy policy;
    policy.action = FileOpenAction::HostAssociatedApp;
    policy.summary = QStringLiteral("Host associated app");
    policy.detail = QStringLiteral("%1 will be opened with its Windows-associated app inside the workspace.")
        .arg(typeLabel);
    return policy;
}

bool shouldAutoOpenInWorkspace(const QFileInfo &info) {
    return resolveFileOpenPolicy(info).opensInApp();
}

} // namespace Ixplorer
