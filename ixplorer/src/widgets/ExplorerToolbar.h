#pragma once

#include <QLineEdit>
#include <QPushButton>
#include <QWidget>
#include <QFrame>

namespace Ixplorer {

class ExplorerToolbar : public QWidget {
    Q_OBJECT
public:
    explicit ExplorerToolbar(QWidget *parent = nullptr);

    void setNavigationState(bool canGoBack, bool canGoForward, bool canGoUp);
    void setSearchText(const QString &query);
    void setRailVisible(bool visible);
    void focusSearch();

signals:
    void searchRequested(const QString &query, int mode); // Mode is always Auto (1)
    void searchDraftChanged(const QString &query, int mode);
    void backRequested();
    void forwardRequested();
    void upRequested();
    void refreshRequested();
    void toggleRailRequested();

private:
    void emitSearchDraft();

    QPushButton *m_backBtn;
    QPushButton *m_fwdBtn;
    QPushButton *m_upBtn;
    QPushButton *m_refreshBtn;
    QLineEdit *m_searchField;
    QPushButton *m_toggleRailBtn;
};

} // namespace Ixplorer
