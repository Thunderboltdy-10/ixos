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
    setMinimumWidth(340);
    m_liveSearchTimer->setSingleShot(true);
    m_liveSearchTimer->setInterval(380);

    auto *mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->setSpacing(0);

    auto *header = new QWidget(this);
    header->setObjectName("RailHeader");
    auto *headerLayout = new QHBoxLayout(header);
    headerLayout->setContentsMargins(18, 14, 18, 12);
    headerLayout->setSpacing(10);

    auto *title = new QLabel("Ixos", header);
    title->setObjectName("RailHeaderTitle");
    QFont titleFont("Geist Mono");
    titleFont.setPixelSize(14);
    titleFont.setBold(true);
    title->setFont(titleFont);
    title->setStyleSheet("color: #E8A317;"); // AccentAmber
    headerLayout->addWidget(title, 1);

    auto *closeButton = new QPushButton(header);
    closeButton->setObjectName("RailHeaderButton");
    closeButton->setIcon(Icons::makeIconFromFont(Icons::Close, 16));
    closeButton->setFlat(true);
    closeButton->setFixedSize(24, 24);
    headerLayout->addWidget(closeButton);
    mainLayout->addWidget(header);

    auto *searchContainer = new QWidget(this);
    auto *searchLayout = new QVBoxLayout(searchContainer);
    searchLayout->setContentsMargins(18, 0, 18, 12);
    searchLayout->setSpacing(6);

    m_searchInput = new QLineEdit(searchContainer);
    m_searchInput->setObjectName("SearchField");
    m_searchInput->setPlaceholderText("Search this folder");
    m_searchInput->setClearButtonEnabled(true);
    searchLayout->addWidget(m_searchInput);

    m_searchStateLabel = new QLabel(searchContainer);
    m_searchStateLabel->setObjectName("RailStatus");
    m_searchStateLabel->setWordWrap(true);
    m_searchStateLabel->setStyleSheet("color: #8E8E93; font-size: 12px;");
    searchLayout->addWidget(m_searchStateLabel);

    mainLayout->addWidget(searchContainer);

    m_contextPane = new QWidget(this);
    m_contextPane->setObjectName("RailContextPane");
    auto *contextLayout = new QVBoxLayout(m_contextPane);
    contextLayout->setContentsMargins(18, 4, 18, 12);
    contextLayout->setSpacing(6);

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
    m_contextActionsLayout->setContentsMargins(0, 2, 0, 0);
    m_contextActionsLayout->setSpacing(6);
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
    detailLayout->setContentsMargins(18, 14, 18, 16);
    detailLayout->setSpacing(8);
    
    auto *detailTitle = new QLabel("Match Details", m_detailPane);
    detailTitle->setObjectName("RailHeaderTitle");
    detailTitle->setStyleSheet("color: #E8A317; font-weight: 600; font-size: 12px;");
    detailLayout->addWidget(detailTitle);
    
    m_detailText = new QTextEdit(m_detailPane);
    m_detailText->setObjectName("RailDetailText");
    m_detailText->setReadOnly(true);
    m_detailText->setMinimumHeight(128);
    m_detailText->setStyleSheet("background: transparent; border: none; color: #A1A1A6; font-size: 12px;");
    detailLayout->addWidget(m_detailText, 1);
    
    mainLayout->addWidget(m_detailPane, 0);

    connect(closeButton, &QPushButton::clicked, this, &IxosRail::requestClose);
    connect(m_searchInput, &QLineEdit::returnPressed, this, &IxosRail::triggerSearch);
    connect(m_searchInput, &QLineEdit::textChanged, this, [this]() {
        scheduleLiveSearch();
    });
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
        const QString query = m_searchInput->text().trimmed();
        if (query.size() < 2) {
            if (query.isEmpty()) {
                clearSearchSession("Ready to search.");
            }
            return;
        }
        triggerSearch();
    });
}

