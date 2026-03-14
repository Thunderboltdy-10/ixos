#include "widgets/IxosRail.h"
#include "widgets/SearchResultCard.h"
#include "theme/IconFont.h"

#include <QDir>
#include <QDateTime>
#include <QFileInfo>
#include <QFile>
#include <QHBoxLayout>
#include <QJsonDocument>
#include <QJsonObject>
#include <QStandardPaths>
#include <QVBoxLayout>
#include <QListWidgetItem>
#include <QStyle>
#include <QTextEdit>
#include <algorithm>
#include <functional>
#include <utility>

namespace Ixplorer {

namespace {

QString ensureAppDataDir() {
    QString dir = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation);
    if (dir.isEmpty()) {
        dir = QDir::homePath() + QStringLiteral("/.ixplorer");
    }
    QDir().mkpath(dir);
    return dir;
}

QString relationLabel(const QString &path) {
    const QFileInfo info(path);
    if (!info.fileName().isEmpty()) {
        return info.fileName();
    }
    return QDir::toNativeSeparators(path);
}

} // namespace

IxosRail::IxosRail(QWidget *parent)
    : QWidget(parent)
    , m_provider(new IxosCliSearchProvider(this))
    , m_liveSearchTimer(new QTimer(this)) {
    setObjectName("IxosRail");
    m_liveSearchTimer->setSingleShot(true);
    m_liveSearchTimer->setInterval(380);
    m_searchTracePath = ensureAppDataDir() + QStringLiteral("/search_trace_v1.jsonl");

    auto *mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->setSpacing(0);

    auto *header = new QWidget(this);
    header->setObjectName("RailHeader");
    auto *headerLayout = new QHBoxLayout(header);
    headerLayout->setContentsMargins(16, 10, 12, 8);
    headerLayout->setSpacing(8);

    auto *title = new QLabel("", header);
    title->setObjectName("RailHeaderTitle");
    QFont titleFont("Geist Mono");
    titleFont.setPixelSize(11);
    titleFont.setBold(true);
    titleFont.setLetterSpacing(QFont::AbsoluteSpacing, 1.2);
    title->setFont(titleFont);
    headerLayout->addWidget(title, 1);

    auto *closeButton = new QPushButton(header);
    closeButton->setObjectName("RailHeaderButton");
    closeButton->setIcon(Icons::makeIconFromFont(Icons::Close, 12, QColor(0x6E, 0x6E, 0x73)));
    closeButton->setFlat(true);
    closeButton->setFixedSize(22, 22);
    headerLayout->addWidget(closeButton);
    mainLayout->addWidget(header);

    // Removed the inline rail search box and status label

    m_contextPane = new QWidget(this);
    m_contextPane->setObjectName("RailContextPane");
    auto *contextLayout = new QVBoxLayout(m_contextPane);
    contextLayout->setContentsMargins(14, 8, 14, 10);
    contextLayout->setSpacing(4);

    m_contextEyebrow = new QLabel(m_contextPane);
    m_contextEyebrow->setObjectName("RailContextEyebrow");
    contextLayout->addWidget(m_contextEyebrow);

    m_contextTitle = new QLabel(m_contextPane);
    m_contextTitle->setObjectName("RailContextTitle");
    m_contextTitle->setWordWrap(true);
    contextLayout->addWidget(m_contextTitle);

    m_contextSubtitle = new QLabel(m_contextPane);
    m_contextSubtitle->setObjectName("RailContextSubtitle");
    m_contextSubtitle->setWordWrap(true);
    contextLayout->addWidget(m_contextSubtitle);

    m_contextActions = new QWidget(m_contextPane);
    m_contextActionsLayout = new QHBoxLayout(m_contextActions);
    m_contextActionsLayout->setContentsMargins(0, 4, 0, 0);
    m_contextActionsLayout->setSpacing(4);
    contextLayout->addWidget(m_contextActions);
    m_contextPane->hide();
    mainLayout->addWidget(m_contextPane, 0);

    m_resultList = new QListWidget(this);
    m_resultList->setObjectName("RailResults");
    m_resultList->setSelectionMode(QAbstractItemView::SingleSelection);
    m_resultList->setUniformItemSizes(true);
    m_resultList->setSpacing(2);
    mainLayout->addWidget(m_resultList, 1);
    
    m_detailPane = new QWidget(this);
    m_detailPane->setObjectName("RailDetailPane");
    m_detailPane->hide();
    auto *detailLayout = new QVBoxLayout(m_detailPane);
    detailLayout->setContentsMargins(14, 10, 14, 12);
    detailLayout->setSpacing(6);

    m_detailText = new QTextEdit(m_detailPane);
    m_detailText->setObjectName("RailDetailText");
    m_detailText->setReadOnly(true);
    m_detailText->setMinimumHeight(100);
    m_detailText->setFrameShape(QFrame::NoFrame);
    detailLayout->addWidget(m_detailText, 1);

    m_detailActions = new QWidget(m_detailPane);
    m_detailActionsLayout = new QGridLayout(m_detailActions);
    m_detailActionsLayout->setContentsMargins(0, 0, 0, 0);
    m_detailActionsLayout->setHorizontalSpacing(6);
    m_detailActionsLayout->setVerticalSpacing(4);

    auto makeDetailAction = [this](const QString &title, int row, int column, const std::function<void(const QString &)> &callback) {
        auto *button = new QPushButton(title, m_detailActions);
        button->setObjectName("RailDetailAction");
        button->setCursor(Qt::PointingHandCursor);
        button->setMaximumHeight(24);
        connect(button, &QPushButton::clicked, this, [this, callback]() {
            const int row = m_resultList->currentRow();
            if (row < 0 || row >= m_results.size()) {
                return;
            }
            callback(m_results.at(row).path);
        });
        m_detailActionsLayout->addWidget(button, row, column);
    };

    makeDetailAction(QStringLiteral("Open Here"), 0, 0, [this](const QString &path) { emit openFileRequested(path); });
    makeDetailAction(QStringLiteral("Open Beside"), 0, 1, [this](const QString &path) { emit openPathInNewTabRequested(path); });
    makeDetailAction(QStringLiteral("Add To Workstream"), 1, 0, [this](const QString &path) { emit addPathToWorkstreamRequested(path); });
    makeDetailAction(QStringLiteral("Compare"), 1, 1, [this](const QString &path) { emit compareWithCurrentRequested(path); });
    makeDetailAction(QStringLiteral("Reveal Graph"), 2, 0, [this](const QString &path) { emit revealRelationshipRequested(path); });
    makeDetailAction(QStringLiteral("Copy Path"), 2, 1, [this](const QString &path) { emit copyPathRequested(path); });
    makeDetailAction(QStringLiteral("Pin For Today"), 3, 0, [this](const QString &path) { emit pinForTodayRequested(path); });
    detailLayout->addWidget(m_detailActions, 0);
    
    mainLayout->addWidget(m_detailPane, 0);

    connect(closeButton, &QPushButton::clicked, this, &IxosRail::requestClose);
    connect(m_resultList, &QListWidget::currentRowChanged, this, &IxosRail::handleResultSelection);
    connect(m_resultList, &QListWidget::itemDoubleClicked, this, &IxosRail::handleResultDoubleClicked);
    connect(m_resultList, &QListWidget::itemActivated, this, [this]() {
        activateCurrentResult();
    });

    connect(m_provider, &ISearchProvider::searchStarted, this, [this](const SearchRequest &) {
        m_results.clear();
        m_showingSemanticResults = false;
        m_lastLexicalConfidence = 0.0f;
        m_lastSearchElapsedMs = 0;
        m_searchElapsed.restart();
        m_resultList->clear();
        setStatusMessage("Searching...");
        emitSearchTelemetry();
    });
    connect(m_provider, &ISearchProvider::searchStateChanged, this, [this](const QString &message, bool) {
        setStatusMessage(message);
    });
    connect(m_provider, &ISearchProvider::lexicalResultsReady, this, [this](const QList<SearchHit> &results) {
        m_lastLexicalConfidence = results.isEmpty() ? 0.0f : static_cast<float>(results.first().score);
        m_lastSearchElapsedMs = m_searchElapsed.isValid() ? m_searchElapsed.elapsed() : 0;
        if (!m_showingSemanticResults) {
            renderResults(results, false);
        }
        emitSearchTelemetry();
    });
    connect(m_provider, &ISearchProvider::semanticResultsReady, this, [this](const QList<SearchHit> &results) {
        m_lastSearchElapsedMs = m_searchElapsed.isValid() ? m_searchElapsed.elapsed() : 0;
        renderResults(results, true);
        emitSearchTelemetry();
    });
    connect(m_provider, &ISearchProvider::searchFailed, this, [this](const QString &message) {
        setStatusMessage(message);
        emitSearchTelemetry();
    });
    connect(m_provider, &ISearchProvider::searchFinished, this, [this]() {
        m_lastSearchElapsedMs = m_searchElapsed.isValid() ? m_searchElapsed.elapsed() : m_lastSearchElapsedMs;
        SearchAction action = SearchAction::Silent;
        if (m_results.isEmpty()) {
            setStatusMessage("No matches in this folder.");
        } else {
            if (m_resultList->count() > 0) {
                m_resultList->setCurrentRow(0);
            }
            action = classifyTopResultAction();
            if (action == SearchAction::AutoOpen) {
                const QString path = m_results.first().path;
                if (path != m_lastAutoOpenedPath) {
                    m_lastAutoOpenedPath = path;
                    emit autoOpenPathRequested(path);
                }
            }
            const QString guidance = action == SearchAction::Suggest
                ? QStringLiteral(" Top result is selected; confirm with Enter.")
                : QString();
            setStatusMessage(QStringLiteral("%1 results ready.%2")
                                 .arg(m_results.size())
                                 .arg(guidance));
        }
        appendSearchTrace(action);
        if (!m_results.isEmpty()) {
            m_lastCompletedQuery = m_currentQuery;
            m_lastTopPath = m_results.first().path;
        }
        emitSearchTelemetry();
    });

    clearSearchSession("Ready to search.");
    setSearchRoot(QDir::homePath());

    connect(m_liveSearchTimer, &QTimer::timeout, this, [this]() {
        if (m_currentQuery.size() < 2) {
            if (m_currentQuery.isEmpty()) {
                clearSearchSession("Ready to search.");
            }
            return;
        }
        triggerSearch();
    });
}

