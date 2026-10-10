#pragma once

#include <QWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QPropertyAnimation>
#include <QIcon>

namespace Ixplorer {

class SidebarSection : public QWidget {
    Q_OBJECT
public:
    explicit SidebarSection(const QString &title, const QIcon &sectionIcon = QIcon(), QWidget *parent = nullptr);

    void addItem(const QString &label, const QString &path, const QIcon &icon = QIcon());
    void clearItems();
    void setHighlighted(const QString &path);
    void toggleCollapse();
    QVBoxLayout *bodyLayout() const { return m_body; }

protected:
    bool eventFilter(QObject *watched, QEvent *event) override;

signals:
    void itemClicked(const QString &path);

private:
    QWidget *m_headerWidget;
    QLabel *m_chevronLabel;
    QLabel *m_titleLabel;
    
    QWidget *m_bodyWidget;
    QVBoxLayout *m_body;
    bool m_collapsed = false;
    QString m_highlightedPath;
    QPropertyAnimation *m_collapseAnimation;
};

} // namespace Ixplorer
