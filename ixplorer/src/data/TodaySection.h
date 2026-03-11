#pragma once

#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QVector>
#include <QWidget>

class QHBoxLayout;

#include "data/ResumptionEngine.h"

namespace Ixplorer {

class TodaySection : public QWidget {
    Q_OBJECT
public:
    explicit TodaySection(QWidget *parent = nullptr);

    void setPacket(const ResumptionPacket &packet);
    void clearPacket();
    ResumptionPacket packet() const;

signals:
    void resumeRequested(const QString &path);
    void supportingPathRequested(const QString &path);
    void dismissed();

private:
    void rebuildSupportingButtons();

    ResumptionPacket m_packet;
    QLabel *m_titleLabel = nullptr;
    QLabel *m_reasonLabel = nullptr;
    QPushButton *m_primaryButton = nullptr;
    QWidget *m_supportingContainer = nullptr;
    QHBoxLayout *m_supportingLayout = nullptr;
    QPushButton *m_dismissButton = nullptr;
    QVector<QPushButton *> m_supportingButtons;
};

} // namespace Ixplorer