void IxosRail::setSearchRoot(const QString &path) {
    m_searchRoot = path;
}

void IxosRail::submitToolbarSearch(const QString &query, int) {
    const QString trimmed = query.trimmed();
    m_currentQuery = trimmed;
    if (trimmed.isEmpty()) {
        clearSearchSession("Ready to search.");
        return;
    }
    if (!m_relationshipItems.isEmpty()) {
        m_relationshipItems.clear();
        m_relationshipSeedPath.clear();
    }
    triggerSearch();
}

void IxosRail::submitToolbarDraft(const QString &query, int) {
    const QString trimmed = query.trimmed();
    m_currentQuery = trimmed;
    if (trimmed.isEmpty()) {
        clearSearchSession("Ready to search.");
        return;
    }
    if (!m_relationshipItems.isEmpty()) {
        m_relationshipItems.clear();
        m_relationshipSeedPath.clear();
    }
    scheduleLiveSearch();
}

void IxosRail::showResumeSuggestion(const ResumptionPacket &packet) {
    m_resumePacket = packet;
    rebuildContextPane();
}

void IxosRail::showPredictedBundle(const BundlePrediction &bundle) {
    m_bundlePrediction = bundle;
    rebuildContextPane();
}

void IxosRail::showRecoverySuggestion(const RecoveryPacket &packet) {
    m_recoveryPacket = packet;
    rebuildContextPane();
}

