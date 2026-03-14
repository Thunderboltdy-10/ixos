#include "widgets/HomeDashboardPane.h"
#include "theme/IconFont.h"
#include "theme/ThemedFileIconProvider.h"
#include <QScrollArea>
#include <QFileInfo>
#include <QDir>
#include <QPushButton>
#include <QDateTime>
#include <QApplication>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>

namespace Ixplorer {

HomeDashboardPane::HomeDashboardPane(QWidget *parent)
    : QWidget(parent)
    , m_content(new QWidget(this))
    , m_layout(new QVBoxLayout(m_content)) {
    setObjectName("HomeDashboardPane");

    auto *scrollArea = new QScrollArea(this);
    scrollArea->setWidgetResizable(true);
    scrollArea->setFrameShape(QFrame::NoFrame);
    scrollArea->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    m_content->setObjectName("HomeDashboardContent");
    m_layout->setContentsMargins(40, 24, 40, 40);
    m_layout->setSpacing(0);

    auto *headerLabel = new QLabel("Home", m_content);
    headerLabel->setObjectName("DashboardHeader");
    m_layout->addWidget(headerLabel);

    // Resume Section
    m_resumeSection = new QWidget(m_content);
    auto *resumeLayout = new QVBoxLayout(m_resumeSection);
    resumeLayout->setContentsMargins(0, 0, 0, 0);
    resumeLayout->setSpacing(8);
    auto *resumeHeader = new QLabel("RESUMPTION", m_resumeSection);
    resumeHeader->setObjectName("DashSectionHeader");
    resumeLayout->addWidget(resumeHeader);
    m_resumeGrid = new QGridLayout();
    m_resumeGrid->setSpacing(12);
    resumeLayout->addLayout(m_resumeGrid);
    m_layout->addWidget(m_resumeSection);

    // Workstreams Section
    m_workstreamsSection = new QWidget(m_content);
    auto *workstreamsLayout = new QVBoxLayout(m_workstreamsSection);
    workstreamsLayout->setContentsMargins(0, 0, 0, 0);
    workstreamsLayout->setSpacing(8);
    auto *workstreamsHeader = new QLabel("WORKSTREAMS", m_workstreamsSection);
    workstreamsHeader->setObjectName("DashSectionHeader");
    workstreamsLayout->addWidget(workstreamsHeader);
    
    m_workstreamsLayout = new QHBoxLayout();
    m_workstreamsLayout->setSpacing(12);
    workstreamsLayout->addLayout(m_workstreamsLayout);
    m_layout->addWidget(m_workstreamsSection);

    // Recents Section
    m_recentsSection = new QWidget(m_content);
    auto *recentsLayout = new QVBoxLayout(m_recentsSection);
    recentsLayout->setContentsMargins(0, 0, 0, 0);
    recentsLayout->setSpacing(0);
    auto *recentsHeader = new QLabel("Recent", m_recentsSection);
    recentsHeader->setObjectName("DashSectionHeader");
    recentsLayout->addWidget(recentsHeader);
    
    // Header for the recent list columns
    auto *recentsListHeader = new QWidget(m_recentsSection);
    auto *rlhLayout = new QHBoxLayout(recentsListHeader);
    rlhLayout->setContentsMargins(12, 4, 12, 4);
    auto *nameH = new QLabel("Name", recentsListHeader);
    nameH->setStyleSheet("color: #A1A1AA; font-size: 11px; font-weight: 500;");
    rlhLayout->addWidget(nameH, 2);
    auto *locH = new QLabel("Location", recentsListHeader);
    locH->setStyleSheet("color: #A1A1AA; font-size: 11px; font-weight: 500;");
    rlhLayout->addWidget(locH, 3);
    recentsLayout->addWidget(recentsListHeader);

    m_recentsGrid = new QGridLayout();
    m_recentsGrid->setSpacing(0);
    m_recentsGrid->setContentsMargins(0, 0, 0, 0);
    recentsLayout->addLayout(m_recentsGrid);
    m_layout->addWidget(m_recentsSection);

    m_layout->addStretch(1);
    scrollArea->setWidget(m_content);

    auto *mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->addWidget(scrollArea);
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

    if (!m_re || !m_wm) return;

    ResumptionPacket packet = m_re->buildPacket(m_wm->currentWorkstreamId());
    if (packet.primaryPath.isEmpty()) {
        m_resumeSection->hide();
        return;
    }
    m_resumeSection->show();

    auto *primary = new QPushButton(m_content);
    primary->setProperty("dashboardCardPrimary", true);
    primary->setCursor(Qt::PointingHandCursor);
    auto *primaryLayout = new QVBoxLayout(primary);
    primaryLayout->setSpacing(4);

    auto *title = new QLabel(QFileInfo(packet.primaryPath).fileName(), primary);
    title->setStyleSheet("font-size: 14px; font-weight: 600; color: #FFFFFF;");
    primaryLayout->addWidget(title);

    auto *reason = new QLabel(packet.reason, primary);
    reason->setStyleSheet("font-size: 12px; color: #A1A1AA;");
    reason->setWordWrap(true);
    primaryLayout->addWidget(reason);

    connect(primary, &QPushButton::clicked, this, [this, path = packet.primaryPath]() {
        emit pathActivated(path);
    });

    m_resumeGrid->addWidget(primary, 0, 0);

    int col = 1;
    for (const QString &supportPath : packet.supportingPaths) {
        auto *button = new QPushButton(m_content);
        button->setProperty("dashboardCard", true);
        button->setCursor(Qt::PointingHandCursor);
        auto *layout = new QVBoxLayout(button);
        layout->setSpacing(2);

        auto *name = new QLabel(QFileInfo(supportPath).fileName(), button);
        name->setStyleSheet("font-size: 12px; font-weight: 500; color: #FFFFFF;");
        layout->addWidget(name);

        connect(button, &QPushButton::clicked, this, [this, path = supportPath]() {
            emit pathActivated(path);
        });

        m_resumeGrid->addWidget(button, 0, col++);
        if (col >= 4) break;
    }
}

void HomeDashboardPane::updateWorkstreamsSection() {
    QLayoutItem *child;
    while ((child = m_workstreamsLayout->takeAt(0)) != nullptr) {
        delete child->widget();
        delete child;
    }

    if (!m_wm) return;

    auto workstreams = m_wm->workstreams();
    if (workstreams.isEmpty()) {
        m_workstreamsSection->hide();
        return;
    }
    m_workstreamsSection->show();

    for (const auto &ws : workstreams) {
        auto *btn = new QPushButton(m_content);
        btn->setProperty("dashboardCard", true);
        btn->setCursor(Qt::PointingHandCursor);
        btn->setFixedWidth(220);
        auto *layout = new QVBoxLayout(btn);
        layout->setSpacing(4);

        auto *titleLabel = new QLabel(ws.name.isEmpty() ? "Recent Work" : ws.name, btn);
        titleLabel->setStyleSheet("font-size: 13px; font-weight: 600; color: #FFFFFF;");
        layout->addWidget(titleLabel);

        auto *descLabel = new QLabel(QString("%1 items").arg(ws.topFiles.size()), btn);
        descLabel->setStyleSheet("font-size: 11px; color: #A1A1AA;");
        layout->addWidget(descLabel);

        connect(btn, &QPushButton::clicked, this, [this, id = ws.id]() {
            emit workstreamActivated(id);
        });
        m_workstreamsLayout->addWidget(btn);
    }
    m_workstreamsLayout->addStretch();
}

void HomeDashboardPane::updateRecentsSection() {
    QLayoutItem *child;
    while ((child = m_recentsGrid->takeAt(0)) != nullptr) {
        delete child->widget();
        delete child;
    }

    if (!m_at) return;

    auto recents = m_at->getRecentFiles(20);
    if (recents.isEmpty()) {
        m_recentsSection->hide();
        return;
    }
    m_recentsSection->show();

    ThemedFileIconProvider iconProvider;
    int row = 0;
    for (const auto &recent : recents) {
        QFileInfo info(recent.filePath);
        
        auto *btn = new QPushButton(m_content);
        btn->setObjectName("DashboardRecentItem");
        btn->setCursor(Qt::PointingHandCursor);
        btn->setStyleSheet(
            "QPushButton#DashboardRecentItem { background: transparent; border: none; border-radius: 4px; text-align: left; padding: 4px 8px; }"
            "QPushButton#DashboardRecentItem:hover { background: rgba(255,255,255,0.06); }"
        );
        
        auto *hlayout = new QHBoxLayout(btn);
        hlayout->setContentsMargins(4, 2, 4, 2);
        hlayout->setSpacing(12);

        auto *iconLabel = new QLabel(btn);
        iconLabel->setFixedSize(20, 20);
        iconLabel->setPixmap(iconProvider.icon(info).pixmap(20, 20));
        hlayout->addWidget(iconLabel);

        auto *nameLabel = new QLabel(info.fileName(), btn);
        nameLabel->setStyleSheet("font-size: 12px; color: #FFFFFF; font-weight: 400;");
        hlayout->addWidget(nameLabel, 2);

        auto *pathLabel = new QLabel(QDir::toNativeSeparators(info.absolutePath()), btn);
        pathLabel->setStyleSheet("font-size: 11px; color: #71717A;");
        hlayout->addWidget(pathLabel, 3);

        const QString targetPath = recent.filePath;
        connect(btn, &QPushButton::clicked, this, [this, targetPath]() {
            emit pathActivated(targetPath);
        });
        
        m_recentsGrid->addWidget(btn, row++, 0);
    }
}

} // namespace Ixplorer
