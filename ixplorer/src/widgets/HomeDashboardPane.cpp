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

    auto *headerLabel = new QLabel("Welcome to Ixplorer", m_content);
    headerLabel->setStyleSheet("font-size: 28px; font-weight: 600; color: #F0F0F5; margin-bottom: 8px;");
    m_layout->addWidget(headerLabel);

    // Resume Section
    m_resumeSection = new QWidget(m_content);
    auto *resumeLayout = new QVBoxLayout(m_resumeSection);
    resumeLayout->setContentsMargins(0, 0, 0, 0);
    resumeLayout->setSpacing(12);
    auto *resumeHeader = new QLabel("Continue where you left off", m_resumeSection);
    resumeHeader->setStyleSheet("font-size: 15px; font-weight: 600; color: #E8E8ED;");
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
    auto *workstreamsHeader = new QLabel("Your Active Workstreams", m_workstreamsSection);
    workstreamsHeader->setStyleSheet("font-size: 15px; font-weight: 600; color: #E8E8ED;");
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
    recentsHeader->setStyleSheet("font-size: 15px; font-weight: 600; color: #E8E8ED;");
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
        "#HomeDashboardPane { background-color: #191B1F; }"
        "QPushButton[dashboardCard=\"true\"] {"
        "  background-color: rgba(255, 255, 255, 0.03);"
        "  border: 1px solid rgba(255, 255, 255, 0.06);"
        "  border-radius: 8px;"
        "  padding: 16px;"
        "  text-align: left;"
        "}"
        "QPushButton[dashboardCard=\"true\"]:hover {"
        "  background-color: rgba(255, 255, 255, 0.05);"
        "  border-color: rgba(212, 153, 61, 0.3);"
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
    m_resumeSection->hide();
    return;
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
        titleLabel->setStyleSheet("font-size: 14px; font-weight: 600; color: #D4993D;");
        layout->addWidget(titleLabel);
        
        auto *descLabel = new QLabel(ws.description.isEmpty() ? QString("%1 items").arg(ws.topFiles.size()) : ws.description, btn);
        descLabel->setStyleSheet("font-size: 12px; color: #8B8B90;");
        layout->addWidget(descLabel);
        
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