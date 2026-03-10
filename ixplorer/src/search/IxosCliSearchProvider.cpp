#include "search/IxosCliSearchProvider.h"

#include <QCoreApplication>
#include <QDir>
#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>
#include <QStandardPaths>

namespace Ixplorer {

IxosCliSearchProvider::IxosCliSearchProvider(QObject *parent)
    : ISearchProvider(parent) {
    connect(&m_process, &QProcess::readyReadStandardOutput,
            this, &IxosCliSearchProvider::readStandardOutput);
    connect(&m_process, &QProcess::readyReadStandardError,
            this, &IxosCliSearchProvider::readStandardError);
    connect(&m_process, &QProcess::finished,
            this, &IxosCliSearchProvider::handleProcessFinished);
    connect(&m_process, &QProcess::errorOccurred,
            this, &IxosCliSearchProvider::handleProcessError);
}

bool IxosCliSearchProvider::isAvailable() const {
    return resolveCommand().isValid();
}

void IxosCliSearchProvider::startSearch(const SearchRequest &request) {
    cancelSearch();

    const ResolvedCommand command = resolveCommand();
    if (!command.isValid()) {
        emitFailure(QStringLiteral("Ixos search binary was not found. Build `target/release/ixos.exe` first or run from the repo root."));
        return;
    }

    if (request.query.trimmed().isEmpty()) {
        emitFailure(QStringLiteral("Enter a search query to run Ixos search."));
        return;
    }

    const QFileInfo directoryInfo(request.directory);
    if (!directoryInfo.exists() || !directoryInfo.isDir()) {
        emitFailure(QStringLiteral("Search scope is unavailable: %1").arg(request.directory));
        return;
    }

    m_activeRequest = request;
    m_stdoutBuffer.clear();
    m_stderrBuffer.clear();
    m_sawComplete = false;

    QStringList arguments;
    arguments << command.arguments
              << QStringLiteral("search")
              << request.query
              << QStringLiteral("--dir")
              << QDir::toNativeSeparators(directoryInfo.absoluteFilePath())
              << QStringLiteral("--json")
              << QStringLiteral("--evidence")
              << QStringLiteral("--show-scores")
              << QStringLiteral("--progressive")
              << QStringLiteral("--cache-mode")
              << QStringLiteral("native-cache")
              << QStringLiteral("--limit")
              << QString::number(qMax(1, request.limit))
              << QStringLiteral("--context")
              << QString::number(qMax(1, request.contextLines))
              << QStringLiteral("--search-mode")
              << searchModeToCliValue(request.mode);

    emit searchStarted(request);
    emit searchStateChanged(QStringLiteral("Scanning %1...").arg(directoryInfo.fileName().isEmpty()
                                                                       ? directoryInfo.absoluteFilePath()
                                                                       : directoryInfo.fileName()),
                            false);

    m_process.setWorkingDirectory(command.workingDirectory);
    m_process.start(command.program, arguments);
}

void IxosCliSearchProvider::cancelSearch() {
    if (m_process.state() == QProcess::NotRunning) {
        return;
    }

    m_process.kill();
    m_process.waitForFinished(1000);
    m_stdoutBuffer.clear();
    m_stderrBuffer.clear();
    m_sawComplete = false;
}

void IxosCliSearchProvider::readStandardOutput() {
    m_stdoutBuffer.append(m_process.readAllStandardOutput());
    processBufferedOutput(false);
}

void IxosCliSearchProvider::readStandardError() {
    m_stderrBuffer.append(m_process.readAllStandardError());
}

void IxosCliSearchProvider::handleProcessFinished(int exitCode, QProcess::ExitStatus exitStatus) {
    processBufferedOutput(true);

    if (exitStatus != QProcess::NormalExit) {
        emitFailure(QStringLiteral("Ixos search exited unexpectedly."));
        return;
    }

    if (exitCode != 0) {
        const QString stderrText = QString::fromUtf8(m_stderrBuffer).trimmed();
        emitFailure(stderrText.isEmpty()
                        ? QStringLiteral("Ixos search failed with exit code %1.").arg(exitCode)
                        : stderrText);
        return;
    }

    if (!m_sawComplete) {
        emit searchStateChanged(QStringLiteral("Search complete."), false);
        emit searchFinished();
    }
}

void IxosCliSearchProvider::handleProcessError(QProcess::ProcessError error) {
    if (error == QProcess::Crashed) {
        emitFailure(QStringLiteral("Ixos search process crashed."));
        return;
    }

    const QString stderrText = QString::fromUtf8(m_stderrBuffer).trimmed();
    emitFailure(stderrText.isEmpty() ? m_process.errorString() : stderrText);
}

QString IxosCliSearchProvider::resolveBinaryPath() const {
    if (!m_cachedBinaryPath.isEmpty()) {
        return m_cachedBinaryPath;
    }

    const QString appDir = QCoreApplication::applicationDirPath();
    const QString cwd = QDir::currentPath();
    const QStringList candidates = {
        QDir(appDir).filePath(QStringLiteral("ixos.exe")),
        QDir(cwd).filePath(QStringLiteral("target/release/ixos.exe")),
        QDir(cwd).filePath(QStringLiteral("target/debug/ixos.exe")),
        QDir(appDir).filePath(QStringLiteral("../../target/release/ixos.exe")),
        QDir(appDir).filePath(QStringLiteral("../../target/debug/ixos.exe")),
        QDir(appDir).filePath(QStringLiteral("../../../target/release/ixos.exe")),
        QDir(appDir).filePath(QStringLiteral("../../../target/debug/ixos.exe")),
    };

    for (const QString &candidate : candidates) {
        const QFileInfo info(QDir::cleanPath(candidate));
        if (info.exists() && info.isFile() && info.isExecutable()) {
            m_cachedBinaryPath = info.absoluteFilePath();
            return m_cachedBinaryPath;
        }
    }

    const QString fromPath = QStandardPaths::findExecutable(QStringLiteral("ixos"));
    if (!fromPath.isEmpty()) {
        m_cachedBinaryPath = fromPath;
    }

    return m_cachedBinaryPath;
}

QString IxosCliSearchProvider::resolveRepoRoot() const {
    if (!m_cachedRepoRoot.isEmpty()) {
        return m_cachedRepoRoot;
    }

    const QString appDir = QCoreApplication::applicationDirPath();
    const QStringList candidates = {
        QDir::currentPath(),
        QDir(appDir).filePath(QStringLiteral("../..")),
        QDir(appDir).filePath(QStringLiteral("../../..")),
    };

    for (const QString &candidate : candidates) {
        const QFileInfo manifest(QDir::cleanPath(QDir(candidate).filePath(QStringLiteral("Cargo.toml"))));
        if (manifest.exists() && manifest.isFile()) {
            m_cachedRepoRoot = manifest.absolutePath();
            return m_cachedRepoRoot;
        }
    }

    return QString();
}

IxosCliSearchProvider::ResolvedCommand IxosCliSearchProvider::resolveCommand() const {
    const QString binaryPath = resolveBinaryPath();
    if (!binaryPath.isEmpty()) {
        return {binaryPath, {}, QFileInfo(binaryPath).absolutePath()};
    }

    const QString repoRoot = resolveRepoRoot();
    if (!repoRoot.isEmpty()) {
        return {QStringLiteral("cargo"),
                {QStringLiteral("run"), QStringLiteral("--quiet"), QStringLiteral("--bin"), QStringLiteral("ixos"), QStringLiteral("--")},
                repoRoot};
    }

    return {};
}

void IxosCliSearchProvider::processBufferedOutput(bool flushAll) {
    while (true) {
        const int newlineIndex = m_stdoutBuffer.indexOf('\n');
        if (newlineIndex < 0) {
            if (flushAll && !m_stdoutBuffer.trimmed().isEmpty()) {
                const QByteArray trailing = m_stdoutBuffer.trimmed();
                m_stdoutBuffer.clear();
                handleJsonMessage(trailing);
            }
            return;
        }

        const QByteArray line = m_stdoutBuffer.left(newlineIndex).trimmed();
        m_stdoutBuffer.remove(0, newlineIndex + 1);
        if (!line.isEmpty()) {
            handleJsonMessage(line);
        }
    }
}

void IxosCliSearchProvider::handleJsonMessage(const QByteArray &line) {
    QJsonParseError error;
    const QJsonDocument document = QJsonDocument::fromJson(line, &error);
    if (error.error != QJsonParseError::NoError || !document.isObject()) {
        return;
    }

    const QJsonObject object = document.object();
    const QString type = object.value(QStringLiteral("type")).toString();

    if (type == QStringLiteral("status")) {
        emit searchStateChanged(object.value(QStringLiteral("message")).toString(), false);
        return;
    }

    if (type == QStringLiteral("lexical")) {
        emit lexicalResultsReady(parseSearchHits(object.value(QStringLiteral("results")).toArray(),
                                                true,
                                                qMax(1, m_activeRequest.limit)));
        emit searchStateChanged(QStringLiteral("Quick matches found. Ranking for intent..."), false);
        return;
    }

    if (type == QStringLiteral("semantic")) {
        const auto hits = parseSearchHits(object.value(QStringLiteral("results")).toArray(),
                                          false,
                                          qMax(1, m_activeRequest.limit));
        const bool enriched = !hits.isEmpty() && hits.first().hasEvidence;
        emit semanticResultsReady(hits);
        emit searchStateChanged(enriched ? QStringLiteral("Evidence ready.")
                                         : QStringLiteral("Semantic ranking ready."),
                                false);
        return;
    }

    if (type == QStringLiteral("error")) {
        emitFailure(object.value(QStringLiteral("message")).toString());
        return;
    }

    if (type == QStringLiteral("complete")) {
        m_sawComplete = true;
        emit searchStateChanged(QStringLiteral("Search complete."), false);
        emit searchFinished();
    }
}

void IxosCliSearchProvider::emitFailure(const QString &message) {
    const QString resolved = message.trimmed().isEmpty()
                                 ? QStringLiteral("Ixos search could not complete.")
                                 : message.trimmed();
    emit searchStateChanged(resolved, true);
    emit searchFailed(resolved);
}

} // namespace Ixplorer
