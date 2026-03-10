#include "widgets/IxosRail.h"

#include <QApplication>
#include <QClipboard>
#include <QDir>
#include <QFrame>
#include <QHBoxLayout>
#include <QListWidgetItem>
#include <QLocale>
#include <QScrollArea>
#include <QStyle>
#include <QVBoxLayout>

namespace Ixplorer {

namespace {

QLabel *makeSectionTitle(const QString &text, QWidget *parent) {
    auto *label = new QLabel(text, parent);
    label->setObjectName("RailSectionTitle");
    return label;
}

QLabel *makeValueLabel(QWidget *parent, const QString &objectName = "RailValueLabel") {
    auto *label = new QLabel(parent);
    label->setObjectName(objectName);
    label->setWordWrap(true);
    return label;
}

QFrame *makeDivider(QWidget *parent) {
    auto *line = new QFrame(parent);
    line->setObjectName("RailDivider");
    line->setFrameShape(QFrame::HLine);
    line->setFrameShadow(QFrame::Plain);
    return line;
}

QString formatScore(double score) {
    return QString::number(qRound(score * 100.0)) + "%";
}

QString trimmedLine(const QString &text) {
    return text.simplified().trimmed();
}

class SearchResultCard : public QWidget {
public:
    explicit SearchResultCard(QWidget *parent = nullptr)
        : QWidget(parent)
        , m_rank(new QLabel(this))
        , m_title(new QLabel(this))
        , m_meta(new QLabel(this))
        , m_path(new QLabel(this))
        , m_summary(new QLabel(this)) {
        setObjectName("RailResultCard");

        auto *layout = new QVBoxLayout(this);
        layout->setContentsMargins(14, 10, 14, 10);
        layout->setSpacing(6);

        auto *topRow = new QHBoxLayout();
        topRow->setContentsMargins(0, 0, 0, 0);
        topRow->setSpacing(8);

        m_rank->setObjectName("RailResultRank");
        topRow->addWidget(m_rank, 0, Qt::AlignTop);

        m_title->setObjectName("RailResultTitle");
        m_title->setWordWrap(true);
        topRow->addWidget(m_title, 1);
        layout->addLayout(topRow);

        m_meta->setObjectName("RailResultMeta");
        m_meta->setWordWrap(true);
        layout->addWidget(m_meta);

        m_path->setObjectName("RailResultPath");
        m_path->setWordWrap(true);
        layout->addWidget(m_path);

        m_summary->setObjectName("RailResultSummary");
        m_summary->setWordWrap(true);
        layout->addWidget(m_summary);
    }

    void setContent(
        const SearchHit &item,
        bool semanticResults,
        const QString &relativePath,
        const QString &summary,
        int rank) {
        const QString kind = semanticResults ? QStringLiteral("Ranked") : QStringLiteral("Quick");
        const QString fileType = item.hasEvidence && !item.evidence.fileType.isEmpty()
                                     ? item.evidence.fileType
                                     : (QFileInfo(item.path).suffix().isEmpty() ? QStringLiteral("file")
                                                                                : QFileInfo(item.path).suffix().toLower());
        const QString integrity = item.integrityVerified ? QStringLiteral("verified") : QStringLiteral("unverified");

        m_rank->setText(QString::number(rank));
        m_title->setText(item.filename);
        m_meta->setText(QStringLiteral("%1  %2  %3  %4")
                            .arg(formatScore(item.score), kind, fileType, integrity));
        m_path->setText(relativePath);
        m_summary->setText(summary);
    }

