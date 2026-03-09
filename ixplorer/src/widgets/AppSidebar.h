#pragma once

#include <QWidget>

namespace Ixplorer {

class SidebarSection;

class AppSidebar : public QWidget {
    Q_OBJECT
public:
    explicit AppSidebar(QWidget *parent = nullptr);

    void highlightCurrent(const QString &path);

signals:
    void locationSelected(const QString &path);

private:
    void populatePlaces();
    void populateDrives();

    SidebarSection *m_homeSection;
    SidebarSection *m_favoritesSection;
    SidebarSection *m_recentsSection;
    SidebarSection *m_drivesSection;
};

} // namespace Ixplorer
