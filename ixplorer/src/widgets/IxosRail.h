#pragma once

#include "search/IxosCliSearchProvider.h"

#include <QComboBox>
#include <QFileInfo>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QPushButton>
#include <QTextEdit>
#include <QWidget>

namespace Ixplorer {

class IxosRail : public QWidget {
    Q_OBJECT
public:
    explicit IxosRail(QWidget *parent = nullptr);

    void setSearchRoot(const QString &path);
    void submitToolbarSearch(const QString &query, int mode);
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

private:
    void triggerSearch();
    void renderResults(const QList<SearchHit> &results, bool semanticResults);
    void handleResultSelection(int row);
    void syncDetailPanel();
    void updateActionStates();
    QString currentActionPath() const;
    QString modeLabel() const;
    QString detailTextForResult(const SearchHit &item) const;
    QString summaryTextForResult(const SearchHit &item) const;
    QString evidenceTextForResult(const SearchHit &item) const;
    QString breakdownTextForResult(const SearchHit &item) const;
    QString relativePathForResult(const SearchHit &item) const;

    IxosCliSearchProvider *m_provider;
    QFileInfo m_currentFileInfo;
    int m_selectedCount = 0;
    quint64 m_selectedBytes = 0;
    QString m_searchRoot;
    QString m_statusMessage;
    QList<SearchHit> m_results;
    int m_selectedResultRow = -1;
    bool m_showingSemanticResults = false;
    bool m_searchInFlight = false;
    bool m_lastSearchFailed = false;

    QLabel *m_scopeLabel;
    QLabel *m_selectionTitle;
    QLabel *m_selectionMeta;
    QLabel *m_selectionPath;
    QPushButton *m_openSelectionButton;
    QPushButton *m_revealSelectionButton;
    QPushButton *m_copySelectionPathButton;

    QLineEdit *m_searchInput;
    QComboBox *m_modeBox;
    QPushButton *m_searchButton;
    QLabel *m_searchStateLabel;
    QLabel *m_searchSummaryLabel;
    QListWidget *m_resultList;

    QLabel *m_matchTitle;
    QLabel *m_matchMeta;
    QLabel *m_matchPath;
    QLabel *m_matchExplanation;
    QLabel *m_matchEvidence;
    QLabel *m_matchBreakdown;
    QLabel *m_matchTags;
    QTextEdit *m_matchSnippet;
    QPushButton *m_openResultButton;
    QPushButton *m_openInNewTabButton;
    QPushButton *m_revealResultButton;
    QPushButton *m_copyResultPathButton;
};

} // namespace Ixplorer