void IxosRail::showRelationshipContext(const QString &seedPath, const QVector<RailRelationshipItem> &items) {
    m_relationshipSeedPath = seedPath;
    m_relationshipItems = items;
    rebuildContextPane();
}

void IxosRail::clearRelationshipContext() {
    m_relationshipSeedPath.clear();
    m_relationshipItems.clear();
    rebuildContextPane();
}

void IxosRail::clearContextSuggestions() {
    m_resumePacket = ResumptionPacket();
    m_bundlePrediction = BundlePrediction();
    m_recoveryPacket = RecoveryPacket();
    rebuildContextPane();
}

void IxosRail::showFileDetails(const QFileInfo &, int, quint64) {
    if (!m_results.isEmpty() && m_resultList->currentRow() >= 0) {
        return;
    }
    m_detailPane->hide();
}

void IxosRail::clearDetails() {
    if (!m_results.isEmpty() && m_resultList->currentRow() >= 0) {
        return;
    }
    m_detailPane->hide();
    m_detailText->clear();
}

void IxosRail::setStatusMessage(const QString &message) {
    m_statusMessage = message;
}

void IxosRail::setSearchMode(int mode) {
    m_searchMode = mode;
}

IxosRail::SearchAction IxosRail::classifyTopResultAction() const {
    if (m_results.isEmpty()) {
        return SearchAction::Silent;
    }

    const double topScore = m_results.first().score;
    const double secondScore = m_results.size() > 1 ? m_results.at(1).score : 0.0;
    const double gap = topScore - secondScore;
    const double witness = witnessStrengthForTopResult();
    const double stabilityPenalty = stabilityPenaltyForTopResult();

    if (m_showingSemanticResults &&
        topScore > 0.82 &&
        gap > 0.13 &&
        witness > 0.58 &&
        stabilityPenalty < 0.35) {
        return SearchAction::AutoOpen;
    }
    if (m_showingSemanticResults &&
        topScore > 0.66 &&
        gap > 0.08 &&
        witness > 0.32) {
        return SearchAction::Suggest;
    }
    return SearchAction::ShowInRail;
}