    void setActive(bool active) {
        setProperty("active", active);
        style()->unpolish(this);
        style()->polish(this);
        update();
    }

private:
    QLabel *m_rank;
    QLabel *m_title;
    QLabel *m_meta;
    QLabel *m_path;
    QLabel *m_summary;
};

} // namespace

IxosRail::IxosRail(QWidget *parent)
    : QWidget(parent)
    , m_provider(new IxosCliSearchProvider(this))
    , m_liveSearchTimer(new QTimer(this)) {
    setObjectName("IxosRail");
    setMinimumWidth(340);
    m_liveSearchTimer->setSingleShot(true);
    m_liveSearchTimer->setInterval(260);

    auto *outerLayout = new QVBoxLayout(this);
    outerLayout->setContentsMargins(0, 0, 0, 0);
    outerLayout->setSpacing(0);

    auto *header = new QWidget(this);
    header->setObjectName("RailHeader");
    auto *headerLayout = new QHBoxLayout(header);
    headerLayout->setContentsMargins(18, 14, 18, 12);
    headerLayout->setSpacing(10);

    auto *headerText = new QWidget(header);
    auto *headerTextLayout = new QVBoxLayout(headerText);
    headerTextLayout->setContentsMargins(0, 0, 0, 0);
    headerTextLayout->setSpacing(2);

    auto *title = new QLabel("Ixos Search", headerText);
    title->setObjectName("RailHeaderTitle");
    headerTextLayout->addWidget(title);

    m_scopeLabel = new QLabel(headerText);
    m_scopeLabel->setObjectName("RailHeaderSubtitle");
    m_scopeLabel->setWordWrap(true);
    headerTextLayout->addWidget(m_scopeLabel);

    auto *closeButton = new QPushButton("Close", header);
    closeButton->setObjectName("RailHeaderButton");
    closeButton->setFixedHeight(30);

    headerLayout->addWidget(headerText, 1);
    headerLayout->addWidget(closeButton);
    outerLayout->addWidget(header);

    m_searchControls = new QWidget(this);
    auto *searchLayout = new QHBoxLayout(m_searchControls);
    searchLayout->setContentsMargins(18, 0, 18, 12);
    searchLayout->setSpacing(6);

    m_searchInput = new QLineEdit(m_searchControls);
    m_searchInput->setObjectName("SearchField");
    m_searchInput->setPlaceholderText("Search this folder");
    m_searchInput->setClearButtonEnabled(true);

    m_modeBox = new QComboBox(m_searchControls);
    m_modeBox->setObjectName("ToolbarCombo");
    m_modeBox->addItem("Auto", static_cast<int>(SearchMode::Auto));
    m_modeBox->addItem("Fast", static_cast<int>(SearchMode::Fast));
    m_modeBox->addItem("Accurate", static_cast<int>(SearchMode::Accurate));
    m_modeBox->setFixedWidth(104);

    m_searchButton = new QPushButton("Search", m_searchControls);
    m_searchButton->setObjectName("ToolbarPrimaryButton");

    searchLayout->addWidget(m_searchInput, 1);
    searchLayout->addWidget(m_modeBox);
    searchLayout->addWidget(m_searchButton);
    outerLayout->addWidget(m_searchControls);
    m_searchControls->hide();

    auto *scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    auto *content = new QWidget(scroll);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(0, 0, 0, 18);
    layout->setSpacing(0);

    m_searchStateLabel = makeValueLabel(content, "RailStatus");
    layout->addWidget(m_searchStateLabel);

    m_searchSummaryLabel = makeValueLabel(content, "RailSubtleLabel");
    layout->addWidget(m_searchSummaryLabel);

    m_resultList = new QListWidget(content);
    m_resultList->setObjectName("RailResults");
    m_resultList->setSelectionMode(QAbstractItemView::SingleSelection);
    m_resultList->setUniformItemSizes(false);
    m_resultList->setMinimumHeight(300);
    m_resultList->setSpacing(2);
    layout->addWidget(m_resultList);

    layout->addWidget(makeSectionTitle("Focused Result", content));

    m_matchCard = new QWidget(content);
    m_matchCard->setProperty("class", "RailDetailCard");
    auto *matchCardLayout = new QVBoxLayout(m_matchCard);
    matchCardLayout->setContentsMargins(0, 0, 0, 0);
    matchCardLayout->setSpacing(0);

    m_matchTitle = makeValueLabel(m_matchCard, "RailFileName");
    matchCardLayout->addWidget(m_matchTitle);

    m_matchMeta = makeValueLabel(m_matchCard, "RailLabel");
    matchCardLayout->addWidget(m_matchMeta);

    m_matchPath = makeValueLabel(m_matchCard);
    m_matchPath->setTextInteractionFlags(Qt::TextSelectableByMouse);
    matchCardLayout->addWidget(m_matchPath);

    m_matchExplanation = makeValueLabel(m_matchCard);
    matchCardLayout->addWidget(m_matchExplanation);

    m_matchEvidence = makeValueLabel(m_matchCard, "RailSubtleLabel");
    matchCardLayout->addWidget(m_matchEvidence);

    m_matchBreakdown = makeValueLabel(m_matchCard, "RailSubtleLabel");
    matchCardLayout->addWidget(m_matchBreakdown);

    m_matchTags = makeValueLabel(m_matchCard, "RailPillRow");
    matchCardLayout->addWidget(m_matchTags);

    m_matchSnippet = new QTextEdit(m_matchCard);
    m_matchSnippet->setObjectName("RailSnippet");
    m_matchSnippet->setReadOnly(true);
    m_matchSnippet->setMinimumHeight(180);
    matchCardLayout->addWidget(m_matchSnippet);

    auto *resultActions = new QWidget(m_matchCard);
    auto *resultActionsLayout = new QHBoxLayout(resultActions);
    resultActionsLayout->setContentsMargins(16, 10, 16, 8);
    resultActionsLayout->setSpacing(6);
    m_openResultButton = new QPushButton("Open here", resultActions);
    m_openInNewTabButton = new QPushButton("New tab", resultActions);
    m_revealResultButton = new QPushButton("Locate", resultActions);
    m_copyResultPathButton = new QPushButton("Copy path", resultActions);
    resultActionsLayout->addWidget(m_openResultButton);
    resultActionsLayout->addWidget(m_openInNewTabButton);
    resultActionsLayout->addWidget(m_revealResultButton);
    resultActionsLayout->addWidget(m_copyResultPathButton);
    matchCardLayout->addWidget(resultActions);
    
    layout->addWidget(m_matchCard);

    layout->addWidget(makeSectionTitle("Current Selection", content));

    m_selectionCard = new QWidget(content);
    m_selectionCard->setProperty("class", "RailDetailCard");
    auto *selectionCardLayout = new QVBoxLayout(m_selectionCard);
    selectionCardLayout->setContentsMargins(0, 0, 0, 0);
    selectionCardLayout->setSpacing(0);

    m_selectionTitle = makeValueLabel(m_selectionCard, "RailFileName");
    selectionCardLayout->addWidget(m_selectionTitle);

    m_selectionMeta = makeValueLabel(m_selectionCard, "RailLabel");
    selectionCardLayout->addWidget(m_selectionMeta);

    m_selectionPath = makeValueLabel(m_selectionCard);
    m_selectionPath->setTextInteractionFlags(Qt::TextSelectableByMouse);
    selectionCardLayout->addWidget(m_selectionPath);

    auto *selectionActions = new QWidget(m_selectionCard);
    auto *selectionActionsLayout = new QHBoxLayout(selectionActions);
    selectionActionsLayout->setContentsMargins(16, 10, 16, 8);
    selectionActionsLayout->setSpacing(6);
    m_openSelectionButton = new QPushButton("Open here", selectionActions);
    m_revealSelectionButton = new QPushButton("Reveal", selectionActions);
    m_copySelectionPathButton = new QPushButton("Copy path", selectionActions);
    selectionActionsLayout->addWidget(m_openSelectionButton);
    selectionActionsLayout->addWidget(m_revealSelectionButton);
    selectionActionsLayout->addWidget(m_copySelectionPathButton);
    selectionCardLayout->addWidget(selectionActions);

    layout->addWidget(m_selectionCard);

    layout->addStretch();
    scroll->setWidget(content);
    outerLayout->addWidget(scroll, 1);

    connect(closeButton, &QPushButton::clicked, this, &IxosRail::requestClose);
    connect(m_searchInput, &QLineEdit::returnPressed, this, &IxosRail::triggerSearch);
    connect(m_searchInput, &QLineEdit::textChanged, this, [this]() {
        scheduleLiveSearch();
    });
    connect(m_searchButton, &QPushButton::clicked, this, &IxosRail::triggerSearch);
    connect(m_modeBox, &QComboBox::currentIndexChanged, this, [this]() {
        scheduleLiveSearch();
    });
    connect(m_resultList, &QListWidget::currentRowChanged, this, &IxosRail::handleResultSelection);
    connect(m_resultList, &QListWidget::itemDoubleClicked, this, [this]() {
        const QString path = currentActionPath();
        if (!path.isEmpty()) {
            emit openPathInNewTabRequested(path);
        }
    });

    connect(m_provider, &ISearchProvider::searchStarted, this, [this](const SearchRequest &request) {
        m_results.clear();
        m_selectedResultRow = -1;
        m_showingSemanticResults = false;
        m_searchInFlight = true;
        m_lastSearchFailed = false;
        m_resultList->clear();
        m_searchSummaryLabel->setText(QStringLiteral("Searching \"%1\" in %2")
                                          .arg(request.query, QDir::toNativeSeparators(request.directory)));
        setStatusMessage("Scanning cached results and ranking matches...");
        syncDetailPanel();
    });
    connect(m_provider, &ISearchProvider::searchStateChanged, this, [this](const QString &message, bool isError) {
        m_lastSearchFailed = isError;
        setStatusMessage(message);
    });
    connect(m_provider, &ISearchProvider::lexicalResultsReady, this, [this](const QList<SearchHit> &results) {
        if (!m_showingSemanticResults) {
            renderResults(results, false);
        }
    });
    connect(m_provider, &ISearchProvider::semanticResultsReady, this, [this](const QList<SearchHit> &results) {
        renderResults(results, true);
    });
    connect(m_provider, &ISearchProvider::searchFailed, this, [this](const QString &message) {
        m_searchInFlight = false;
        m_lastSearchFailed = true;
        setStatusMessage(message);
        if (m_results.isEmpty()) {
            m_searchSummaryLabel->setText("Ixos could not finish this search.");
        }
        syncDetailPanel();
    });
    connect(m_provider, &ISearchProvider::searchFinished, this, [this]() {
        m_searchInFlight = false;
        if (m_results.isEmpty()) {
            setStatusMessage("No matches in this folder.");
            m_searchSummaryLabel->setText(QStringLiteral("No matches for \"%1\" in this folder.")
                                              .arg(m_searchInput->text().trimmed()));
        } else {
            setStatusMessage(QString("%1 results ready.").arg(m_results.size()));
            m_searchSummaryLabel->setText(QStringLiteral("%1 %2 results in %3 mode.")
                                              .arg(m_results.size())
                                              .arg(m_showingSemanticResults ? "ranked" : "quick")
                                              .arg(modeLabel()));
        }
        maybeAutoOpenTopResult();
        syncDetailPanel();
    });

    connect(m_openSelectionButton, &QPushButton::clicked, this, [this]() {
        if (m_currentFileInfo.exists()) {
            emit openFileRequested(m_currentFileInfo.absoluteFilePath());
        }
    });
    connect(m_revealSelectionButton, &QPushButton::clicked, this, [this]() {
        if (m_currentFileInfo.exists()) {
            emit revealPathRequested(m_currentFileInfo.absoluteFilePath());
        }
    });
    connect(m_copySelectionPathButton, &QPushButton::clicked, this, [this]() {
        if (m_currentFileInfo.exists()) {
            QApplication::clipboard()->setText(QDir::toNativeSeparators(m_currentFileInfo.absoluteFilePath()));
            setStatusMessage("Copied selection path.");
        }
    });

    connect(m_openResultButton, &QPushButton::clicked, this, [this]() {
        const QString path = currentActionPath();
        if (!path.isEmpty()) {
            emit openFileRequested(path);
        }
    });
    connect(m_openInNewTabButton, &QPushButton::clicked, this, [this]() {
        const QString path = currentActionPath();
        if (!path.isEmpty()) {
            emit openPathInNewTabRequested(path);
        }
    });
    connect(m_revealResultButton, &QPushButton::clicked, this, [this]() {
        const QString path = currentActionPath();
        if (!path.isEmpty()) {
            emit revealPathInWorkspaceRequested(path);
        }
    });
    connect(m_copyResultPathButton, &QPushButton::clicked, this, [this]() {
        const QString path = currentActionPath();
        if (!path.isEmpty()) {
            QApplication::clipboard()->setText(QDir::toNativeSeparators(path));
            setStatusMessage("Copied result path.");
        }
    });

    m_searchSummaryLabel->setText("The top search box runs Ixos search in the current folder.");
    clearDetails();
    setSearchRoot(QDir::homePath());
    m_matchBreakdown->hide();
    m_matchTags->hide();
    m_openResultButton->hide();
    m_copyResultPathButton->hide();
    m_openSelectionButton->hide();
    m_copySelectionPathButton->hide();

    connect(m_liveSearchTimer, &QTimer::timeout, this, [this]() {
        const QString query = m_searchInput->text().trimmed();
        if (query.size() < 2) {
            if (query.isEmpty()) {
                clearSearchSession("Search the current folder with natural language or keywords.");
            }
            return;
        }
        triggerSearch();
    });
}

void IxosRail::setSearchRoot(const QString &path) {
    m_searchRoot = path;
    const QString native = QDir::toNativeSeparators(path);
    const QString folderName = QFileInfo(path).fileName();
    const QString readableFolder = folderName.isEmpty() ? native : folderName;
    m_scopeLabel->setText(QStringLiteral("Searching in %1").arg(native));
    m_searchInput->setPlaceholderText(QStringLiteral("Search %1").arg(readableFolder));
    if (m_searchInput->text().trimmed().isEmpty() && m_results.isEmpty() && !m_searchInFlight) {
        m_searchSummaryLabel->setText(QStringLiteral("Search inside %1 with natural language or keywords.")
                                          .arg(readableFolder));
    }
}

void IxosRail::submitToolbarSearch(const QString &query, int mode) {
    setSearchMode(mode);
    const QString trimmed = query.trimmed();
    const bool blocked = m_searchInput->blockSignals(true);
    m_searchInput->setText(trimmed);
    m_searchInput->blockSignals(blocked);
    m_autoOpenEnabled = true;
    if (trimmed.isEmpty()) {
        clearSearchSession("Search the current folder with natural language or keywords.");
        return;
    }
    triggerSearch();
}

void IxosRail::submitToolbarDraft(const QString &query, int mode) {
    setSearchMode(mode);
    const QString trimmed = query.trimmed();
    const bool blocked = m_searchInput->blockSignals(true);
    m_searchInput->setText(trimmed);
    m_searchInput->blockSignals(blocked);
    m_autoOpenEnabled = true;
    if (trimmed.isEmpty()) {
        clearSearchSession("Search the current folder with natural language or keywords.");
        return;
    }
    scheduleLiveSearch();
}

void IxosRail::showFileDetails(const QFileInfo &info, int selectedCount, quint64 selectedBytes) {
    m_currentFileInfo = info;
    m_selectedCount = selectedCount;
    m_selectedBytes = selectedBytes;

    if (!info.exists()) {
        clearDetails();
        return;
    }

    m_selectionTitle->setText(selectedCount > 1
                                  ? QString("%1 items selected").arg(selectedCount)
                                  : info.fileName());

    QStringList meta;
    meta << (info.isDir() ? "Folder" : "File");
    if (selectedCount > 1) {
        meta << QLocale().formattedDataSize(selectedBytes);
    } else if (info.isFile()) {
        meta << QLocale().formattedDataSize(info.size());
    }
    meta << info.lastModified().toString("yyyy-MM-dd hh:mm");
    m_selectionMeta->setText(meta.join("  "));
    m_selectionPath->setText(QDir::toNativeSeparators(info.absoluteFilePath()));
    syncDetailPanel();
}

void IxosRail::clearDetails() {
    m_currentFileInfo = QFileInfo();
    m_selectedCount = 0;
    m_selectedBytes = 0;
    m_selectionTitle->setText("No selection");
    m_selectionMeta->setText("Browse the workspace or use Ixos search.");
    m_selectionPath->setText(m_searchRoot.isEmpty() ? QString() : QDir::toNativeSeparators(m_searchRoot));
    syncDetailPanel();
}

void IxosRail::setStatusMessage(const QString &message) {
    m_statusMessage = message;
    m_searchStateLabel->setText(message);
}

void IxosRail::setSearchMode(int mode) {
    const int index = m_modeBox->findData(mode);
    if (index >= 0 && index != m_modeBox->currentIndex()) {
        const bool blocked = m_modeBox->blockSignals(true);
        m_modeBox->setCurrentIndex(index);
        m_modeBox->blockSignals(blocked);
    }
}

void IxosRail::focusSearch() {
    m_searchInput->setFocus();
    m_searchInput->selectAll();
}

void IxosRail::triggerSearch() {
    const QString query = m_searchInput->text().trimmed();
    if (query.isEmpty()) {
        clearSearchSession("Type a natural-language query or keywords to search this folder.");
        return;
    }

    m_autoOpenEnabled = true;

    const QString root = m_searchRoot.isEmpty() ? QDir::homePath() : m_searchRoot;
    SearchRequest request;
    request.query = query;
    request.directory = QDir::fromNativeSeparators(root);
    request.mode = static_cast<SearchMode>(m_modeBox->currentData().toInt());
    request.limit = 24;
    request.contextLines = 3;

    emit searchSubmitted(query, static_cast<int>(request.mode));
    m_provider->startSearch(request);
}

void IxosRail::scheduleLiveSearch() {
    const QString query = m_searchInput->text().trimmed();
    if (query.isEmpty()) {
        clearSearchSession("Search the current folder with natural language or keywords.");
        return;
    }
    m_autoOpenEnabled = true;
    m_liveSearchTimer->start();
}

void IxosRail::clearSearchSession(const QString &summary) {
    m_liveSearchTimer->stop();
    m_provider->cancelSearch();
    m_results.clear();
    m_selectedResultRow = -1;
    m_showingSemanticResults = false;
    m_searchInFlight = false;
    m_lastSearchFailed = false;
    m_lastAutoOpenedPath.clear();
    m_lastAutoOpenedQuery.clear();
    m_resultList->clear();
    setStatusMessage("Ixos is ready.");
    m_searchSummaryLabel->setText(summary);
    syncDetailPanel();
}

void IxosRail::renderResults(const QList<SearchHit> &results, bool semanticResults) {
    m_results = results;
    m_showingSemanticResults = semanticResults;
    m_resultList->clear();

    int rank = 1;
    for (const SearchHit &item : results) {
        auto *listItem = new QListWidgetItem();
        auto *card = new SearchResultCard(m_resultList);
        card->setContent(item, semanticResults, relativePathForResult(item), summaryTextForResult(item), rank++);
        listItem->setSizeHint(card->sizeHint());
        m_resultList->addItem(listItem);
        m_resultList->setItemWidget(listItem, card);
    }

    if (!m_results.isEmpty()) {
        m_resultList->setCurrentRow(0);
        setStatusMessage(QString("%1 %2 results ready.")
                             .arg(m_results.size())
                             .arg(semanticResults ? "ranked" : "quick"));
    } else if (!m_searchInput->text().trimmed().isEmpty()) {
        setStatusMessage("No matches in this folder.");
    }

    maybeAutoOpenTopResult();
    syncDetailPanel();
}

void IxosRail::handleResultSelection(int row) {
    m_selectedResultRow = row;

    for (int i = 0; i < m_resultList->count(); ++i) {
        auto *card = dynamic_cast<SearchResultCard *>(m_resultList->itemWidget(m_resultList->item(i)));
        if (card) {
            card->setActive(i == row);
        }
    }

    syncDetailPanel();

    if (row >= 0 && row < m_results.size()) {
        emit autoOpenPathRequested(m_results.at(row).path);
    }
}

void IxosRail::syncDetailPanel() {
    const bool hasResult = m_selectedResultRow >= 0 && m_selectedResultRow < m_results.size();
    const bool hasActiveQuery = !m_searchInput->text().trimmed().isEmpty();
    if (m_matchCard) {
        m_matchCard->setVisible(hasActiveQuery || hasResult || m_searchInFlight);
    }
    if (m_selectionCard) {
        m_selectionCard->setVisible(!hasActiveQuery && !hasResult);
    }

    if (!hasResult) {
        m_matchTitle->setText(m_searchInput->text().trimmed().isEmpty()
                                  ? "Search this folder"
                                  : "Select a result");
        m_matchMeta->setText(m_searchInput->text().trimmed().isEmpty()
                                 ? "The top search box runs Ixos search in the current folder."
                                 : (m_lastSearchFailed ? "Search did not complete cleanly." : m_statusMessage));
        m_matchPath->clear();
        m_matchExplanation->setText(m_results.isEmpty()
                                        ? "Ixos will show the strongest files first and keep the center pane synced."
                                        : "Select a result to update the center pane and inspect its strongest evidence.");
        m_matchEvidence->clear();
        m_matchBreakdown->clear();
        m_matchTags->clear();
        m_matchSnippet->clear();
        m_matchBreakdown->hide();
        m_matchTags->hide();
        updateActionStates();
        return;
    }

    const SearchHit &item = m_results.at(m_selectedResultRow);
    m_matchTitle->setText(item.filename);
    m_matchMeta->setText(QString("%1  %2  %3")
                             .arg(formatScore(item.score),
                                  m_showingSemanticResults ? "ranked result" : "quick result",
                                  item.integrityVerified ? "verified" : "unverified"));
    m_matchPath->setText(QDir::toNativeSeparators(item.path));

    QString explanation = item.hasEvidence ? item.evidence.explanation : QString();
    if (explanation.isEmpty()) {
        explanation = m_showingSemanticResults
                          ? "Ixos promoted this file after semantic ranking and secure scoring."
                          : "Ixos found this as a fast lexical match while the ranked pass completed.";
    }
    m_matchExplanation->setText(explanation);
    m_matchEvidence->setText(evidenceTextForResult(item));
    m_matchBreakdown->setText(QString());

    QStringList tags;
    if (item.hasEvidence) {
        tags << item.evidence.tags;
        tags << item.evidence.pathTags;
    }
    if (tags.isEmpty()) {
        tags << (item.isLexical ? "quick pass" : "semantic pass");
    }
    m_matchTags->setText(tags.join("   "));
    m_matchSnippet->setPlainText(detailTextForResult(item));
    m_matchBreakdown->hide();
    m_matchTags->hide();
    updateActionStates();
}

void IxosRail::updateActionStates() {
    const bool hasResult = m_selectedResultRow >= 0 && m_selectedResultRow < m_results.size();
    const bool hasSelection = m_currentFileInfo.exists();

    m_openResultButton->setEnabled(hasResult);
    m_openInNewTabButton->setEnabled(hasResult);
    m_revealResultButton->setEnabled(hasResult);
    m_copyResultPathButton->setEnabled(hasResult);

    m_openSelectionButton->setEnabled(hasSelection);
    m_revealSelectionButton->setEnabled(hasSelection);
    m_copySelectionPathButton->setEnabled(hasSelection);
}

QString IxosRail::currentActionPath() const {
    if (m_selectedResultRow >= 0 && m_selectedResultRow < m_results.size()) {
        return m_results.at(m_selectedResultRow).path;
    }

    if (m_currentFileInfo.exists()) {
        return m_currentFileInfo.absoluteFilePath();
    }

    return QString();
}

QString IxosRail::modeLabel() const {
    return m_modeBox->currentText().toLower();
}

QString IxosRail::detailTextForResult(const SearchHit &item) const {
    if (item.hasContext) {
        QStringList lines;
        int lineNumber = qMax(1, item.context.lineNumber - item.context.before.size());
        for (const QString &line : item.context.before) {
            lines << QString::number(lineNumber++) + "  " + line;
        }
        for (const QString &line : item.context.matched) {
            lines << QString::number(lineNumber++) + "  " + line;
        }
        for (const QString &line : item.context.after) {
            lines << QString::number(lineNumber++) + "  " + line;
        }
        return lines.join('\n');
    }

    if (item.hasEvidence && !item.evidence.semanticPassage.isEmpty()) {
        return item.evidence.semanticPassage;
    }

    return item.snippet;
}

QString IxosRail::summaryTextForResult(const SearchHit &item) const {
    const QString detail = detailTextForResult(item);
    if (detail.isEmpty()) {
        return item.hasEvidence && !item.evidence.explanation.isEmpty()
                   ? item.evidence.explanation
                   : QStringLiteral("No preview available.");
    }

    return trimmedLine(detail.left(120));
}

QString IxosRail::evidenceTextForResult(const SearchHit &item) const {
    QStringList parts;
    if (item.hasEvidence && item.evidence.lexicalHitCount >= 0) {
        parts << QStringLiteral("%1 lexical hits").arg(item.evidence.lexicalHitCount);
    }
    if (item.hasEvidence && !item.evidence.fileType.isEmpty()) {
        parts << item.evidence.fileType;
    }
    if (item.hasEvidence && !item.evidence.matchedTerms.isEmpty()) {
        parts << QStringLiteral("Matched: %1").arg(item.evidence.matchedTerms.join(", "));
    }
    return parts.join("  ");
}

QString IxosRail::breakdownTextForResult(const SearchHit &item) const {
    if (!item.hasScoreBreakdown) {
        return QString();
    }

    return QStringLiteral("Score mix: semantic %1  integrity %2  temporal %3  behavior %4  personal %5")
        .arg(QString::number(item.scoreBreakdown.semantic, 'f', 2),
             QString::number(item.scoreBreakdown.integrity, 'f', 2),
             QString::number(item.scoreBreakdown.temporal, 'f', 2),
             QString::number(item.scoreBreakdown.behavior, 'f', 2),
             QString::number(item.scoreBreakdown.personal, 'f', 2));
}

QString IxosRail::relativePathForResult(const SearchHit &item) const {
    QDir root(QDir::fromNativeSeparators(m_searchRoot));
    const QString relative = root.relativeFilePath(QDir::fromNativeSeparators(item.path));
    if (relative.startsWith("..")) {
        return QDir::toNativeSeparators(item.path);
    }
    return QDir::toNativeSeparators(relative);
}

void IxosRail::maybeAutoOpenTopResult() {
    if (!m_autoOpenEnabled || m_results.isEmpty()) {
        return;
    }

    const QString currentQuery = m_searchInput->text().trimmed();
    const SearchHit &top = m_results.first();
    if (top.path.isEmpty()) {
        return;
    }

    if (m_lastAutoOpenedQuery == currentQuery && m_lastAutoOpenedPath == top.path) {
        return;
    }

    m_lastAutoOpenedQuery = currentQuery;
    m_lastAutoOpenedPath = top.path;
    emit autoOpenPathRequested(top.path);
}

} // namespace Ixplorer
