#pragma once

#include <QObject>
#include <QString>
#include <QVector>

namespace Ixplorer {

class ResumptionEngine;
class SessionState;

struct RecoveryItem {
    QString path;
    float score = 0.0f;
    QString reason;
};

struct RecoveryPacket {
    QVector<RecoveryItem> items;
    bool wasInterrupted = false;
    QString workstreamId;
    QString reason;
};

class InterruptionDetector : public QObject {
    Q_OBJECT
public:
    explicit InterruptionDetector(QObject *parent = nullptr);

    void setSessionState(SessionState *sessionState);
    void setResumptionEngine(ResumptionEngine *resumptionEngine);

    RecoveryPacket buildRecoveryPacket(int budget = 3) const;

private:
    SessionState *m_sessionState = nullptr;
    ResumptionEngine *m_resumptionEngine = nullptr;
};

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::RecoveryItem)
Q_DECLARE_METATYPE(Ixplorer::RecoveryPacket)