QString IxosRail::railStateName(RailPrimaryState state) const {
    switch (state) {
    case RailPrimaryState::SearchResults:
        return QStringLiteral("search_results");
    case RailPrimaryState::WorkstreamContext:
        return QStringLiteral("workstream_context");
    case RailPrimaryState::RelationshipView:
        return QStringLiteral("relationship_view");
    case RailPrimaryState::SelectionDetail:
        return QStringLiteral("selection_detail");
    }
    return QStringLiteral("workstream_context");
}

void IxosRail::setPrimaryState(RailPrimaryState state) {
    if (m_primaryState == state) {
        return;
    }
    m_primaryState = state;
    emit railStateChanged(railStateName(state));
}

void IxosRail::focusSearch() {
    // Search is now purely driven by the toolbar
}

bool IxosRail::hasActiveQuery() const {
    return !m_currentQuery.isEmpty();
}

void IxosRail::triggerSearch() {
    if (m_currentQuery.isEmpty()) {
        clearSearchSession("Ready to search.");
        return;
    }

    const QString root = m_searchRoot.isEmpty() ? QDir::homePath() : m_searchRoot;
    SearchRequest request;
    request.query = m_currentQuery;
    request.directory = QDir::fromNativeSeparators(root);
    request.mode = static_cast<SearchMode>(m_searchMode);
    request.limit = 24;
    request.contextLines = 3;

    emit searchSubmitted(m_currentQuery, static_cast<int>(request.mode));
    m_provider->startSearch(request);
}

void IxosRail::scheduleLiveSearch() {
    if (m_currentQuery.isEmpty()) {
        clearSearchSession("Ready to search.");
        return;
    }
    m_liveSearchTimer->start();
}

void IxosRail::clearSearchSession(const QString &summary) {
    m_liveSearchTimer->stop();
    m_provider->cancelSearch();
    m_results.clear();
    m_showingSemanticResults = false;
    m_lastAutoOpenedPath.clear();
    m_lastLexicalConfidence = 0.0f;
    m_lastSearchElapsedMs = 0;
    m_lastSearchTraceSignature.clear();
    m_resultList->clear();
    setStatusMessage(summary);
    rebuildContextPane();
    emitSearchTelemetry();
}

void IxosRail::renderResults(const QList<SearchHit> &results, bool semanticResults) {
    m_results = results;
    m_showingSemanticResults = semanticResults;
    m_resultList->clear();

    int rank = 1;
    for (const SearchHit &item : results) {
        auto *listItem = new QListWidgetItem();
        auto *card = new SearchResultCard(m_resultList);
        card->setContent(item, semanticResults, relativePathForResult(item), "", rank++);
        listItem->setSizeHint(QSize(0, 32)); // Height: ~32px
        m_resultList->addItem(listItem);
        m_resultList->setItemWidget(listItem, card);
    }

    if (!m_results.isEmpty()) {
        if (m_resultList->currentRow() < 0 && m_resultList->count() > 0) {
            m_resultList->setCurrentRow(0);
        }
    } else if (!m_currentQuery.isEmpty()) {
        setStatusMessage("No matches in this folder.");
    }
    rebuildContextPane();
}

