#pragma once

#include <QPushButton>
#include <QVBoxLayout>
#include <QWidget>

namespace Ixplorer {

class SidebarSection : public QWidget {
    Q_OBJECT
public:
    explicit SidebarSection(const QString &title, QWidget *parent = nullptr);

    void addItem(const QString &label, const QString &path, const QString &icon = {});
    void clearItems();
    void setHighlighted(const QString &path);
    QVBoxLayout *bodyLayout() const { return m_body; }

signals:
    void itemClicked(const QString &path);

private:
    void toggleCollapse();

    QPushButton *m_header;
    QWidget *m_bodyWidget;
    QVBoxLayout *m_body;
    bool m_collapsed = false;
    QString m_highlightedPath;
};

} // namespace Ixplorer
