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
    void setSearchText(const QString &query);
    void setSearchMode(int mode);
    void setRailVisible(bool visible);
    void focusSearch();

signals:
    void navigateRequested(const QString &path);
    void searchRequested(const QString &query, int mode);
    void backRequested();
    void forwardRequested();
    void upRequested();
    void refreshRequested();
    void viewModeChanged(int mode);
    void toggleRailRequested();

private:
    QPushButton *m_backBtn;
    QPushButton *m_fwdBtn;
    QPushButton *m_upBtn;
    QPushButton *m_refreshBtn;
    BreadcrumbBar *m_breadcrumb;
    QComboBox *m_searchModeBox;
    QLineEdit *m_searchField;
    QPushButton *m_searchButton;
    QComboBox *m_viewModeBox;
    QPushButton *m_toggleRailBtn;
};

} // namespace Ixplorer
