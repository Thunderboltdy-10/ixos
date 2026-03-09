#pragma once

#include "interfaces/ISearchProvider.h"

#include <QByteArray>
#include <QProcess>

namespace Ixplorer {

class IxosCliSearchProvider : public ISearchProvider {
    Q_OBJECT
public:
    explicit IxosCliSearchProvider(QObject *parent = nullptr);

    bool isAvailable() const override;

public slots:
    void startSearch(const SearchRequest &request) override;
    void cancelSearch() override;

private slots:
    void readStandardOutput();
    void readStandardError();
    void handleProcessFinished(int exitCode, QProcess::ExitStatus exitStatus);
    void handleProcessError(QProcess::ProcessError error);

private:
    struct ResolvedCommand {
        QString program;
        QStringList arguments;
        QString workingDirectory;
        bool isValid() const { return !program.isEmpty(); }
    };

    QString resolveBinaryPath() const;
    QString resolveRepoRoot() const;
    ResolvedCommand resolveCommand() const;
    void processBufferedOutput(bool flushAll = false);
    void handleJsonMessage(const QByteArray &line);
    void emitFailure(const QString &message);

    mutable QString m_cachedBinaryPath;
    mutable QString m_cachedRepoRoot;
    QProcess m_process;
    QByteArray m_stdoutBuffer;
    QByteArray m_stderrBuffer;
    SearchRequest m_activeRequest;
    bool m_sawComplete = false;
};

} // namespace Ixplorer