void IxosRail::handleResultSelection(int row) {
    for (int i = 0; i < m_resultList->count(); ++i) {
        auto *card = dynamic_cast<SearchResultCard *>(m_resultList->itemWidget(m_resultList->item(i)));
        if (card) {
            card->setActive(i == row);
        }
    }

    if (row >= 0 && row < m_results.size()) {
        const SearchHit &hit = m_results.at(row);

        QString html = QStringLiteral(
            "<div style='line-height:1.5; font-family: \"Segoe UI Variable Text\", \"Segoe UI\", sans-serif;'>");
        html += QStringLiteral(
            "<div style='margin-bottom:4px; color:#E8E8ED; font-weight:500; font-size:13px;'>%1</div>")
                    .arg(hit.filename.toHtmlEscaped());
        html += QStringLiteral(
            "<div style='margin-bottom:8px; color:#6E6E73; font-family:\"Geist Mono\",monospace; font-size:11px;'>%1</div>")
                    .arg(relativePathForResult(hit).toHtmlEscaped());
        if (hit.hasScoreBreakdown) {
            html += QStringLiteral(
                "<div style='color:#D4993D; font-size:12px; margin-bottom:2px;'>%1%% match</div>")
                    .arg(static_cast<int>(hit.score * 100.0));
            html += QStringLiteral(
                "<div style='color:#5A5A5E; font-size:11px; margin-bottom:8px;'>"
                "semantic %1 &middot; integrity %2</div>")
                        .arg(hit.scoreBreakdown.semantic, 0, 'f', 2)
                        .arg(hit.scoreBreakdown.integrity, 0, 'f', 2);
        }
        if (hit.hasEvidence) {
            html += QStringLiteral(
                "<div style='color:#8B8B90; font-size:12px;'>%1</div>")
                    .arg(hit.evidence.explanation.toHtmlEscaped());
            if (!hit.evidence.matchedTerms.isEmpty()) {
                html += QStringLiteral(
                    "<div style='color:#5A5A5E; font-size:11px; margin-top:6px;'>%1</div>")
                            .arg(hit.evidence.matchedTerms.join(QStringLiteral(" &middot; ")).toHtmlEscaped());
            }
        }
        html += QStringLiteral("</div>");
        m_detailText->setHtml(html);
        m_detailPane->show();
    } else {
        m_detailPane->hide();
    }
    rebuildContextPane();
}

void IxosRail::handleResultDoubleClicked(QListWidgetItem *item) {
    int row = m_resultList->row(item);
    if (row >= 0 && row < m_results.size()) {
        // Double-click opens new tab
        emit openPathInNewTabRequested(m_results.at(row).path);
    }
}

void IxosRail::activateCurrentResult() {
    const int row = m_resultList->currentRow();
    if (row >= 0 && row < m_results.size()) {
        emit openFileRequested(m_results.at(row).path);
    }
}

