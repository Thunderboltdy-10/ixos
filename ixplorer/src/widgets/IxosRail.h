#pragma once

#include "data/BundlePredictor.h"
#include "data/InterruptionDetector.h"
#include "data/ResumptionEngine.h"
#include "search/IxosCliSearchProvider.h"

#include <QElapsedTimer>
#include <QFileInfo>
#include <QGridLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QPushButton>
#include <QTextEdit>
#include <QTimer>
#include <QWidget>

namespace Ixplorer {

struct RailRelationshipItem {
    QString path;
    QString reason;
    float score = 0.0f;
};

class IxosRail : public QWidget {
    Q_OBJECT
public:
    explicit IxosRail(QWidget *parent = nullptr);

    void setSearchRoot(const QString &path);
    void submitToolbarSearch(const QString &query, int mode);
    void submitToolbarDraft(const QString &query, int mode);
    void showResumeSuggestion(const ResumptionPacket &packet);
    void showPredictedBundle(const BundlePrediction &bundle);
    void showRecoverySuggestion(const RecoveryPacket &packet);
    void showRelationshipContext(const QString &seedPath, const QVector<RailRelationshipItem> &items);
    void clearRelationshipContext();
    void clearContextSuggestions();
    void showFileDetails(const QFileInfo &info, int selectedCount = 1, quint64 selectedBytes = 0);
    void clearDetails();
    void setStatusMessage(const QString &message);
    void setSearchMode(int mode);
    void focusSearch();
    bool hasActiveQuery() const;

signals:
    void revealPathInWorkspaceRequested(const QString &path);
    void openFileRequested(const QString &path);
    void openPathInNewTabRequested(const QString &path);
    void revealPathRequested(const QString &path);
    void openBundleRequested(const QStringList &paths, const QString &workstreamId);
    void viewWorkstreamsRequested();
    void addPathToWorkstreamRequested(const QString &path);
    void compareWithCurrentRequested(const QString &path);
    void revealRelationshipRequested(const QString &path);
    void pinForTodayRequested(const QString &path);
    void copyPathRequested(const QString &path);
    void requestClose();
    void searchSubmitted(const QString &query, int mode);
    void autoOpenPathRequested(const QString &path);
    void searchTelemetryChanged(bool hasResults,
                                float topScore,
                                float scoreGap,
                                float lexicalConfidence,
                                float witnessStrength,
                                float stabilityPenalty,
                                qint64 elapsedMs,
                                qint64 maxLatencyMs,
                                bool queryActive);
    void railStateChanged(const QString &stateName);

private:
    enum class SearchAction {
        AutoOpen,
        Suggest,
        ShowInRail,
        Silent,
    };
    enum class RailPrimaryState {
        SearchResults,
        WorkstreamContext,
        RelationshipView,
        SelectionDetail,
    };

    SearchAction classifyTopResultAction() const;
    QString railStateName(RailPrimaryState state) const;
    void setPrimaryState(RailPrimaryState state);
    void appendSearchTrace(SearchAction action);
    void triggerSearch();
    void scheduleLiveSearch();
    void clearSearchSession(const QString &summary);
    void renderResults(const QList<SearchHit> &results, bool semanticResults);
    void handleResultSelection(int row);
    void handleResultDoubleClicked(QListWidgetItem *item);
    void activateCurrentResult();
    void rebuildContextPane();
    void emitSearchTelemetry();
    float witnessStrengthForTopResult() const;
    float stabilityPenaltyForTopResult() const;
    QString displayNameForPath(const QString &path) const;
    QString relativePathForResult(const SearchHit &item) const;

    IxosCliSearchProvider *m_provider;
    QString m_searchRoot;
    QString m_statusMessage;
    QString m_currentQuery;
    QString m_lastAutoOpenedPath;
    QList<SearchHit> m_results;
    bool m_showingSemanticResults = false;
    int m_searchMode = static_cast<int>(SearchMode::Auto);
    QElapsedTimer m_searchElapsed;
    float m_lastLexicalConfidence = 0.0f;
    qint64 m_lastSearchElapsedMs = 0;
    const qint64 m_maxSearchLatencyMs = 1200;
    QString m_lastCompletedQuery;
    QString m_lastTopPath;
    RailPrimaryState m_primaryState = RailPrimaryState::WorkstreamContext;
    QString m_searchTracePath;
    QString m_lastSearchTraceSignature;
    ResumptionPacket m_resumePacket;
    BundlePrediction m_bundlePrediction;
    RecoveryPacket m_recoveryPacket;
    QString m_relationshipSeedPath;
    QVector<RailRelationshipItem> m_relationshipItems;

    // Removed m_searchInput and m_searchStateLabel
    QWidget *m_contextPane = nullptr;
    QLabel *m_contextEyebrow = nullptr;
    QLabel *m_contextTitle = nullptr;
    QLabel *m_contextSubtitle = nullptr;
    QWidget *m_contextActions = nullptr;
    QHBoxLayout *m_contextActionsLayout = nullptr;
    QListWidget *m_resultList;
    QTimer *m_liveSearchTimer;

    QWidget *m_detailPane = nullptr;
    QTextEdit *m_detailText = nullptr;
    QWidget *m_detailActions = nullptr;
    QGridLayout *m_detailActionsLayout = nullptr;
};

} // namespace Ixplorer
