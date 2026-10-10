#include "data/CommandTelemetry.h"

#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>
#include <QStandardPaths>

namespace Ixplorer {

namespace {

QString ensureAppDataDir() {
    QString dir = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation);
    if (dir.isEmpty()) {
        dir = QDir::homePath() + QStringLiteral("/.ixplorer");
    }
    QDir().mkpath(dir);
    return dir;
}

} // namespace

CommandTelemetry::CommandTelemetry(QObject *parent)
    : QObject(parent)
    , m_storagePath(ensureAppDataDir() + QStringLiteral("/command_telemetry_v1.jsonl"))
    , m_summaryPath(ensureAppDataDir() + QStringLiteral("/command_telemetry_summary_v1.json")) {
    loadSummary();
}

void CommandTelemetry::setStoragePath(const QString &path) {
    m_storagePath = path;
    const QFileInfo info(path);
    const QString fileName = info.completeBaseName().isEmpty()
        ? QStringLiteral("command_telemetry_summary_v1.json")
        : info.completeBaseName() + QStringLiteral("_summary.json");
    m_summaryPath = info.absolutePath() + QDir::separator() + fileName;
    loadSummary();
}

QString CommandTelemetry::storagePath() const {
    return m_storagePath;
}

QString CommandTelemetry::summaryPath() const {
    return m_summaryPath;
}

void CommandTelemetry::recordInvocation(const QString &commandId,
                                        const QString &arguments,
                                        bool success,
                                        int latencyMs,
                                        const QString &contextPath,
                                        const QString &workstreamId) {
    if (commandId.trimmed().isEmpty()) {
        return;
    }

    QFileInfo logInfo(m_storagePath);
    QDir().mkpath(logInfo.absolutePath());

    const qint64 nowMs = QDateTime::currentMSecsSinceEpoch();
    const QJsonObject event{
        {QStringLiteral("timestamp_ms"), QString::number(nowMs)},
        {QStringLiteral("command_id"), commandId},
        {QStringLiteral("arguments"), arguments},
        {QStringLiteral("success"), success},
        {QStringLiteral("latency_ms"), latencyMs},
        {QStringLiteral("context_path"), contextPath},
        {QStringLiteral("workstream_id"), workstreamId},
    };

    QFile logFile(m_storagePath);
    if (logFile.open(QIODevice::WriteOnly | QIODevice::Append)) {
        logFile.write(QJsonDocument(event).toJson(QJsonDocument::Compact));
        logFile.write("\n");
    }

    m_totalInvocations += 1;
    m_countsByCommand[commandId] += 1;
    if (success) {
        m_successfulInvocations += 1;
        m_successByCommand[commandId] += 1;
    }

    persistSummary();
}

QJsonObject CommandTelemetry::summarySnapshot() const {
    QJsonObject commandStats;
    for (auto it = m_countsByCommand.cbegin(); it != m_countsByCommand.cend(); ++it) {
        const int total = it.value();
        const int success = m_successByCommand.value(it.key());
        commandStats.insert(it.key(), QJsonObject{
            {QStringLiteral("total"), total},
            {QStringLiteral("success"), success},
            {QStringLiteral("success_rate"), total > 0 ? static_cast<double>(success) / static_cast<double>(total) : 0.0},
        });
    }

    return QJsonObject{
        {QStringLiteral("version"), 1},
        {QStringLiteral("saved_at_ms"), QString::number(QDateTime::currentMSecsSinceEpoch())},
        {QStringLiteral("total_invocations"), m_totalInvocations},
        {QStringLiteral("successful_invocations"), m_successfulInvocations},
        {QStringLiteral("overall_success_rate"), m_totalInvocations > 0
             ? static_cast<double>(m_successfulInvocations) / static_cast<double>(m_totalInvocations)
             : 0.0},
        {QStringLiteral("commands"), commandStats},
    };
}

void CommandTelemetry::loadSummary() {
    m_totalInvocations = 0;
    m_successfulInvocations = 0;
    m_countsByCommand.clear();
    m_successByCommand.clear();

    QFile file(m_summaryPath);
    if (!file.exists() || !file.open(QIODevice::ReadOnly)) {
        return;
    }

    const QJsonObject root = QJsonDocument::fromJson(file.readAll()).object();
    m_totalInvocations = root.value(QStringLiteral("total_invocations")).toInt(0);
    m_successfulInvocations = root.value(QStringLiteral("successful_invocations")).toInt(0);

    const QJsonObject commands = root.value(QStringLiteral("commands")).toObject();
    for (auto it = commands.begin(); it != commands.end(); ++it) {
        const QJsonObject stats = it.value().toObject();
        const int total = stats.value(QStringLiteral("total")).toInt(0);
        const int success = stats.value(QStringLiteral("success")).toInt(0);
        if (total > 0) {
            m_countsByCommand.insert(it.key(), total);
        }
        if (success > 0) {
            m_successByCommand.insert(it.key(), success);
        }
    }
}

void CommandTelemetry::persistSummary() const {
    QFileInfo info(m_summaryPath);
    QDir().mkpath(info.absolutePath());

    QFile file(m_summaryPath);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        return;
    }

    file.write(QJsonDocument(summarySnapshot()).toJson(QJsonDocument::Indented));
}

} // namespace Ixplorer
