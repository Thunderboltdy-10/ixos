#include "widgets/IxosRail.h"
#include "widgets/SearchResultCard.h"
#include "theme/IconFont.h"

#include <QDir>
#include <QHBoxLayout>
#include <QVBoxLayout>
#include <QListWidgetItem>
#include <QScrollArea>
#include <QStyle>
#include <QTextEdit>

namespace Ixplorer {

IxosRail::IxosRail(QWidget *parent)
    : QWidget(parent)
    , m_provider(new IxosCliSearchProvider(this))
    , m_liveSearchTimer(new QTimer(this)) {
    setObjectName("IxosRail");
    setMinimumWidth(340);
    m_liveSearchTimer->setSingleShot(true);
    m_liveSearchTimer->setInterval(260);

    auto *mainLayout = new QHBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->setSpacing(0);

    auto *leftContainer = new QWidget(this);
    auto *outerLayout = new QVBoxLayout(leftContainer);
    outerLayout->setContentsMargins(0, 0, 0, 0);
    outerLayout->setSpacing(0);

    auto *header = new QWidget(leftContainer);
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
    outerLayout->addWidget(header);

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

    outerLayout->addWidget(searchContainer);

    m_resultList = new QListWidget(this);
    m_resultList->setObjectName("RailResults");
    m_resultList->setSelectionMode(QAbstractItemView::SingleSelection);
    m_resultList->setUniformItemSizes(true);
    m_resultList->setSpacing(2);
    outerLayout->addWidget(m_resultList, 1);
    
    mainLayout->addWidget(leftContainer, 1);
    
    m_detailPane = new QWidget(this);
    m_detailPane->setObjectName("RailDetailPane");
    m_detailPane->setFixedWidth(280);
    m_detailPane->hide();
    auto *detailLayout = new QVBoxLayout(m_detailPane);
    detailLayout->setContentsMargins(16, 16, 16, 16);
    detailLayout->setSpacing(8);
    
    auto *detailTitle = new QLabel("Match Details", m_detailPane);
    detailTitle->setObjectName("RailHeaderTitle");
    detailTitle->setStyleSheet("color: #E8A317; font-weight: bold; font-size: 13px;");
    detailLayout->addWidget(detailTitle);
    
    m_detailText = new QTextEdit(m_detailPane);
    m_detailText->setObjectName("RailDetailText");
    m_detailText->setReadOnly(true);
    m_detailText->setStyleSheet("background: transparent; border: none; color: #A1A1A6; font-size: 12px;");
    detailLayout->addWidget(m_detailText, 1);
    
    mainLayout->addWidget(m_detailPane);

    connect(closeButton, &QPushButton::clicked, this, &IxosRail::requestClose);
    connect(m_searchInput, &QLineEdit::returnPressed, this, &IxosRail::triggerSearch);
    connect(m_searchInput, &QLineEdit::textChanged, this, [this]() {
        scheduleLiveSearch();
    });
    connect(m_resultList, &QListWidget::currentRowChanged, this, &IxosRail::handleResultSelection);
    connect(m_resultList, &QListWidget::itemDoubleClicked, this, &IxosRail::handleResultDoubleClicked);

    connect(m_provider, &ISearchProvider::searchStarted, this, [this](const SearchRequest &) {
        m_results.clear();
        m_showingSemanticResults = false;
        m_resultList->clear();
        setStatusMessage("Searching...");
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
        setStatusMessage(message);
    });
    connect(m_provider, &ISearchProvider::searchFinished, this, [this]() {
        if (m_results.isEmpty()) {
            setStatusMessage("No matches in this folder.");
        } else {
            setStatusMessage(QString("%1 results ready.").arg(m_results.size()));
            emit autoOpenPathRequested(m_results.first().path);
        }
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

void IxosRail::showFileDetails(const QFileInfo &, int, quint64) {
}

void IxosRail::clearDetails() {
}

void IxosRail::setStatusMessage(const QString &message) {
    m_statusMessage = message;
    m_searchStateLabel->setText(message);
}

void IxosRail::setSearchMode(int) {
}

void IxosRail::focusSearch() {
    m_searchInput->setFocus();
    m_searchInput->selectAll();
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
    request.mode = SearchMode::Auto; // Always search with SearchMode::Auto
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
    m_resultList->clear();
    setStatusMessage(summary);
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
        setStatusMessage(QString("%1 results ready.").arg(m_results.size()));
    } else if (!m_searchInput->text().trimmed().isEmpty()) {
        setStatusMessage("No matches in this folder.");
    }
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
        
        if (hit.hasEvidence || hit.hasScoreBreakdown) {
            QString html = "<div style='line-height: 1.4;'>";
            if (hit.hasScoreBreakdown) {
                int percentage = static_cast<int>(hit.score * 100);
                html += QString("<b>Match Certainty:</b> %1%<br><br>").arg(percentage);
                html += QString("<b>Semantic:</b> %1<br>").arg(hit.scoreBreakdown.semantic, 0, 'f', 2);
                html += QString("<b>Integrity:</b> %1<br>").arg(hit.scoreBreakdown.integrity, 0, 'f', 2);
            }
            if (hit.hasEvidence) {
                html += "<br><b>Explanation:</b><br>" + hit.evidence.explanation + "<br><br>";
                if (!hit.evidence.matchedTerms.isEmpty()) {
                    html += "<b>Terms:</b> " + hit.evidence.matchedTerms.join(", ") + "<br>";
                }
            }
            html += "</div>";
            m_detailText->setHtml(html);
            m_detailPane->show();
        } else {
            m_detailPane->hide();
        }

        // Single-click opens in current pane
        emit openFileRequested(hit.path);
    }
}

void IxosRail::handleResultDoubleClicked(QListWidgetItem *item) {
    int row = m_resultList->row(item);
    if (row >= 0 && row < m_results.size()) {
        // Double-click opens new tab
        emit openPathInNewTabRequested(m_results.at(row).path);
    }
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
