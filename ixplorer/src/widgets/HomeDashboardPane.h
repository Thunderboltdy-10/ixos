#pragma once

#include "data/WorkstreamManager.h"
#include "data/ResumptionEngine.h"
#include "data/ActivityTracker.h"
#include "theme/IconFont.h"
#include "theme/ThemedFileIconProvider.h"

#include <QWidget>
#include <QScrollArea>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QGridLayout>

namespace Ixplorer {

class HomeDashboardPane : public QWidget {
    Q_OBJECT
public:
    explicit HomeDashboardPane(QWidget *parent = nullptr);

    void setIntelligence(WorkstreamManager *wm, ResumptionEngine *re, ActivityTracker *at);
    void refresh();

    QString currentPath() const { return QStringLiteral("ixplorer://home"); }

signals:
    void pathActivated(const QString &path);
    void workstreamActivated(const QString &id);
    void searchRequested(const QString &query);
    void statusMessage(const QString &message);

private:
    WorkstreamManager *m_wm = nullptr;
    ResumptionEngine *m_re = nullptr;
    ActivityTracker *m_at = nullptr;

    QWidget *m_content;
    QVBoxLayout *m_layout;

    QWidget *m_resumeSection;
    QGridLayout *m_resumeGrid;
    
    QWidget *m_workstreamsSection;
    QHBoxLayout *m_workstreamsLayout;

    QWidget *m_recentsSection;
    QGridLayout *m_recentsGrid;

    void buildUi();
    void updateResumeSection();
    void updateWorkstreamsSection();
    void updateRecentsSection();
};

} // namespace Ixplorer
