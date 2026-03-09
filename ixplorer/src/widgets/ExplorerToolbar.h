#pragma once

#include <QWidget>
#include <QPushButton>
#include <QLineEdit>
#include <QStringList>

namespace Ixplorer {

class BreadcrumbBar;

class ExplorerToolbar : public QWidget {
    Q_OBJECT
public:
    explicit ExplorerToolbar(QWidget *parent = nullptr);

    void setCurrentPath(const QString &path);
    void pushHistory(const QString &path);
    bool canGoBack() const;
    bool canGoForward() const;
    QString goBack();
    QString goForward();

signals:
    void navigateRequested(const QString &path);
    void searchRequested(const QString &query);
    void backRequested();
    void forwardRequested();
    void upRequested();
    void refreshRequested();

private:
    void updateNavButtons();

    QPushButton *m_backBtn;
    QPushButton *m_fwdBtn;
    QPushButton *m_upBtn;
    QPushButton *m_refreshBtn;
    BreadcrumbBar *m_breadcrumb;
    QLineEdit *m_searchField;

    QStringList m_history;
    int m_historyIndex = -1;
    bool m_navigating = false;
};

} // namespace Ixplorer