void IxosRail::rebuildContextPane() {
    while (QLayoutItem *item = m_contextActionsLayout->takeAt(0)) {
        if (QWidget *widget = item->widget()) {
            widget->deleteLater();
        }
        delete item;
    }

    const bool hasSelection = !m_results.isEmpty() && m_resultList->currentRow() >= 0;
    RailPrimaryState state = RailPrimaryState::WorkstreamContext;
    if (hasActiveQuery()) {
        state = RailPrimaryState::SearchResults;
    } else if (!m_relationshipItems.isEmpty()) {
        state = RailPrimaryState::RelationshipView;
    } else if (hasSelection) {
        state = RailPrimaryState::SelectionDetail;
    }
    setPrimaryState(state);

    m_resultList->setVisible(state == RailPrimaryState::SearchResults || state == RailPrimaryState::SelectionDetail);
    if (state == RailPrimaryState::SearchResults) {
        m_contextPane->hide();
        if (!hasSelection) {
            m_detailPane->hide();
        }
        return;
    }
    if (state == RailPrimaryState::SelectionDetail) {
        m_contextPane->hide();
        if (hasSelection) {
            m_detailPane->show();
        }
        return;
    }

    m_detailPane->hide();

    QString eyebrow;
    QString title;
    QString subtitle;
    bool hasAction = false;

    if (state == RailPrimaryState::RelationshipView) {
        eyebrow = QStringLiteral("RELATIONSHIPS");
        const QString primary = m_relationshipSeedPath.isEmpty()
            ? (m_relationshipItems.isEmpty() ? QString() : m_relationshipItems.first().path)
            : m_relationshipSeedPath;
        title = primary.isEmpty() ? QStringLiteral("Related Files") : displayNameForPath(primary);
        subtitle = QStringLiteral("Edges are scored from co-open frequency, temporal proximity, session reuse, query overlap, and pin affinity.");

        const int maxButtons = qMin(5, m_relationshipItems.size());
        for (int index = 0; index < maxButtons; ++index) {
            const RailRelationshipItem &item = m_relationshipItems.at(index);
            auto *button = new QPushButton(
                QStringLiteral("%1 (%2%)")
                    .arg(relationLabel(item.path))
                    .arg(static_cast<int>(item.score * 100.0f)),
                m_contextActions);
            button->setCursor(Qt::PointingHandCursor);
            button->setToolTip(item.reason);
            button->setMaximumHeight(26);
            connect(button, &QPushButton::clicked, this, [this, item]() {
                emit openFileRequested(item.path);
            });
            m_contextActionsLayout->addWidget(button);
            hasAction = true;
        }

        auto *clearButton = new QPushButton(QStringLiteral("Back To Context"), m_contextActions);
        clearButton->setCursor(Qt::PointingHandCursor);
        clearButton->setMaximumHeight(26);
        connect(clearButton, &QPushButton::clicked, this, [this]() {
            clearRelationshipContext();
        });
        m_contextActionsLayout->addWidget(clearButton);
        hasAction = true;
    } else if (m_recoveryPacket.wasInterrupted && !m_recoveryPacket.items.isEmpty()) {
        eyebrow = QStringLiteral("SESSION");
        title = QStringLiteral("Restore previous session");
        subtitle = m_recoveryPacket.reason.isEmpty()
            ? QStringLiteral("%1 items are ready to reopen.").arg(m_recoveryPacket.items.size())
            : m_recoveryPacket.reason;

        QStringList bundlePaths;
        for (const RecoveryItem &item : std::as_const(m_recoveryPacket.items)) {
            bundlePaths.append(item.path);
        }

        auto *resumeButton = new QPushButton(QStringLiteral("Restore set (%1)").arg(bundlePaths.size()), m_contextActions);
        resumeButton->setProperty("railPrimaryAction", true);
        resumeButton->setCursor(Qt::PointingHandCursor);
        resumeButton->setMaximumHeight(26);
        connect(resumeButton, &QPushButton::clicked, this, [this, bundlePaths]() {
            emit openBundleRequested(bundlePaths, m_recoveryPacket.workstreamId);
        });
        m_contextActionsLayout->addWidget(resumeButton);
        hasAction = true;
    } else if (!m_bundlePrediction.primaryPath.isEmpty()) {
        eyebrow = QStringLiteral("SUGGESTED");
        title = displayNameForPath(m_bundlePrediction.primaryPath);
        subtitle = QStringLiteral("%1 - confidence %2")
            .arg(m_bundlePrediction.reason, QString::number(m_bundlePrediction.confidence, 'f', 2));

        QStringList bundlePaths{m_bundlePrediction.primaryPath};
        auto *openBundle = new QPushButton(QStringLiteral("Open suggested set"), m_contextActions);
        openBundle->setProperty("railPrimaryAction", true);
        openBundle->setCursor(Qt::PointingHandCursor);
        openBundle->setMaximumHeight(26);
        connect(openBundle, &QPushButton::clicked, this, [this, bundlePaths]() mutable {
            for (const BundleItem &item : std::as_const(m_bundlePrediction.items)) {
                bundlePaths.append(item.path);
            }
            emit openBundleRequested(bundlePaths, m_bundlePrediction.workstreamId);
        });
        m_contextActionsLayout->addWidget(openBundle);
        hasAction = true;
    } else if (!m_resumePacket.primaryPath.isEmpty()) {
        eyebrow = QStringLiteral("READY");
        title = displayNameForPath(m_resumePacket.primaryPath);
        subtitle = QStringLiteral("%1 - confidence %2")
            .arg(m_resumePacket.reason, QString::number(m_resumePacket.confidence, 'f', 2));
        if (!m_resumePacket.likelyNextActions.isEmpty()) {
            subtitle.append(QStringLiteral("\nNext: %1").arg(m_resumePacket.likelyNextActions.first()));
        }

        QStringList bundlePaths{m_resumePacket.primaryPath};
        auto *openBundle = new QPushButton(QStringLiteral("Open resume set"), m_contextActions);
        openBundle->setProperty("railPrimaryAction", true);
        openBundle->setCursor(Qt::PointingHandCursor);
        openBundle->setMaximumHeight(26);
        connect(openBundle, &QPushButton::clicked, this, [this, bundlePaths]() mutable {
            for (const QString &path : std::as_const(m_resumePacket.supportingPaths)) {
                bundlePaths.append(path);
            }
            emit openBundleRequested(bundlePaths, m_resumePacket.workstreamId);
        });
        m_contextActionsLayout->addWidget(openBundle);
        hasAction = true;
    } else {
        eyebrow = QStringLiteral("INTELLIGENCE");
        title = QStringLiteral("Active Workstreams & Context");
        subtitle = QStringLiteral("Ixos clusters activity into workstreams and learns personal ranking priors. Use search to find files or inspect the relationship neighborhood.");

        auto *workstreamsBtn = new QPushButton(QStringLiteral("View Workstreams"), m_contextActions);
        workstreamsBtn->setProperty("railPrimaryAction", true);
        workstreamsBtn->setCursor(Qt::PointingHandCursor);
        workstreamsBtn->setMaximumHeight(26);
        connect(workstreamsBtn, &QPushButton::clicked, this, [this]() {
            emit viewWorkstreamsRequested();
        });
        m_contextActionsLayout->addWidget(workstreamsBtn);

        auto *focusButton = new QPushButton(QStringLiteral("Focus Search"), m_contextActions);
        focusButton->setCursor(Qt::PointingHandCursor);
        focusButton->setMaximumHeight(26);
        connect(focusButton, &QPushButton::clicked, this, [this]() {
            focusSearch();
        });
        m_contextActionsLayout->addWidget(focusButton);
        hasAction = true;
    }

    if (hasAction) {
        m_contextActionsLayout->addStretch(1);
    }
    m_contextEyebrow->setText(eyebrow);
    m_contextTitle->setText(title);
    m_contextSubtitle->setText(subtitle);
    m_contextPane->show();
}

