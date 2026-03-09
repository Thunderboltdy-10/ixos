#pragma once

#include <QFileInfo>
#include <QString>
#include <QStringList>

namespace Ixplorer::FileOperations {

QString uniquePathForName(const QString &directoryPath, const QString &desiredName);
QString duplicateTargetPath(const QFileInfo &sourceInfo);
bool copyRecursively(const QString &sourcePath, const QString &destinationPath, QString *errorMessage = nullptr);
bool moveRecursively(const QString &sourcePath, const QString &destinationPath, QString *errorMessage = nullptr);
bool removeRecursively(const QString &path, QString *errorMessage = nullptr);
bool revealInSystemExplorer(const QString &path);
bool openWithDialog(const QString &path);
QString copyOperationSummary(const QStringList &paths);

} // namespace Ixplorer::FileOperations
