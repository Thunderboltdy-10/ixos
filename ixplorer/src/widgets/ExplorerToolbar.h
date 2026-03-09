#pragma once

#include <QWidget>
#include <QPushButton>
#include <QComboBox>
#include <QLineEdit>

namespace Ixplorer {

class BreadcrumbBar;

class ExplorerToolbar : public QWidget {
    Q_OBJECT
public:
    explicit ExplorerToolbar(QWidget *parent = nullptr);

    void setCurrentPath(const QString &path);
    void setNavigationState(bool canGoBack, bool canGoForward, bool canGoUp);
    void setViewMode(int mode);

signals:
    void navigateRequested(const QString &path);
    void searchRequested(const QString &query);
    void backRequested();
    void forwardRequested();
    void upRequested();
    void refreshRequested();
    void viewModeChanged(int mode);

private:
    QPushButton *m_backBtn;
    QPushButton *m_fwdBtn;
    QPushButton *m_upBtn;
    QPushButton *m_refreshBtn;
    BreadcrumbBar *m_breadcrumb;
    QLineEdit *m_searchField;
    QComboBox *m_viewModeBox;
};

} // namespace Ixplorer
