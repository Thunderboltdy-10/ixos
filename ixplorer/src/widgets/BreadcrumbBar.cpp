#include "widgets/BreadcrumbBar.h"
#include "theme/Colors.h"

#include <QDir>
#include <QFontMetrics>
#include <QLabel>
#include <QMenu>
#include <QMouseEvent>
#include <QPushButton>
#include <QResizeEvent>
#include <QTimer>
#include <QKeyEvent>

namespace Ixplorer {

namespace {

QLabel *makeSeparator(QWidget *parent) {
    auto *sep = new QLabel(QStringLiteral(" \\ "), parent); // Backslash for Windows native feel
    sep->setStyleSheet("color: rgba(255,255,255,0.1); padding: 0 4px; font-weight: 400; font-size: 11px;");
    return sep;
}

QString elideSegmentText(const QFontMetrics &metrics, const QString &text, int maxWidth) {
    return metrics.elidedText(text, Qt::ElideMiddle, qMax(40, maxWidth));
}

} // namespace

BreadcrumbBar::BreadcrumbBar(QWidget *parent)
    : QWidget(parent)
    , m_layout(new QHBoxLayout(this))
    , m_editLine(new QLineEdit(this)) {
    setObjectName("BreadcrumbBar");
    m_layout->setContentsMargins(8, 0, 8, 0);
    m_layout->setSpacing(0);

    m_editLine->setObjectName("BreadcrumbEdit");
    m_editLine->hide();
    m_editLine->installEventFilter(this);

    connect(m_editLine, &QLineEdit::returnPressed, this, [this]() {
        exitEditMode(true);
    });

    m_layout->addStretch();
}

void BreadcrumbBar::setPath(const QString &path) {
    QString normalized = QDir::toNativeSeparators(path);
    if (normalized == m_path)
        return;

    if (m_editMode) {
        exitEditMode(false); // Force exit edit mode on external path change (tab switch)
    }

    m_path = normalized;
    rebuild();
}

void BreadcrumbBar::resizeEvent(QResizeEvent *event) {
    QWidget::resizeEvent(event);
    if (!m_editMode && event->size().width() != event->oldSize().width()) {
        QTimer::singleShot(10, this, [this]() {
            if (!m_editMode) rebuild();
        });
    }
}

void BreadcrumbBar::mouseDoubleClickEvent(QMouseEvent *event) {
    if (event->button() == Qt::LeftButton && !m_editMode) {
        enterEditMode();
    }
    QWidget::mouseDoubleClickEvent(event);
}

void BreadcrumbBar::mouseReleaseEvent(QMouseEvent *event) {
    if (event->button() == Qt::LeftButton && !m_editMode) {
        // If clicked on empty area, enter edit mode
        if (childAt(event->pos()) == nullptr) {
            enterEditMode();
        }
    }
    QWidget::mouseReleaseEvent(event);
}

bool BreadcrumbBar::eventFilter(QObject *watched, QEvent *event) {
    if (watched == m_editLine) {
        if (event->type() == QEvent::FocusOut) {
            exitEditMode(false);
            return true;
        } else if (event->type() == QEvent::KeyPress) {
            auto *ke = static_cast<QKeyEvent*>(event);
            if (ke->key() == Qt::Key_Escape) {
                exitEditMode(false);
                return true;
            }
        }
    }
    return QWidget::eventFilter(watched, event);
}

void BreadcrumbBar::enterEditMode() {
    m_editMode = true;
    
    while (m_layout->count() > 0) {
        auto *item = m_layout->takeAt(0);
        if (item->widget() && item->widget() != m_editLine)
            item->widget()->deleteLater();
        delete item;
    }
    
    m_layout->addWidget(m_editLine, 1);
    m_editLine->setText(m_path);
    m_editLine->show();
    m_editLine->setFocus();
    m_editLine->selectAll();
}

void BreadcrumbBar::exitEditMode(bool accept) {
    if (!m_editMode) return;
    
    m_editMode = false;
    m_editLine->hide();
    m_layout->removeWidget(m_editLine);
    
    if (accept) {
        QString newPath = m_editLine->text().trimmed();
        if (!newPath.isEmpty() && newPath != m_path) {
            emit navigateRequested(newPath);
        }
    }
    rebuild();
}

void BreadcrumbBar::rebuild() {
    if (m_editMode) return;

    while (m_layout->count() > 0) {
        auto *item = m_layout->takeAt(0);
        if (item->widget() && item->widget() != m_editLine)
            item->widget()->deleteLater();
        delete item;
    }

    if (m_path.isEmpty()) {
        m_layout->addStretch();
        return;
    }

    QString normalized = QDir::fromNativeSeparators(m_path);
    QStringList parts;
    QStringList paths;

#ifdef Q_OS_WIN
    if (normalized.length() >= 2 && normalized[1] == ':') {
        QString drive = normalized.left(3);
        parts << drive;
        paths << drive;
        normalized = normalized.mid(3);
    }
#else
    if (normalized.startsWith('/')) {
        parts << "/";
        paths << "/";
        normalized = normalized.mid(1);
    }
#endif

    QStringList segments = normalized.split(QDir::separator(), Qt::SkipEmptyParts);
    parts.append(segments);
    
    QString runningPath = paths.isEmpty() ? "" : paths[0];
    for (int i = (paths.isEmpty() ? 0 : 1); i < parts.size(); ++i) {
        if (!runningPath.isEmpty() && !runningPath.endsWith(QDir::separator())) runningPath += QDir::separator();
        runningPath += parts[i];
        paths << runningPath;
    }
    
    const QFontMetrics metrics(font());
    const int availableWidth = qMax(200, width() - 40);
    QVector<int> visibleIndexes;
    visibleIndexes.push_back(0);
    if (parts.size() > 1) {
        visibleIndexes.push_back(parts.size() - 1);
    }

    int usedWidth = metrics.horizontalAdvance(parts.first()) + 20;
    if (parts.size() > 1) {
        usedWidth += metrics.horizontalAdvance(parts.last()) + 20;
    }

    for (int i = parts.size() - 2; i >= 1; --i) {
        const int segmentWidth = metrics.horizontalAdvance(parts[i]) + 24;
        if (usedWidth + segmentWidth > availableWidth) {
            break;
        }
        visibleIndexes.insert(1, i);
        usedWidth += segmentWidth;
    }

    const bool hasOverflow = parts.size() > visibleIndexes.size();
    for (int i = 0; i < visibleIndexes.size(); ++i) {
        const int partIndex = visibleIndexes.at(i);
        if (i > 0) {
            m_layout->addWidget(makeSeparator(this));
        }

        if (hasOverflow && i == 1 && visibleIndexes.at(1) > 1) {
            auto *overflowBtn = new QPushButton(QStringLiteral("..."), this);
            overflowBtn->setObjectName("BreadcrumbButton");
            overflowBtn->setCursor(Qt::PointingHandCursor);
            auto *menu = new QMenu(this);
            for (int hiddenIndex = 1; hiddenIndex < visibleIndexes.at(1); ++hiddenIndex) {
                QAction *action = menu->addAction(parts[hiddenIndex]);
                const QString targetPath = paths[hiddenIndex];
                connect(action, &QAction::triggered, this, [this, targetPath]() {
                    emit navigateRequested(targetPath);
                });
            }
            overflowBtn->setMenu(menu);
            m_layout->addWidget(overflowBtn);
            m_layout->addWidget(makeSeparator(this));
        }

        const bool isLast = (partIndex == parts.size() - 1);
        const QString segmentText = parts[partIndex];
        if (isLast) {
            auto *label = new QLabel(segmentText, this);
            label->setObjectName("BreadcrumbCurrent");
            label->setToolTip(parts[partIndex]);
            m_layout->addWidget(label);
        } else {
            auto *btn = new QPushButton(segmentText, this);
            btn->setObjectName("BreadcrumbButton");
            btn->setCursor(Qt::PointingHandCursor);
            btn->setToolTip(parts[partIndex]);
            const QString targetPath = paths[partIndex];
            connect(btn, &QPushButton::clicked, this, [this, targetPath]() {
                emit navigateRequested(targetPath);
            });
            m_layout->addWidget(btn);
        }
    }

    m_layout->addStretch();
}

} // namespace Ixplorer