void IxosRail::emitSearchTelemetry() {
    const float topScore = m_results.isEmpty() ? 0.0f : static_cast<float>(m_results.first().score);
    const float secondScore = m_results.size() > 1 ? static_cast<float>(m_results.at(1).score) : 0.0f;
    const float gap = topScore - secondScore;
    const float witness = witnessStrengthForTopResult();
    const float stabilityPenalty = stabilityPenaltyForTopResult();
    emit searchTelemetryChanged(!m_results.isEmpty(),
                                topScore,
                                gap,
                                m_lastLexicalConfidence,
                                witness,
                                stabilityPenalty,
                                m_lastSearchElapsedMs,
                                m_maxSearchLatencyMs,
                                hasActiveQuery());
}

void IxosRail::appendSearchTrace(SearchAction action) {
    if (m_currentQuery.trimmed().isEmpty()) {
        return;
    }

    const QString topPath = m_results.isEmpty() ? QString() : m_results.first().path;
    const QString signature = QStringLiteral("%1|%2|%3|%4|%5")
        .arg(m_currentQuery.trimmed().toLower(),
             topPath,
             QString::number(m_lastSearchElapsedMs),
             QString::number(static_cast<int>(action)),
             QString::number(m_results.size()));
    if (signature == m_lastSearchTraceSignature) {
        return;
    }
    m_lastSearchTraceSignature = signature;

    const QString actionLabel =
        action == SearchAction::AutoOpen ? QStringLiteral("auto_open") :
        action == SearchAction::Suggest ? QStringLiteral("suggest") :
        action == SearchAction::ShowInRail ? QStringLiteral("show_in_rail") :
        QStringLiteral("silent");

    const QJsonObject trace{
        {QStringLiteral("timestamp_ms"), QString::number(QDateTime::currentMSecsSinceEpoch())},
        {QStringLiteral("query"), m_currentQuery.trimmed()},
        {QStringLiteral("result_count"), m_results.size()},
        {QStringLiteral("top_path"), topPath},
        {QStringLiteral("top_score"), m_results.isEmpty() ? 0.0 : m_results.first().score},
        {QStringLiteral("second_score"), m_results.size() > 1 ? m_results.at(1).score : 0.0},
        {QStringLiteral("witness_strength"), witnessStrengthForTopResult()},
        {QStringLiteral("stability_penalty"), stabilityPenaltyForTopResult()},
        {QStringLiteral("lexical_confidence"), m_lastLexicalConfidence},
        {QStringLiteral("elapsed_ms"), m_lastSearchElapsedMs},
        {QStringLiteral("action"), actionLabel},
        {QStringLiteral("state"), railStateName(m_primaryState)},
    };

    QFileInfo info(m_searchTracePath);
    QDir().mkpath(info.absolutePath());
    QFile file(m_searchTracePath);
    if (file.open(QIODevice::WriteOnly | QIODevice::Append)) {
        file.write(QJsonDocument(trace).toJson(QJsonDocument::Compact));
        file.write("\n");
    }
}