void IxosRail::setSearchRoot(const QString &path) {
    m_searchRoot = path;
    const QString folderName = QFileInfo(path).fileName();
    const QString readableFolder = folderName.isEmpty() ? QDir::toNativeSeparators(path) : folderName;
    m_searchInput->setPlaceholderText(QStringLiteral("Search %1").arg(readableFolder));
}

void IxosRail::submitToolbarSearch(const QString &query, int) {
    const QString trimmed = query.trimmed();
    const bool blocked = m_searchInput->blockSignals(true);
    m_searchInput->setText(trimmed);
    m_searchInput->blockSignals(blocked);
    if (trimmed.isEmpty()) {
        clearSearchSession("Ready to search.");
        return;
    }
    triggerSearch();
}

void IxosRail::submitToolbarDraft(const QString &query, int) {
    const QString trimmed = query.trimmed();
    const bool blocked = m_searchInput->blockSignals(true);
    m_searchInput->setText(trimmed);
    m_searchInput->blockSignals(blocked);
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
    m_detailPane->hide();
    m_detailText->clear();
}

void IxosRail::setStatusMessage(const QString &message) {
    m_statusMessage = message;
    m_searchStateLabel->setText(message);
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
    m_searchInput->setFocus();
    m_searchInput->selectAll();
}

bool IxosRail::hasActiveQuery() const {
    return !m_searchInput->text().trimmed().isEmpty();
}

void IxosRail::triggerSearch() {
    const QString query = m_searchInput->text().trimmed();
    if (query.isEmpty()) {
        clearSearchSession("Ready to search.");
        return;
    }

    const QString root = m_searchRoot.isEmpty() ? QDir::homePath() : m_searchRoot;
    SearchRequest request;
    request.query = query;
    request.directory = QDir::fromNativeSeparators(root);
    request.mode = static_cast<SearchMode>(m_searchMode);
    request.limit = 24;
    request.contextLines = 3;

    emit searchSubmitted(query, static_cast<int>(request.mode));
    m_provider->startSearch(request);
}

