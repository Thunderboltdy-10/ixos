#include "widgets/HomeDashboardPane.h"
#include <QScrollArea>
#include <QFileInfo>
#include <QDir>
#include <QGraphicsDropShadowEffect>

namespace Ixplorer {

HomeDashboardPane::HomeDashboardPane(QWidget *parent)
    : QWidget(parent) {
    setObjectName("HomeDashboardPane");

    auto *scrollArea = new QScrollArea(this);
    scrollArea->setWidgetResizable(true);
    scrollArea->setFrameShape(QFrame::NoFrame);
    scrollArea->setStyleSheet("background: transparent;");

    m_content = new QWidget(scrollArea);
    m_content->setObjectName("HomeDashboardContent");
    m_layout = new QVBoxLayout(m_content);
    m_layout->setContentsMargins(40, 40, 40, 40);
    m_layout->setSpacing(32);
    m_layout->setAlignment(Qt::AlignTop);

    auto *headerLabel = new QLabel("Ixplorer Work Engine", m_content);
    headerLabel->setStyleSheet("font-size: 30px; font-weight: 650; color: #F3F5FA; margin-bottom: 2px; letter-spacing: 0.4px;");
    m_layout->addWidget(headerLabel);

    auto *subheaderLabel = new QLabel("Resume packets, predictive bundles, and live workstreams", m_content);
    subheaderLabel->setStyleSheet("font-size: 13px; color: #9CA4B8; margin-bottom: 8px;");
    m_layout->addWidget(subheaderLabel);

    // Resume Section
    m_resumeSection = new QWidget(m_content);
    auto *resumeLayout = new QVBoxLayout(m_resumeSection);
    resumeLayout->setContentsMargins(0, 0, 0, 0);
    resumeLayout->setSpacing(12);
    auto *resumeHeader = new QLabel("Today / Resumption Packets", m_resumeSection);
    resumeHeader->setStyleSheet("font-size: 15px; font-weight: 650; color: #E8E8ED;");
    resumeLayout->addWidget(resumeHeader);
    m_resumeGrid = new QGridLayout();
    m_resumeGrid->setSpacing(12);
    resumeLayout->addLayout(m_resumeGrid);
    m_layout->addWidget(m_resumeSection);

    // Workstreams Section
    m_workstreamsSection = new QWidget(m_content);
    auto *workstreamsLayout = new QVBoxLayout(m_workstreamsSection);
    workstreamsLayout->setContentsMargins(0, 0, 0, 0);
    workstreamsLayout->setSpacing(12);
    auto *workstreamsHeader = new QLabel("Temporal Workstreams", m_workstreamsSection);
    workstreamsHeader->setStyleSheet("font-size: 15px; font-weight: 650; color: #E8E8ED;");
    workstreamsLayout->addWidget(workstreamsHeader);
    m_workstreamsLayout = new QHBoxLayout();
    m_workstreamsLayout->setSpacing(12);
    workstreamsLayout->addLayout(m_workstreamsLayout);
    m_layout->addWidget(m_workstreamsSection);

    // Recents Section
    m_recentsSection = new QWidget(m_content);
    auto *recentsLayout = new QVBoxLayout(m_recentsSection);
    recentsLayout->setContentsMargins(0, 0, 0, 0);
    recentsLayout->setSpacing(12);
    auto *recentsHeader = new QLabel("Recent Files", m_recentsSection);
    recentsHeader->setStyleSheet("font-size: 15px; font-weight: 650; color: #E8E8ED;");
    recentsLayout->addWidget(recentsHeader);
    m_recentsGrid = new QGridLayout();
    m_recentsGrid->setSpacing(12);
    recentsLayout->addLayout(m_recentsGrid);
    m_layout->addWidget(m_recentsSection);

    m_layout->addStretch(1);
    scrollArea->setWidget(m_content);

    auto *mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->addWidget(scrollArea);
    
    setStyleSheet(
        "#HomeDashboardPane {"
        "  background-color: #171A22;"
        "  background-image: qlineargradient(x1:0,y1:0,x2:1,y2:1, stop:0 rgba(34,40,55,0.75), stop:1 rgba(19,21,28,0.9));"
        "}"
        "QPushButton[dashboardCard=\"true\"] {"
        "  background-color: rgba(255, 255, 255, 0.035);"
        "  border: 1px solid rgba(127, 151, 200, 0.22);"
        "  border-radius: 10px;"
        "  padding: 16px;"
        "  text-align: left;"
        "}"
        "QPushButton[dashboardCard=\"true\"]:hover {"
        "  background-color: rgba(126, 157, 220, 0.12);"
        "  border-color: rgba(152, 186, 255, 0.45);"
        "}"
    );
}

void HomeDashboardPane::setIntelligence(WorkstreamManager *wm, ResumptionEngine *re, ActivityTracker *at) {
    m_wm = wm;
    m_re = re;
    m_at = at;
    refresh();
}

void HomeDashboardPane::refresh() {
    updateResumeSection();
    updateWorkstreamsSection();
    updateRecentsSection();
}

void HomeDashboardPane::updateResumeSection() {
    QLayoutItem *child;
    while ((child = m_resumeGrid->takeAt(0)) != nullptr) {
        delete child->widget();
        delete child;
    }

    if (!m_re) {
        m_resumeSection->hide();
        return;
    }

    const QString preferredWorkstream = m_wm != nullptr ? m_wm->currentWorkstreamId() : QString();
    const ResumptionPacket packet = m_re->buildPacket(preferredWorkstream);
    if (packet.primaryPath.isEmpty()) {
        m_resumeSection->hide();
        return;
    }

    m_resumeSection->show();

    auto *primary = new QPushButton(m_resumeSection);
    primary->setProperty("dashboardCard", true);
    primary->setCursor(Qt::PointingHandCursor);
    primary->setMinimumHeight(120);
    auto *primaryLayout = new QVBoxLayout(primary);
    primaryLayout->setContentsMargins(14, 12, 14, 12);
    primaryLayout->setSpacing(4);

    auto *title = new QLabel(QFileInfo(packet.primaryPath).fileName(), primary);
    title->setStyleSheet("font-size: 14px; font-weight: 650; color: #C9D9FF;");
    primaryLayout->addWidget(title);

    auto *reason = new QLabel(packet.reason, primary);
    reason->setStyleSheet("font-size: 12px; color: #A3AEC7;");
    reason->setWordWrap(true);
    primaryLayout->addWidget(reason);

    auto *meta = new QLabel(QStringLiteral("confidence %1  |  support %2")
                                .arg(QString::number(packet.confidence, 'f', 2),
                                     QString::number(packet.supportingPaths.size())),
                            primary);
    meta->setStyleSheet("font-size: 11px; color: #7F8BA7;");
    primaryLayout->addWidget(meta);

    if (!packet.likelyNextActions.isEmpty()) {
        auto *nextAction = new QLabel(QStringLiteral("next: %1").arg(packet.likelyNextActions.first()), primary);
        nextAction->setStyleSheet("font-size: 11px; color: #9CC7AE;");
        nextAction->setWordWrap(true);
        primaryLayout->addWidget(nextAction);
    }

    connect(primary, &QPushButton::clicked, this, [this, path = packet.primaryPath]() {
        emit pathActivated(path);
    });

    m_resumeGrid->addWidget(primary, 0, 0, 1, 2);

    int column = 0;
    for (const QString &supportPath : packet.supportingPaths) {
        if (supportPath.isEmpty()) {
            continue;
        }
        auto *button = new QPushButton(m_resumeSection);
        button->setProperty("dashboardCard", true);
        button->setCursor(Qt::PointingHandCursor);
        button->setMinimumHeight(74);
        auto *layout = new QVBoxLayout(button);
        layout->setContentsMargins(12, 10, 12, 10);
        layout->setSpacing(2);

        auto *name = new QLabel(QFileInfo(supportPath).fileName(), button);
        name->setStyleSheet("font-size: 12px; font-weight: 600; color: #DDE6FA;");
        layout->addWidget(name);

        auto *pathLabel = new QLabel(QDir::toNativeSeparators(QFileInfo(supportPath).absolutePath()), button);
        pathLabel->setStyleSheet("font-size: 11px; color: #7D89A5;");
        pathLabel->setWordWrap(true);
        layout->addWidget(pathLabel);

        connect(button, &QPushButton::clicked, this, [this, supportPath]() {
            emit pathActivated(supportPath);
        });

        m_resumeGrid->addWidget(button, 1 + column / 2, column % 2);
        column++;
        if (column >= 4) {
            break;
        }
    }
}

void HomeDashboardPane::updateWorkstreamsSection() {
    QLayoutItem *child;
    while ((child = m_workstreamsLayout->takeAt(0)) != nullptr) {
        delete child->widget();
        delete child;
    }

    if (!m_wm) {
        m_workstreamsSection->hide();
        return;
    }

    auto workstreams = m_wm->workstreams();
    if (workstreams.isEmpty()) {
        m_workstreamsSection->hide();
        return;
    }
    
    m_workstreamsSection->show();

    int count = 0;
    for (const Workstream &ws : workstreams) {
        if (count++ >= 4) break;
        
        auto *btn = new QPushButton(m_workstreamsSection);
        btn->setProperty("dashboardCard", true);
        btn->setCursor(Qt::PointingHandCursor);
        btn->setMinimumHeight(80);
        
        auto *layout = new QVBoxLayout(btn);
        layout->setContentsMargins(16, 12, 16, 12);
        layout->setSpacing(4);
        
        auto *titleLabel = new QLabel(ws.name.isEmpty() ? "Recent Work" : ws.name, btn);
        titleLabel->setStyleSheet("font-size: 14px; font-weight: 650; color: #C7D7FF;");
        layout->addWidget(titleLabel);

        const QString queryHint = ws.topQueries.isEmpty() ? QStringLiteral("no dominant query")
                                                          : QStringLiteral("query: %1").arg(ws.topQueries.first().first);
        auto *descLabel = new QLabel(ws.description.isEmpty() ? QString("%1 items").arg(ws.topFiles.size()) : ws.description, btn);
        descLabel->setStyleSheet("font-size: 12px; color: #9BA6C0;");
        descLabel->setWordWrap(true);
        layout->addWidget(descLabel);

        auto *metaLabel = new QLabel(QStringLiteral("%1  |  cohesion %2")
                                         .arg(queryHint, QString::number(ws.cohesion, 'f', 2)),
                                     btn);
        metaLabel->setStyleSheet("font-size: 11px; color: #7583A3;");
        metaLabel->setWordWrap(true);
        layout->addWidget(metaLabel);
        
        connect(btn, &QPushButton::clicked, this, [this, id = ws.id]() {
            emit workstreamActivated(id);
        });
        
        m_workstreamsLayout->addWidget(btn, 1);
    }
    m_workstreamsLayout->addStretch(0);
}

void HomeDashboardPane::updateRecentsSection() {
    QLayoutItem *child;
    while ((child = m_recentsGrid->takeAt(0)) != nullptr) {
        delete child->widget();
        delete child;
    }

    if (!m_at) {
        m_recentsSection->hide();
        return;
    }

    auto recents = m_at->getRecentFiles(8);
    if (recents.isEmpty()) {
        m_recentsSection->hide();
        return;
    }
    
    m_recentsSection->show();

    int count = 0;
    for (const auto &recent : recents) {
        QFileInfo info(recent.filePath);
        if (!info.exists()) continue;
        
        auto *btn = new QPushButton(m_recentsSection);
        btn->setProperty("dashboardCard", true);
        btn->setCursor(Qt::PointingHandCursor);
        btn->setMinimumHeight(60);
        
        auto *layout = new QHBoxLayout(btn);
        layout->setContentsMargins(12, 8, 12, 8);
        layout->setSpacing(10);
        
        ThemedFileIconProvider provider;
        auto *iconLabel = new QLabel(btn);
        iconLabel->setPixmap(provider.icon(info).pixmap(20, 20));
        layout->addWidget(iconLabel);
        
        auto *textLayout = new QVBoxLayout();
        textLayout->setContentsMargins(0, 0, 0, 0);
        textLayout->setSpacing(0);
        
        auto *titleLabel = new QLabel(info.fileName(), btn);
        titleLabel->setStyleSheet("font-size: 13px; font-weight: 500; color: #E8E8ED;");
        textLayout->addWidget(titleLabel);
        
        auto *pathLabel = new QLabel(QDir::toNativeSeparators(info.absolutePath()), btn);
        pathLabel->setStyleSheet("font-size: 11px; color: #5A5A5E;");
        pathLabel->setWordWrap(true);
        textLayout->addWidget(pathLabel);
        
        layout->addLayout(textLayout, 1);
        
        connect(btn, &QPushButton::clicked, this, [this, path = recent.filePath]() {
            emit pathActivated(path);
        });
        
        m_recentsGrid->addWidget(btn, count / 2, count % 2);
        count++;
        if (count >= 8) break;
    }
}

} // namespace Ixplorer