float IxosRail::witnessStrengthForTopResult() const {
    if (m_results.isEmpty()) {
        return 0.0f;
    }

    const SearchHit &top = m_results.first();
    float witness = 0.0f;
    if (top.hasEvidence) {
        if (!top.evidence.explanation.trimmed().isEmpty()) {
            witness += 0.35f;
        }
        if (top.evidence.matchedTerms.size() >= 2) {
            witness += 0.25f;
        } else if (top.evidence.matchedTerms.size() == 1) {
            witness += 0.12f;
        }
        if (!top.evidence.pathTags.isEmpty()) {
            witness += 0.18f;
        }
        if (!top.evidence.semanticPassage.trimmed().isEmpty()) {
            witness += 0.14f;
        }
        if (top.evidence.lexicalHitCount >= 2) {
            witness += 0.08f;
        }
    }
    if (!top.snippet.trimmed().isEmpty()) {
        witness += 0.06f;
    }
    return std::clamp(witness, 0.0f, 1.0f);
}

float IxosRail::stabilityPenaltyForTopResult() const {
    if (m_results.isEmpty() || m_lastCompletedQuery.isEmpty() || m_lastTopPath.isEmpty()) {
        return 0.0f;
    }
    const SearchHit &top = m_results.first();
    const QString currentQuery = m_currentQuery.trimmed().toLower();
    const QString previousQuery = m_lastCompletedQuery.trimmed().toLower();
    if (currentQuery.isEmpty() || previousQuery.isEmpty()) {
        return 0.0f;
    }

    const int delta = qAbs(currentQuery.size() - previousQuery.size());
    const bool nearQuery = delta <= 2 &&
        (currentQuery.startsWith(previousQuery.left(qMin(4, previousQuery.size()))) ||
         previousQuery.startsWith(currentQuery.left(qMin(4, currentQuery.size()))));
    if (!nearQuery) {
        return 0.0f;
    }
    if (top.path == m_lastTopPath) {
        return 0.0f;
    }

    const float scoreGap = m_results.size() > 1
        ? static_cast<float>(m_results.first().score - m_results.at(1).score)
        : static_cast<float>(m_results.first().score);
    return std::clamp(0.55f - scoreGap * 0.8f, 0.0f, 0.55f);
}

QString IxosRail::displayNameForPath(const QString &path) const {
    const QFileInfo info(path);
    return info.fileName().isEmpty() ? QDir::toNativeSeparators(path) : info.fileName();
}

QString IxosRail::relativePathForResult(const SearchHit &item) const {
    QDir root(QDir::fromNativeSeparators(m_searchRoot));
    const QString relative = root.relativeFilePath(QDir::fromNativeSeparators(item.path));
    if (relative.startsWith("..")) {
        return QDir::toNativeSeparators(item.path);
    }
    return QDir::toNativeSeparators(relative);
}

} // namespace Ixplorer
