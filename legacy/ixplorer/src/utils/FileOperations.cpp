#include "utils/FileOperations.h"

#include <QDesktopServices>
#include <QDir>
#include <QFile>
#include <QProcess>
#include <QUrl>

namespace Ixplorer::FileOperations {

namespace {

QString addSuffixToName(const QFileInfo &info, const QString &suffix) {
    if (info.isDir()) {
        return info.fileName() + suffix;
    }

    const QString extension = info.completeSuffix();
    const QString baseName = info.completeBaseName();
    if (extension.isEmpty()) {
        return baseName + suffix;
    }
    return baseName + suffix + QStringLiteral(".") + extension;
}

bool copyFile(const QString &sourcePath, const QString &destinationPath, QString *errorMessage) {
    QFile destinationFile(destinationPath);
    destinationFile.remove();
    if (!QFile::copy(sourcePath, destinationPath)) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("Could not copy %1 to %2.")
                                .arg(QDir::toNativeSeparators(sourcePath),
                                     QDir::toNativeSeparators(destinationPath));
        }
        return false;
    }
    return true;
}

} // namespace

QString uniquePathForName(const QString &directoryPath, const QString &desiredName) {
    QDir directory(directoryPath);
    QString candidateName = desiredName;
    QString candidatePath = directory.filePath(candidateName);
    if (!QFileInfo::exists(candidatePath)) {
        return candidatePath;
    }

    QFileInfo desiredInfo(candidateName);
    const bool hasExtension = !desiredInfo.completeSuffix().isEmpty();
    const QString baseName = hasExtension ? desiredInfo.completeBaseName() : desiredInfo.fileName();
    const QString extension = hasExtension ? QStringLiteral(".") + desiredInfo.completeSuffix() : QString();

    int counter = 2;
    while (true) {
        candidateName = QStringLiteral("%1 (%2)%3").arg(baseName).arg(counter).arg(extension);
        candidatePath = directory.filePath(candidateName);
        if (!QFileInfo::exists(candidatePath)) {
            return candidatePath;
        }
        ++counter;
    }
}

QString duplicateTargetPath(const QFileInfo &sourceInfo) {
    const QString duplicateName = addSuffixToName(sourceInfo, QStringLiteral(" - Copy"));
    return uniquePathForName(sourceInfo.absolutePath(), duplicateName);
}

bool copyRecursively(const QString &sourcePath, const QString &destinationPath, QString *errorMessage) {
    const QFileInfo sourceInfo(sourcePath);
    if (!sourceInfo.exists()) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("Source path does not exist: %1")
                                .arg(QDir::toNativeSeparators(sourcePath));
        }
        return false;
    }

    if (sourceInfo.isDir()) {
        QDir destinationDir(destinationPath);
        if (!destinationDir.exists() && !QDir().mkpath(destinationPath)) {
            if (errorMessage) {
                *errorMessage = QStringLiteral("Could not create %1")
                                    .arg(QDir::toNativeSeparators(destinationPath));
            }
            return false;
        }

        QDir sourceDir(sourcePath);
        const QFileInfoList entries = sourceDir.entryInfoList(QDir::NoDotAndDotDot |
                                                              QDir::AllEntries |
                                                              QDir::Hidden |
                                                              QDir::System);
        for (const QFileInfo &entry : entries) {
            const QString childDestination = QDir(destinationPath).filePath(entry.fileName());
            if (!copyRecursively(entry.absoluteFilePath(), childDestination, errorMessage)) {
                return false;
            }
        }
        return true;
    }

    QDir parentDir = QFileInfo(destinationPath).dir();
    if (!parentDir.exists() && !QDir().mkpath(parentDir.absolutePath())) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("Could not create %1")
                                .arg(QDir::toNativeSeparators(parentDir.absolutePath()));
        }
        return false;
    }

    return copyFile(sourcePath, destinationPath, errorMessage);
}

bool moveRecursively(const QString &sourcePath, const QString &destinationPath, QString *errorMessage) {
    QFileInfo sourceInfo(sourcePath);
    if (!sourceInfo.exists()) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("Source path does not exist: %1")
                                .arg(QDir::toNativeSeparators(sourcePath));
        }
        return false;
    }

    QDir parentDir = QFileInfo(destinationPath).dir();
    if (!parentDir.exists() && !QDir().mkpath(parentDir.absolutePath())) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("Could not create %1")
                                .arg(QDir::toNativeSeparators(parentDir.absolutePath()));
        }
        return false;
    }

    if (QDir().rename(sourcePath, destinationPath)) {
        return true;
    }

    if (!copyRecursively(sourcePath, destinationPath, errorMessage)) {
        return false;
    }

    return removeRecursively(sourcePath, errorMessage);
}

bool removeRecursively(const QString &path, QString *errorMessage) {
    QFileInfo info(path);
    if (!info.exists()) {
        return true;
    }

    const bool ok = info.isDir() ? QDir(path).removeRecursively() : QFile::remove(path);
    if (!ok && errorMessage) {
        *errorMessage = QStringLiteral("Could not remove %1").arg(QDir::toNativeSeparators(path));
    }
    return ok;
}

bool revealInSystemExplorer(const QString &path) {
#ifdef Q_OS_WIN
    QFileInfo info(path);
    const QString nativePath = QDir::toNativeSeparators(info.absoluteFilePath());
    QStringList arguments;
    if (info.isDir()) {
        arguments << nativePath;
    } else {
        arguments << QStringLiteral("/select,") + nativePath;
    }
    return QProcess::startDetached(QStringLiteral("explorer.exe"), arguments);
#else
    QFileInfo info(path);
    const QString target = info.isDir() ? info.absoluteFilePath() : info.absolutePath();
    return QDesktopServices::openUrl(QUrl::fromLocalFile(target));
#endif
}

bool openWithDialog(const QString &path) {
#ifdef Q_OS_WIN
    return QProcess::startDetached(QStringLiteral("rundll32.exe"),
                                   {QStringLiteral("shell32.dll,OpenAs_RunDLL"),
                                    QDir::toNativeSeparators(path)});
#else
    Q_UNUSED(path);
    return false;
#endif
}

QString copyOperationSummary(const QStringList &paths) {
    if (paths.isEmpty()) {
        return QString();
    }

    if (paths.size() == 1) {
        return QFileInfo(paths.first()).fileName();
    }

    return QStringLiteral("%1 items").arg(paths.size());
}

} // namespace Ixplorer::FileOperations
