#include "widgets/CommandPalette.h"

#include <QEvent>
#include <QHBoxLayout>
#include <QKeyEvent>
#include <QLabel>
#include <QListWidgetItem>
#include <QVBoxLayout>

namespace Ixplorer {

namespace {

QString haystackFor(const CommandPaletteItem &item) {
    return QStringLiteral("%1 %2 %3")
        .arg(item.title, item.subtitle, item.keywords)
        .toLower();
}

} // namespace

CommandPalette::CommandPalette(QWidget *parent)
    : QDialog(parent)
    , m_input(new QLineEdit(this))
    , m_list(new QListWidget(this)) {
    setObjectName("CommandPalette");
    setModal(true);
    setWindowFlag(Qt::FramelessWindowHint, true);
    setFixedSize(640, 420);

    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(18, 18, 18, 18);
    layout->setSpacing(12);

    auto *title = new QLabel(QStringLiteral("Command Palette"), this);
    title->setObjectName("CommandPaletteTitle");
    layout->addWidget(title);

    m_input->setObjectName("CommandPaletteInput");
    m_input->setPlaceholderText(QStringLiteral("Search actions or type a query for Ixos"));
    layout->addWidget(m_input);

    m_list->setObjectName("CommandPaletteList");
    m_list->setSelectionMode(QAbstractItemView::SingleSelection);
    m_list->setVerticalScrollMode(QAbstractItemView::ScrollPerPixel);
    layout->addWidget(m_list, 1);

    connect(m_input, &QLineEdit::textChanged, this, [this]() {
        rebuildList();
    });
    connect(m_input, &QLineEdit::returnPressed, this, &CommandPalette::triggerCurrent);
    connect(m_list, &QListWidget::itemDoubleClicked, this, [this]() {
        triggerCurrent();
    });

    m_input->installEventFilter(this);
    m_list->installEventFilter(this);
}

void CommandPalette::setCommands(const QVector<CommandPaletteItem> &commands) {
    m_commands = commands;
    m_input->clear();
    rebuildList();
    m_input->setFocus();
}

void CommandPalette::rebuildList() {
    const QString query = m_input->text().trimmed();
    const QString lowered = query.toLower();

    m_list->clear();

    if (!query.isEmpty()) {
        auto *item = new QListWidgetItem(QStringLiteral("Search \"%1\"").arg(query), m_list);
        item->setData(Qt::UserRole, QStringLiteral("__search__"));
        item->setToolTip(QStringLiteral("Run Ixos search in the current workspace"));
    }

    for (const auto &command : m_commands) {
        if (!lowered.isEmpty() && !haystackFor(command).contains(lowered)) {
            continue;
        }

        auto *item = new QListWidgetItem(QStringLiteral("%1\n%2").arg(command.title, command.subtitle), m_list);
        item->setData(Qt::UserRole, command.id);
        item->setToolTip(command.subtitle);
    }

    if (m_list->count() == 0) {
        auto *item = new QListWidgetItem(QStringLiteral("No matching commands"), m_list);
        item->setFlags(item->flags() & ~Qt::ItemIsSelectable & ~Qt::ItemIsEnabled);
    } else {
        m_list->setCurrentRow(0);
    }
}

void CommandPalette::triggerCurrent() {
    auto *item = m_list->currentItem();
    if (!item || !(item->flags() & Qt::ItemIsSelectable)) {
        return;
    }

    const QString id = item->data(Qt::UserRole).toString();
    if (id == QStringLiteral("__search__")) {
        emit searchRequested(m_input->text().trimmed());
    } else if (!id.isEmpty()) {
        emit commandTriggered(id);
    }
    accept();
}

bool CommandPalette::eventFilter(QObject *watched, QEvent *event) {
    if (event->type() == QEvent::KeyPress) {
        auto *keyEvent = static_cast<QKeyEvent *>(event);
        if (watched == m_input) {
            if (keyEvent->key() == Qt::Key_Down) {
                m_list->setFocus();
                m_list->setCurrentRow(qMin(m_list->count() - 1, qMax(0, m_list->currentRow() + 1)));
                return true;
            }
        } else if (watched == m_list) {
            if (keyEvent->key() == Qt::Key_Up && m_list->currentRow() <= 0) {
                m_input->setFocus();
                return true;
            }
            if (keyEvent->key() == Qt::Key_Return || keyEvent->key() == Qt::Key_Enter) {
                triggerCurrent();
                return true;
            }
        }
    }

    return QDialog::eventFilter(watched, event);
}

} // namespace Ixplorer
