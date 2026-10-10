#pragma once

#include "data/ResumptionEngine.h"
#include "data/WorkstreamManager.h"

#include <QLabel>
#include <QPushButton>
#include <QStringList>
#include <QVBoxLayout>
#include <QWidget>

namespace Ixplorer {

class SidebarSection;

class AppSidebar : public QWidget {
    Q_OBJECT
public:
    explicit AppSidebar(QWidget *parent = nullptr);

    void highlightCurrent(const QString &path);
    void recordRecentLocation(const QString &path);
    void setTodayPacket(const ResumptionPacket &packet);
    void setWorkstreams(const QVector<Workstream> &workstreams, const QString &currentId);
    void pinFavorite(const QString &path);

signals:
    void locationSelected(const QString &path);
    void resumePathSelected(const QString &path);
    void workstreamSelected(const QString &id);

private:
    void buildResumeCard(QWidget *parent, QVBoxLayout *layout);
    void populatePlaces();
    void populateDrives();
    void loadRecents();
    void loadPinnedFavorites();
    void persistRecents() const;
    void persistPinnedFavorites() const;
    void refreshRecents();
    void refreshFavorites();

    QWidget *m_resumeCard = nullptr;
    QLabel *m_resumeCardTitle = nullptr;
    QLabel *m_resumeCardBody = nullptr;
    QPushButton *m_resumeCardBtn = nullptr;
    ResumptionPacket m_resumePacket;

    SidebarSection *m_homeSection = nullptr;
    SidebarSection *m_workstreamsSection = nullptr;
    SidebarSection *m_favoritesSection = nullptr;
    SidebarSection *m_recentsSection = nullptr;
    SidebarSection *m_drivesSection = nullptr;

    QStringList m_recentLocations;
    QStringList m_pinnedFavorites;
};

} // namespace Ixplorer
