#include "widgets/CommandPalette.h"
#include "utils/FuzzyMatch.h"

#include <QEvent>
#include <QHBoxLayout>
#include <QKeyEvent>
#include <QLabel>
#include <QListWidgetItem>
#include <QVBoxLayout>
#include <QSettings>
#include <QPropertyAnimation>
#include <QGraphicsOpacityEffect>
#include <QShowEvent>
#include <algorithm>

namespace Ixplorer {

namespace {

QString haystackFor(const CommandPaletteItem &item) {
    return QStringLiteral("%1 %2 %3")
        .arg(item.title, item.subtitle, item.keywords)
        .toLower();
}

const CommandPaletteItem *findCommandByToken(const QVector<CommandPaletteItem> &commands, const QString &token) {
    for (const CommandPaletteItem &command : commands) {
        if (command.id.compare(token, Qt::CaseInsensitive) == 0) {
            return &command;
        }
    }
    for (const CommandPaletteItem &command : commands) {
        if (command.id.startsWith(token, Qt::CaseInsensitive)) {
            return &command;
        }
    }
    for (const CommandPaletteItem &command : commands) {
        const QString titleToken = command.title.simplified().toLower().replace(' ', '_');
        if (titleToken.startsWith(token)) {
            return &command;
        }
    }
    return nullptr;
}

} // namespace

CommandPalette::CommandPalette(QWidget *parent)
    : QDialog(parent)
    , m_input(new QLineEdit(this))
    , m_list(new QListWidget(this)) {
    setObjectName("CommandPalette");
    setModal(true);
    setWindowFlag(Qt::FramelessWindowHint, true);

    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(14, 14, 14, 14);
    layout->setSpacing(8);

    auto *title = new QLabel(QStringLiteral("COMMANDS"), this);
    title->setObjectName("CommandPaletteTitle");
    layout->addWidget(title);

    m_input->setObjectName("CommandPaletteInput");
    m_input->setPlaceholderText(QStringLiteral("Search actions or type an Ixos query"));
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

void CommandPalette::showEvent(QShowEvent* event) {
    QDialog::showEvent(event);
    
    auto *effect = new QGraphicsOpacityEffect(this);
    this->setGraphicsEffect(effect);
    
    auto *anim = new QPropertyAnimation(effect, "opacity", this);
    anim->setDuration(150);
    anim->setStartValue(0.0);
    anim->setEndValue(1.0);
    anim->setEasingCurve(QEasingCurve::OutCubic);
    anim->start(QPropertyAnimation::DeleteWhenStopped);
}

void CommandPalette::resizeEvent(QResizeEvent* event) {
    QDialog::resizeEvent(event);
    if (parentWidget()) {
        int w = qBound(480, parentWidget()->width() - 100, 720);
        setFixedSize(w, 420);
        move(parentWidget()->frameGeometry().center() - rect().center());
    }
}

void CommandPalette::setCommands(const QVector<CommandPaletteItem> &commands) {
    m_commands = commands;
    m_input->clear();
    rebuildList();
    m_input->setFocus();
}

void CommandPalette::rebuildList() {
    const QString query = m_input->text().trimmed();

    m_list->clear();

    QString typedCommandId;
    QString typedArguments;
    const bool hasTypedCommand = tryParseTypedCommand(query, &typedCommandId, &typedArguments);
    if (hasTypedCommand) {
        const CommandPaletteItem *typedCommand = findCommandByToken(m_commands, typedCommandId);
        if (typedCommand != nullptr && typedCommand->available) {
            auto *item = new QListWidgetItem(m_list);
            item->setData(Qt::UserRole, typedCommand->id);
            item->setData(Qt::UserRole + 1, typedArguments);
            item->setToolTip(QStringLiteral("Run command with arguments"));

            auto *widget = new QWidget(m_list);
            auto *layout = new QHBoxLayout(widget);
            layout->setContentsMargins(8, 4, 8, 4);

            auto *textLayout = new QVBoxLayout();
            auto *title = new QLabel(QStringLiteral("Run %1").arg(typedCommand->title));
            title->setObjectName("CommandPaletteItemTitle");
            auto *subtitle = new QLabel(typedArguments.isEmpty()
                ? QStringLiteral("Typed command route")
                : QStringLiteral("Arguments: %1").arg(typedArguments));
            subtitle->setObjectName("CommandPaletteItemSubtitle");
            textLayout->addWidget(title);
            textLayout->addWidget(subtitle);

            layout->addLayout(textLayout);
            layout->addStretch();
            auto *shortcut = new QLabel("Enter");
            shortcut->setObjectName("CommandPaletteItemShortcut");
            layout->addWidget(shortcut);

            item->setSizeHint(widget->sizeHint());
            m_list->addItem(item);
            m_list->setItemWidget(item, widget);
        }
    }

    if (!query.isEmpty()) {
        auto *item = new QListWidgetItem(m_list);
        item->setData(Qt::UserRole, QStringLiteral("__search__"));
        item->setData(Qt::UserRole + 1, query);
        item->setToolTip(QStringLiteral("Run Ixos search in the current workspace"));
        
        // Custom widget for item to show shortcut right-aligned
        auto *widget = new QWidget(m_list);
        auto *layout = new QHBoxLayout(widget);
        layout->setContentsMargins(8, 4, 8, 4);
        auto *label = new QLabel(QStringLiteral("Search \"%1\"").arg(query));
        label->setObjectName("CommandPaletteItemTitle");
        layout->addWidget(label);
        layout->addStretch();
        auto *shortcut = new QLabel("Enter");
        shortcut->setObjectName("CommandPaletteItemShortcut");
        layout->addWidget(shortcut);
        
        item->setSizeHint(widget->sizeHint());
        m_list->addItem(item);
        m_list->setItemWidget(item, widget);
    }

    struct ScoredCommand {
        CommandPaletteItem item;
        int score;
    };
    QVector<ScoredCommand> scored;

    for (const auto &command : m_commands) {
        if (!command.available) {
            continue;
        }

        int fuzzyScore = 0;
        if (!query.isEmpty()) {
            fuzzyScore = FuzzyMatch::score(query, haystackFor(command));
            if (fuzzyScore < 0) continue;
        }
        const int contextScore = qRound(command.contextScore * 100.0f);
        const int score = qRound(static_cast<float>(fuzzyScore) * 0.6f + static_cast<float>(contextScore) * 0.4f);
        scored.append({command, score});
    }

    std::sort(scored.begin(), scored.end(), [](const ScoredCommand& a, const ScoredCommand& b) {
        return a.score > b.score;
    });

    for (const auto &sc : scored) {
        auto *item = new QListWidgetItem(m_list);
        item->setData(Qt::UserRole, sc.item.id);
        item->setToolTip(sc.item.subtitle);
        
        auto *widget = new QWidget(m_list);
        auto *layout = new QHBoxLayout(widget);
        layout->setContentsMargins(8, 4, 8, 4);
        
        auto *textLayout = new QVBoxLayout();
        auto *title = new QLabel(sc.item.title);
        title->setObjectName("CommandPaletteItemTitle");
        auto *subtitle = new QLabel(sc.item.subtitle);
        subtitle->setObjectName("CommandPaletteItemSubtitle");
        textLayout->addWidget(title);
        textLayout->addWidget(subtitle);
        
        layout->addLayout(textLayout);
        layout->addStretch();
        
        // Fake shortcut logic based on command ID for visual purposes
        QString hotkey;
        if (sc.item.id == "focus_search") hotkey = "Ctrl+F";
        else if (sc.item.id == "toggle_rail") hotkey = "Ctrl+R";
        else if (sc.item.id == "new_tab") hotkey = "Ctrl+T";
        else if (sc.item.id == "close_tab") hotkey = "Ctrl+W";
        else if (sc.item.id == "refresh") hotkey = "F5";
        else if (sc.item.id == "go_up") hotkey = "Alt+Up";
        
        if (!hotkey.isEmpty()) {
            auto *shortcut = new QLabel(hotkey);
            shortcut->setObjectName("CommandPaletteItemShortcut");
            layout->addWidget(shortcut);
        }
        
        item->setSizeHint(widget->sizeHint());
        m_list->addItem(item);
        m_list->setItemWidget(item, widget);
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
    const QString arguments = item->data(Qt::UserRole + 1).toString();
    if (id == QStringLiteral("__search__")) {
        const QString query = arguments.isEmpty() ? m_input->text().trimmed() : arguments;
        emit searchRequested(query);
    } else if (!id.isEmpty()) {
        if (!arguments.isEmpty()) {
            emit commandTriggeredWithArgs(id, arguments);
        } else {
            emit commandTriggered(id);
        }
    }
    accept();
}

bool CommandPalette::tryParseTypedCommand(const QString &input, QString *commandId, QString *arguments) const {
    if (commandId == nullptr || arguments == nullptr) {
        return false;
    }
    const QString trimmed = input.trimmed();
    if (trimmed.size() < 2) {
        return false;
    }
    const QChar prefix = trimmed.at(0);
    if (prefix != QChar('/') && prefix != QChar(':')) {
        return false;
    }

    const QString payload = trimmed.mid(1).trimmed();
    if (payload.isEmpty()) {
        return false;
    }

    const int split = payload.indexOf(' ');
    if (split < 0) {
        *commandId = payload.toLower();
        arguments->clear();
        return true;
    }

    *commandId = payload.left(split).trimmed().toLower();
    *arguments = payload.mid(split + 1).trimmed();
    return !commandId->isEmpty();
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
