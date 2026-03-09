#include "widgets/IxosRail.h"

#include <QFileIconProvider>
#include <QLocale>
#include <QScrollArea>
#include <QVBoxLayout>

namespace Ixplorer {

static QLabel *makeSectionTitle(const QString &text, QWidget *parent) {
    auto *label = new QLabel(text, parent);
    label->setObjectName("RailSectionTitle");
    return label;
}

static QLabel *makePlaceholder(const QString &text, QWidget *parent) {
    auto *label = new QLabel(text, parent);
    label->setObjectName("RailPlaceholder");
    label->setWordWrap(true);
    return label;
}

static QLabel *makeValueLabel(QWidget *parent) {
    auto *label = new QLabel(parent);
    label->setObjectName("RailValueLabel");
    label->setWordWrap(true);
    return label;
}

static QLabel *makeFieldLabel(const QString &text, QWidget *parent) {
    auto *label = new QLabel(text, parent);
    label->setObjectName("RailLabel");
    return label;
}

IxosRail::IxosRail(QWidget *parent)
    : QWidget(parent) {
    setObjectName("IxosRail");
    setMinimumWidth(200);

    auto *outerLayout = new QVBoxLayout(this);
    outerLayout->setContentsMargins(0, 0, 0, 0);
    outerLayout->setSpacing(0);

    auto *scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    auto *content = new QWidget(scroll);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(0, 8, 0, 16);
    layout->setSpacing(0);

    // -- File Details section --
    layout->addWidget(makeSectionTitle("FILE DETAILS", content));

    m_fileIcon = new QLabel(content);
    m_fileIcon->setObjectName("RailValueLabel");
    m_fileIcon->setAlignment(Qt::AlignCenter);
    m_fileIcon->setFixedHeight(48);
    layout->addWidget(m_fileIcon);

    m_fileName = makeValueLabel(content);
    m_fileName->setAlignment(Qt::AlignCenter);
    layout->addWidget(m_fileName);
    layout->addSpacing(8);

    layout->addWidget(makeFieldLabel("Size", content));
    m_fileSize = makeValueLabel(content);
    layout->addWidget(m_fileSize);

    layout->addWidget(makeFieldLabel("Modified", content));
    m_fileModified = makeValueLabel(content);
    layout->addWidget(m_fileModified);

    layout->addWidget(makeFieldLabel("Type", content));
    m_fileType = makeValueLabel(content);
    layout->addWidget(m_fileType);
    layout->addSpacing(16);

    // -- Ixos Search section --
    layout->addWidget(makeSectionTitle("IXOS SEARCH", content));
    m_searchInput = new QLineEdit(content);
    m_searchInput->setObjectName("SearchField");
    m_searchInput->setPlaceholderText("Semantic search...");
    m_searchInput->setEnabled(false);
    m_searchInput->setToolTip("Coming soon");
    m_searchInput->setFixedWidth(248);
    auto *searchWrapper = new QWidget(content);
    auto *sw = new QVBoxLayout(searchWrapper);
    sw->setContentsMargins(16, 4, 16, 4);
    sw->addWidget(m_searchInput);
    layout->addWidget(searchWrapper);
    layout->addSpacing(16);

    // -- Related Files section --
    layout->addWidget(makeSectionTitle("RELATED FILES", content));
    m_relatedPlaceholder = makePlaceholder("Select a file to see related items", content);
    layout->addWidget(m_relatedPlaceholder);
    layout->addSpacing(16);

    // -- Context section --
    layout->addWidget(makeSectionTitle("CONTEXT", content));
    m_contextPlaceholder = makePlaceholder("File context will appear here", content);
    layout->addWidget(m_contextPlaceholder);
    layout->addSpacing(16);

    // -- Quick Actions section --
    layout->addWidget(makeSectionTitle("QUICK ACTIONS", content));
    m_actionsPlaceholder = makePlaceholder("Actions coming soon", content);
    layout->addWidget(m_actionsPlaceholder);

    layout->addStretch();
    scroll->setWidget(content);
    outerLayout->addWidget(scroll);

    clearDetails();
}

void IxosRail::showFileDetails(const QFileInfo &info) {
    // Icon
    QFileIconProvider iconProvider;
    QIcon icon = iconProvider.icon(info);
    m_fileIcon->setPixmap(icon.pixmap(32, 32));

    // Name
    m_fileName->setText(info.fileName());

    // Size
    if (info.isDir()) {
        m_fileSize->setText("Folder");
    } else {
        QLocale locale;
        m_fileSize->setText(locale.formattedDataSize(info.size()));
    }

    // Modified
    m_fileModified->setText(info.lastModified().toString("yyyy-MM-dd hh:mm"));

    // Type
    if (info.isDir()) {
        m_fileType->setText("Folder");
    } else {
        QString suffix = info.suffix().toUpper();
        m_fileType->setText(suffix.isEmpty() ? "File" : suffix + " File");
    }
}

void IxosRail::clearDetails() {
    m_fileIcon->clear();
    m_fileName->setText("No file selected");
    m_fileSize->setText("-");
    m_fileModified->setText("-");
    m_fileType->setText("-");
}

} // namespace Ixplorer
