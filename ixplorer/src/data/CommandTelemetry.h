#pragma once

#include <QObject>
#include <QString>
#include <QHash>
#include <QJsonObject>

namespace Ixplorer {

class CommandTelemetry : public QObject {
    Q_OBJECT
public:
    explicit CommandTelemetry(QObject *parent = nullptr);

    void setStoragePath(const QString &path);
    QString storagePath() const;
    QString summaryPath() const;

    void recordInvocation(const QString &commandId,
                          const QString &arguments,
                          bool success,
                          int latencyMs,
                          const QString &contextPath,
                          const QString &workstreamId);

    QJsonObject summarySnapshot() const;

private:
    void loadSummary();
    void persistSummary() const;

    QString m_storagePath;
    QString m_summaryPath;
    int m_totalInvocations = 0;
    int m_successfulInvocations = 0;
    QHash<QString, int> m_countsByCommand;
    QHash<QString, int> m_successByCommand;
};

} // namespace Ixplorer

