#include "widgets/IxosRail.h"

#include <QFileIconProvider>
#include <QFrame>
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

static QFrame *makeDivider(QWidget *parent) {
    auto *line = new QFrame(parent);
    line->setObjectName("RailDivider");
    line->setFrameShape(QFrame::HLine);
    line->setFrameShadow(QFrame::Plain);
    return line;
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
    layout->setContentsMargins(0, 12, 0, 16);
    layout->setSpacing(0);

    // -- File Details section --
    m_fileIcon = new QLabel(content);
    m_fileIcon->setObjectName("RailValueLabel");
    m_fileIcon->setAlignment(Qt::AlignCenter);
    m_fileIcon->setFixedHeight(64);
    layout->addWidget(m_fileIcon);

    m_fileName = new QLabel(content);
    m_fileName->setObjectName("RailFileName");
    m_fileName->setAlignment(Qt::AlignCenter);
    m_fileName->setWordWrap(true);
    layout->addWidget(m_fileName);

    layout->addSpacing(4);
    layout->addWidget(makeDivider(content));

    layout->addWidget(makeFieldLabel("Size", content));
    m_fileSize = makeValueLabel(content);
    layout->addWidget(m_fileSize);

    layout->addWidget(makeFieldLabel("Modified", content));
    m_fileModified = makeValueLabel(content);
    layout->addWidget(m_fileModified);

    layout->addWidget(makeFieldLabel("Type", content));
    m_fileType = makeValueLabel(content);
    layout->addWidget(m_fileType);

    layout->addWidget(makeDivider(content));

    // -- Ixos Search section --
    layout->addWidget(makeSectionTitle("Ixos Search", content));
    m_searchInput = new QLineEdit(content);
    m_searchInput->setObjectName("SearchField");
    m_searchInput->setPlaceholderText("Semantic search...");
    m_searchInput->setEnabled(false);
    m_searchInput->setToolTip("Coming soon");
    auto *searchWrapper = new QWidget(content);
    auto *sw = new QVBoxLayout(searchWrapper);
    sw->setContentsMargins(16, 4, 16, 8);
    sw->addWidget(m_searchInput);
    layout->addWidget(searchWrapper);

    layout->addWidget(makeDivider(content));

    // -- Related Files section --
    layout->addWidget(makeSectionTitle("Related Files", content));
    m_relatedPlaceholder = makePlaceholder("Select a file to see related items", content);
    layout->addWidget(m_relatedPlaceholder);

    layout->addWidget(makeDivider(content));

    // -- Context section --
    layout->addWidget(makeSectionTitle("Context", content));
    m_contextPlaceholder = makePlaceholder("File context will appear here", content);
    layout->addWidget(m_contextPlaceholder);

    layout->addWidget(makeDivider(content));

    // -- Quick Actions section --
    layout->addWidget(makeSectionTitle("Quick Actions", content));
    m_actionsPlaceholder = makePlaceholder("Actions coming soon", content);
    layout->addWidget(m_actionsPlaceholder);

    layout->addStretch();
    scroll->setWidget(content);
    outerLayout->addWidget(scroll);

    clearDetails();
}

void IxosRail::showFileDetails(const QFileInfo &info) {
    QFileIconProvider iconProvider;
    QIcon icon = iconProvider.icon(info);
    m_fileIcon->setPixmap(icon.pixmap(48, 48));

    m_fileName->setText(info.fileName());

    if (info.isDir()) {
        m_fileSize->setText("Folder");
    } else {
        QLocale locale;
        m_fileSize->setText(locale.formattedDataSize(info.size()));
    }

    m_fileModified->setText(info.lastModified().toString("yyyy-MM-dd hh:mm"));

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
    m_fileSize->setText("\xe2\x80\x94");
    m_fileModified->setText("\xe2\x80\x94");
    m_fileType->setText("\xe2\x80\x94");
}

} // namespace Ixplorer
