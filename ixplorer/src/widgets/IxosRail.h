#pragma once

#include "search/IxosCliSearchProvider.h"

#include <QFileInfo>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QPushButton>
#include <QTextEdit>
#include <QTimer>
#include <QWidget>

namespace Ixplorer {

class IxosRail : public QWidget {
    Q_OBJECT
public:
    explicit IxosRail(QWidget *parent = nullptr);

    void setSearchRoot(const QString &path);
    void submitToolbarSearch(const QString &query, int mode);
    void submitToolbarDraft(const QString &query, int mode);
    void showFileDetails(const QFileInfo &info, int selectedCount = 1, quint64 selectedBytes = 0);
    void clearDetails();
    void setStatusMessage(const QString &message);
    void setSearchMode(int mode);
    void focusSearch();

signals:
    void revealPathInWorkspaceRequested(const QString &path);
    void openFileRequested(const QString &path);
    void openPathInNewTabRequested(const QString &path);
    void revealPathRequested(const QString &path);
    void requestClose();
    void searchSubmitted(const QString &query, int mode);
    void autoOpenPathRequested(const QString &path);

private:
    void triggerSearch();
    void scheduleLiveSearch();
    void clearSearchSession(const QString &summary);
    void renderResults(const QList<SearchHit> &results, bool semanticResults);
    void handleResultSelection(int row);
    void handleResultDoubleClicked(QListWidgetItem *item);
    QString relativePathForResult(const SearchHit &item) const;

    IxosCliSearchProvider *m_provider;
    QString m_searchRoot;
    QString m_statusMessage;
    QList<SearchHit> m_results;
    bool m_showingSemanticResults = false;

    QLineEdit *m_searchInput;
    QLabel *m_searchStateLabel;
    QListWidget *m_resultList;
    QTimer *m_liveSearchTimer;

    QWidget *m_detailPane = nullptr;
    QTextEdit *m_detailText = nullptr;
};

} // namespace Ixplorer