void IxosRail::scheduleLiveSearch() {
    const QString query = m_searchInput->text().trimmed();
    if (query.isEmpty()) {
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
    } else if (!m_searchInput->text().trimmed().isEmpty()) {
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

        QString html = QStringLiteral("<div style='line-height:1.45'>");
        html += QStringLiteral("<div style='margin-bottom:6px; color:#F2F2F7; font-weight:600;'>%1</div>")
                    .arg(hit.filename.toHtmlEscaped());
        html += QStringLiteral("<div style='margin-bottom:10px; color:#8E8E93; font-family:\"Geist Mono\",\"Consolas\",monospace;'>%1</div>")
                    .arg(relativePathForResult(hit).toHtmlEscaped());
        if (hit.hasScoreBreakdown) {
            html += QStringLiteral("<b>Match</b> %1%<br>").arg(static_cast<int>(hit.score * 100.0));
            html += QStringLiteral("<span style='color:#8E8E93'>semantic %1 • integrity %2</span><br><br>")
                        .arg(hit.scoreBreakdown.semantic, 0, 'f', 2)
                        .arg(hit.scoreBreakdown.integrity, 0, 'f', 2);
        }
        if (hit.hasEvidence) {
            html += QStringLiteral("<b>Explanation</b><br>%1").arg(hit.evidence.explanation.toHtmlEscaped());
            if (!hit.evidence.matchedTerms.isEmpty()) {
                html += QStringLiteral("<br><br><span style='color:#8E8E93'><b>Terms</b> %1</span>")
                            .arg(hit.evidence.matchedTerms.join(QStringLiteral(", ")).toHtmlEscaped());
            }
        } else {
            html += QStringLiteral("<span style='color:#8E8E93'>Top result is opened by default. Press Enter to reopen, or double-click another result to open it in a new tab.</span>");
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

    if (m_recoveryPacket.wasInterrupted && !m_recoveryPacket.items.isEmpty()) {
        eyebrow = QStringLiteral("Recovered Session");
        title = QStringLiteral("Resume where you left off");
        subtitle = m_recoveryPacket.reason;

        QStringList bundlePaths;
        for (const RecoveryItem &item : std::as_const(m_recoveryPacket.items)) {
            bundlePaths.append(item.path);
        }

        auto *resumeButton = new QPushButton(QStringLiteral("Open %1 items").arg(bundlePaths.size()), m_contextActions);
        resumeButton->setProperty("railPrimaryAction", true);
        resumeButton->setCursor(Qt::PointingHandCursor);
        connect(resumeButton, &QPushButton::clicked, this, [this, bundlePaths]() {
            emit openBundleRequested(bundlePaths, m_recoveryPacket.workstreamId);
        });
        m_contextActionsLayout->addWidget(resumeButton);

        for (const RecoveryItem &item : std::as_const(m_recoveryPacket.items)) {
            m_contextActionsLayout->addWidget(makeAction(displayNameForPath(item.path), item.path, false));
        }
    } else if (!m_bundlePrediction.primaryPath.isEmpty()) {
        eyebrow = QStringLiteral("Suggested Next");
        title = displayNameForPath(m_bundlePrediction.primaryPath);
        subtitle = m_bundlePrediction.reason;

        QStringList bundlePaths{m_bundlePrediction.primaryPath};
        auto *openBundle = new QPushButton(QStringLiteral("Open bundle"), m_contextActions);
        openBundle->setProperty("railPrimaryAction", true);
        openBundle->setCursor(Qt::PointingHandCursor);
        connect(openBundle, &QPushButton::clicked, this, [this, bundlePaths]() mutable {
            for (const BundleItem &item : std::as_const(m_bundlePrediction.items)) {
                bundlePaths.append(item.path);
            }
            emit openBundleRequested(bundlePaths, m_bundlePrediction.workstreamId);
        });
        m_contextActionsLayout->addWidget(openBundle);
        m_contextActionsLayout->addWidget(makeAction(displayNameForPath(m_bundlePrediction.primaryPath), m_bundlePrediction.primaryPath, false));
        for (const BundleItem &item : std::as_const(m_bundlePrediction.items)) {
            m_contextActionsLayout->addWidget(makeAction(displayNameForPath(item.path), item.path, false));
        }
    } else if (!m_resumePacket.primaryPath.isEmpty()) {
        eyebrow = QStringLiteral("Continue");
        title = displayNameForPath(m_resumePacket.primaryPath);
        subtitle = m_resumePacket.lastQuery.isEmpty()
            ? m_resumePacket.reason
            : QStringLiteral("Last search: \"%1\"").arg(m_resumePacket.lastQuery);

        QStringList bundlePaths{m_resumePacket.primaryPath};
        auto *openBundle = new QPushButton(QStringLiteral("Open bundle"), m_contextActions);
        openBundle->setProperty("railPrimaryAction", true);
        openBundle->setCursor(Qt::PointingHandCursor);
        connect(openBundle, &QPushButton::clicked, this, [this, bundlePaths]() mutable {
            for (const QString &path : std::as_const(m_resumePacket.supportingPaths)) {
                bundlePaths.append(path);
            }
            emit openBundleRequested(bundlePaths, m_resumePacket.workstreamId);
        });
        m_contextActionsLayout->addWidget(openBundle);
        m_contextActionsLayout->addWidget(makeAction(displayNameForPath(m_resumePacket.primaryPath), m_resumePacket.primaryPath, false));
        for (const QString &path : std::as_const(m_resumePacket.supportingPaths)) {
            m_contextActionsLayout->addWidget(makeAction(displayNameForPath(path), path, false));
        }
    } else {
        m_contextPane->hide();
        return;
    }

    m_contextActionsLayout->addStretch(1);
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
