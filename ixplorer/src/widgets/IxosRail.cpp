#include "widgets/IxosRail.h"
#include "widgets/SearchResultCard.h"
#include "theme/IconFont.h"

#include <QDir>
#include <QFileInfo>
#include <QHBoxLayout>
#include <QVBoxLayout>
#include <QListWidgetItem>
#include <QStyle>
#include <QTextEdit>
#include <utility>

namespace Ixplorer {

IxosRail::IxosRail(QWidget *parent)
    : QWidget(parent)
    , m_provider(new IxosCliSearchProvider(this))
    , m_liveSearchTimer(new QTimer(this)) {
    setObjectName("IxosRail");
    m_liveSearchTimer->setSingleShot(true);
    m_liveSearchTimer->setInterval(380);

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
        if (m_results.isEmpty()) {
            setStatusMessage("No matches in this folder.");
        } else {
            if (m_resultList->count() > 0) {
                m_resultList->setCurrentRow(0);
            }
            const QString path = m_results.first().path;
            if (path != m_lastAutoOpenedPath) {
                m_lastAutoOpenedPath = path;
                emit autoOpenPathRequested(path);
            }

            const SearchAction action = classifyTopResultAction();
            const QString guidance = action == SearchAction::Suggest
                ? QStringLiteral(" Top result is selected and opened by default.")
                : QString();
            setStatusMessage(QStringLiteral("%1 results ready.%2")
                                 .arg(m_results.size())
                                 .arg(guidance));
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
    triggerSearch();
}

void IxosRail::submitToolbarDraft(const QString &query, int) {
    const QString trimmed = query.trimmed();
    m_currentQuery = trimmed;
    if (trimmed.isEmpty()) {
        clearSearchSession("Ready to search.");
        return;
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

    if (m_showingSemanticResults && topScore > 0.85 && gap > 0.15) {
        return SearchAction::AutoOpen;
    }
    if (m_showingSemanticResults && topScore > 0.70 && gap > 0.10) {
        return SearchAction::Suggest;
    }
    return SearchAction::ShowInRail;
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
    }
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

    const bool hideForActiveSearch = hasActiveQuery();
    if (hideForActiveSearch) {
        m_contextPane->hide();
        return;
    }

    auto makeAction = [this](const QString &label, const QString &path, bool primary) {
        auto *button = new QPushButton(label, m_contextActions);
        button->setCursor(Qt::PointingHandCursor);
        button->setProperty("railPrimaryAction", primary);
        button->setFlat(!primary);
        button->setToolTip(path);
        button->setMaximumHeight(26);
        connect(button, &QPushButton::clicked, this, [this, path, primary]() {
            if (primary) {
                emit openFileRequested(path);
            } else {
                emit openPathInNewTabRequested(path);
            }
        });
        return button;
    };

    QString eyebrow;
    QString title;
    QString subtitle;
    bool hasAction = false;

    if (m_recoveryPacket.wasInterrupted && !m_recoveryPacket.items.isEmpty()) {
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
        subtitle = m_bundlePrediction.reason;

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
        subtitle = m_resumePacket.reason;

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
        subtitle = QStringLiteral("Ixos automatically clusters your recent activity into workstreams and learns your personal file rankings. Use search to find files, or explore your graph.");

        auto *workstreamsBtn = new QPushButton(QStringLiteral("View Workstreams"), m_contextActions);
        workstreamsBtn->setProperty("railPrimaryAction", true);
        workstreamsBtn->setCursor(Qt::PointingHandCursor);
        workstreamsBtn->setMaximumHeight(26);
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
    emit searchTelemetryChanged(!m_results.isEmpty(),
                                topScore,
                                gap,
                                m_lastLexicalConfidence,
                                m_lastSearchElapsedMs,
                                m_maxSearchLatencyMs,
                                hasActiveQuery());
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
