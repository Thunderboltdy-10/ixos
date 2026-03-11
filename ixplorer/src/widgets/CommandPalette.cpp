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

} // namespace

CommandPalette::CommandPalette(QWidget *parent)
    : QDialog(parent)
    , m_input(new QLineEdit(this))
    , m_list(new QListWidget(this)) {
    setObjectName("CommandPalette");
    setModal(true);
    setWindowFlag(Qt::FramelessWindowHint, true);

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

    if (!query.isEmpty()) {
        auto *item = new QListWidgetItem(m_list);
        item->setData(Qt::UserRole, QStringLiteral("__search__"));
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
