#pragma once

#include "data/ResumptionEngine.h"
#include "data/WorkstreamManager.h"

#include <QStringList>
#include <QWidget>

namespace Ixplorer {

class SidebarSection;
class TodaySection;

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
    void populatePlaces();
    void populateDrives();
    void loadRecents();
    void loadPinnedFavorites();
    void persistRecents() const;
    void persistPinnedFavorites() const;
    void refreshRecents();
    void refreshFavorites();

    TodaySection *m_todaySectionWidget = nullptr;
    SidebarSection *m_workstreamsSection;
    SidebarSection *m_homeSection;
    SidebarSection *m_favoritesSection;
    SidebarSection *m_recentsSection;
    SidebarSection *m_drivesSection;
    QStringList m_recentLocations;
    QStringList m_pinnedFavorites;
};

} // namespace Ixplorer
