#include "widgets/IxosRail.h"

#include <QApplication>
#include <QClipboard>
#include <QDir>
#include <QFrame>
#include <QHBoxLayout>
#include <QListWidgetItem>
#include <QLocale>
#include <QScrollArea>
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

} // namespace

IxosRail::IxosRail(QWidget *parent)
    : QWidget(parent)
    , m_provider(new IxosCliSearchProvider(this)) {
    setObjectName("IxosRail");
    setMinimumWidth(300);

    auto *outerLayout = new QVBoxLayout(this);
    outerLayout->setContentsMargins(0, 0, 0, 0);
    outerLayout->setSpacing(0);

    auto *scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    auto *content = new QWidget(scroll);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(0, 12, 0, 16);
    layout->setSpacing(0);

    layout->addWidget(makeSectionTitle("Selection", content));
    m_selectionTitle = makeValueLabel(content, "RailFileName");
    layout->addWidget(m_selectionTitle);
    m_selectionMeta = makeValueLabel(content, "RailLabel");
    layout->addWidget(m_selectionMeta);
    m_selectionPath = makeValueLabel(content);
    m_selectionPath->setTextInteractionFlags(Qt::TextSelectableByMouse);
    layout->addWidget(m_selectionPath);

    auto *selectionActions = new QWidget(content);
    auto *selectionActionsLayout = new QHBoxLayout(selectionActions);
    selectionActionsLayout->setContentsMargins(16, 8, 16, 8);
    selectionActionsLayout->setSpacing(6);
    m_openSelectionButton = new QPushButton("Open", selectionActions);
    m_revealSelectionButton = new QPushButton("Reveal", selectionActions);
    m_copySelectionPathButton = new QPushButton("Copy path", selectionActions);
    selectionActionsLayout->addWidget(m_openSelectionButton);
    selectionActionsLayout->addWidget(m_revealSelectionButton);
    selectionActionsLayout->addWidget(m_copySelectionPathButton);
    layout->addWidget(selectionActions);

    layout->addWidget(makeDivider(content));
    layout->addWidget(makeSectionTitle("Ixos Search", content));

    auto *searchControls = new QWidget(content);
    auto *searchLayout = new QHBoxLayout(searchControls);
    searchLayout->setContentsMargins(16, 6, 16, 8);
    searchLayout->setSpacing(6);
    m_searchInput = new QLineEdit(searchControls);
    m_searchInput->setObjectName("SearchField");
    m_searchInput->setPlaceholderText("Search this folder");
    m_searchInput->setClearButtonEnabled(true);
    m_modeBox = new QComboBox(searchControls);
    m_modeBox->setObjectName("ToolbarCombo");
    m_modeBox->addItem("Auto", static_cast<int>(SearchMode::Auto));
    m_modeBox->addItem("Fast", static_cast<int>(SearchMode::Fast));
    m_modeBox->addItem("Accurate", static_cast<int>(SearchMode::Accurate));
    m_searchButton = new QPushButton("Search", searchControls);
    searchLayout->addWidget(m_searchInput, 1);
    searchLayout->addWidget(m_modeBox);
    searchLayout->addWidget(m_searchButton);
    layout->addWidget(searchControls);

    m_searchStateLabel = makeValueLabel(content, "RailStatus");
    layout->addWidget(m_searchStateLabel);

    m_resultList = new QListWidget(content);
    m_resultList->setObjectName("RailResults");
    m_resultList->setSelectionMode(QAbstractItemView::SingleSelection);
    m_resultList->setUniformItemSizes(false);
    m_resultList->setMinimumHeight(240);
    layout->addWidget(m_resultList);

    layout->addWidget(makeDivider(content));
    layout->addWidget(makeSectionTitle("About Match", content));

    m_matchTitle = makeValueLabel(content, "RailFileName");
    layout->addWidget(m_matchTitle);
    m_matchMeta = makeValueLabel(content, "RailLabel");
    layout->addWidget(m_matchMeta);
    m_matchPath = makeValueLabel(content);
    m_matchPath->setTextInteractionFlags(Qt::TextSelectableByMouse);
    layout->addWidget(m_matchPath);
    m_matchExplanation = makeValueLabel(content);
    layout->addWidget(m_matchExplanation);
    m_matchTags = makeValueLabel(content, "RailPillRow");
    layout->addWidget(m_matchTags);

    m_matchSnippet = new QTextEdit(content);
    m_matchSnippet->setObjectName("RailSnippet");
    m_matchSnippet->setReadOnly(true);
    m_matchSnippet->setMinimumHeight(140);
    layout->addWidget(m_matchSnippet);

    auto *resultActions = new QWidget(content);
    auto *resultActionsLayout = new QHBoxLayout(resultActions);
    resultActionsLayout->setContentsMargins(16, 8, 16, 8);
    resultActionsLayout->setSpacing(6);
    m_openResultButton = new QPushButton("Open", resultActions);
    m_openInNewTabButton = new QPushButton("Open in tab", resultActions);
    m_revealResultButton = new QPushButton("Reveal", resultActions);
    m_copyResultPathButton = new QPushButton("Copy path", resultActions);
    resultActionsLayout->addWidget(m_openResultButton);
    resultActionsLayout->addWidget(m_openInNewTabButton);
    resultActionsLayout->addWidget(m_revealResultButton);
    resultActionsLayout->addWidget(m_copyResultPathButton);
    layout->addWidget(resultActions);

    layout->addStretch();
    scroll->setWidget(content);
    outerLayout->addWidget(scroll);

    connect(m_searchInput, &QLineEdit::returnPressed, this, &IxosRail::triggerSearch);
    connect(m_searchButton, &QPushButton::clicked, this, &IxosRail::triggerSearch);
    connect(m_resultList, &QListWidget::currentRowChanged, this, &IxosRail::handleResultSelection);
    connect(m_resultList, &QListWidget::itemDoubleClicked, this, [this]() {
        const QString path = currentActionPath();
        if (!path.isEmpty()) {
            emit openFileRequested(path);
        }
    });

    connect(m_provider, &ISearchProvider::searchStarted, this, [this](const SearchRequest &) {
        m_results.clear();
        m_selectedResultRow = -1;
        m_showingSemanticResults = false;
        m_searchInFlight = true;
        m_resultList->clear();
        setStatusMessage("Scanning and ranking...");
        syncDetailPanel();
    });
    connect(m_provider, &ISearchProvider::searchStateChanged, this, [this](const QString &message, bool) {
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
        setStatusMessage(message);
        syncDetailPanel();
    });
    connect(m_provider, &ISearchProvider::searchFinished, this, [this]() {
        m_searchInFlight = false;
        if (m_results.isEmpty() && !m_searchInput->text().trimmed().isEmpty()) {
            setStatusMessage("No matches in this folder.");
        } else if (!m_results.isEmpty()) {
            setStatusMessage(QString("%1 results in %2 mode.")
                                 .arg(m_results.size())
                                 .arg(modeLabel()));
        }
    });

    connect(m_openSelectionButton, &QPushButton::clicked, this, [this]() {
        const QString path = currentActionPath();
        if (!path.isEmpty()) {
            emit openFileRequested(path);
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

    clearDetails();
}

void IxosRail::setSearchRoot(const QString &path) {
    m_searchRoot = path;
    m_searchInput->setPlaceholderText("Search this folder");
}

void IxosRail::submitToolbarSearch(const QString &query) {
    m_searchInput->setText(query.trimmed());
    triggerSearch();
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
    m_selectionMeta->setText("Browse the workspace or run a search.");
    m_selectionPath->setText(m_searchRoot.isEmpty() ? QString() : QDir::toNativeSeparators(m_searchRoot));
    syncDetailPanel();
}

void IxosRail::setStatusMessage(const QString &message) {
    m_statusMessage = message;
    m_searchStateLabel->setText(message);
}

void IxosRail::triggerSearch() {
    const QString query = m_searchInput->text().trimmed();
    if (query.isEmpty()) {
        setStatusMessage("Enter a query to search the current folder.");
        return;
    }

    const QString root = m_searchRoot.isEmpty() ? QDir::homePath() : m_searchRoot;
    SearchRequest request;
    request.query = query;
    request.directory = QDir::fromNativeSeparators(root);
    request.mode = static_cast<SearchMode>(m_modeBox->currentData().toInt());
    request.limit = 24;
    request.contextLines = 3;
    m_provider->startSearch(request);
}

void IxosRail::renderResults(const QList<SearchHit> &results, bool semanticResults) {
    m_results = results;
    m_showingSemanticResults = semanticResults;
    m_resultList->clear();

    for (const SearchHit &item : results) {
        QStringList lines;
        lines << item.filename;
        lines << QDir::toNativeSeparators(item.directory);
        const QString detail = detailTextForResult(item).simplified();
        if (!detail.isEmpty()) {
            lines << detail;
        }

        auto *listItem = new QListWidgetItem(lines.join("\n"), m_resultList);
        listItem->setToolTip(QDir::toNativeSeparators(item.path));
    }

    if (!m_results.isEmpty()) {
        m_resultList->setCurrentRow(0);
        setStatusMessage(QString("%1 %2 results.")
                             .arg(m_results.size())
                             .arg(semanticResults ? "ranked" : "quick"));
    } else {
        syncDetailPanel();
    }
}

void IxosRail::handleResultSelection(int row) {
    m_selectedResultRow = row;
    syncDetailPanel();
}

void IxosRail::syncDetailPanel() {
    const bool hasResult = m_selectedResultRow >= 0 && m_selectedResultRow < m_results.size();
    if (!hasResult) {
        m_matchTitle->setText("Select a search result");
        m_matchMeta->setText(m_searchInput->text().trimmed().isEmpty()
                                 ? "Ixos search stays ready on the right while you browse."
                                 : m_statusMessage);
        m_matchPath->clear();
        m_matchExplanation->clear();
        m_matchTags->clear();
        m_matchSnippet->clear();
        return;
    }

    const SearchHit &item = m_results.at(m_selectedResultRow);
    m_matchTitle->setText(item.filename);
    m_matchMeta->setText(QString("%1  %2")
                             .arg(formatScore(item.score))
                             .arg(m_showingSemanticResults ? "semantic" : "quick"));
    m_matchPath->setText(QDir::toNativeSeparators(item.path));

    QString explanation = item.hasEvidence ? item.evidence.explanation : QString();
    if (explanation.isEmpty()) {
        explanation = m_showingSemanticResults
            ? "Ranked by semantic similarity and secure scoring."
            : "Quick lexical hit while Ixos refines the result set.";
    }
    m_matchExplanation->setText(explanation);

    QStringList tags;
    if (item.hasEvidence) {
        tags << item.evidence.tags;
        tags << item.evidence.pathTags;
    }
    if (item.hasScoreBreakdown) {
        tags << QString("semantic %1").arg(QString::number(item.scoreBreakdown.semantic, 'f', 2));
    }
    m_matchTags->setText(tags.join("   "));
    m_matchSnippet->setPlainText(detailTextForResult(item));
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
        int lineNumber = item.context.lineNumber - item.context.before.size();
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

} // namespace Ixplorer
