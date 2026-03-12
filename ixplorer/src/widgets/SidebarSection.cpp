#include "widgets/SidebarSection.h"
#include "theme/IconFont.h"

#include <QEvent>
#include <QDir>
#include <QMouseEvent>
#include <QStyle>

namespace Ixplorer {

SidebarSection::SidebarSection(const QString &title, const QIcon &sectionIcon, QWidget *parent)
    : QWidget(parent)
    , m_bodyWidget(new QWidget(this))
    , m_body(new QVBoxLayout(m_bodyWidget)) {

    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);

    // Header - only show if title is not empty
    m_headerWidget = new QWidget(this);
    m_headerWidget->setObjectName("SidebarSectionHeader");

    auto *headerLayout = new QHBoxLayout(m_headerWidget);
    headerLayout->setContentsMargins(14, 8, 10, 2);
    headerLayout->setSpacing(4);

    m_chevronLabel = new QLabel(m_headerWidget);
    m_chevronLabel->setFixedSize(12, 12);
    m_chevronLabel->setPixmap(Icons::makeIconFromFont(Icons::ChevronDown, 10, QColor("#5A5A5E")).pixmap(10, 10));
    headerLayout->addWidget(m_chevronLabel);

    m_titleLabel = new QLabel(title, m_headerWidget);
    headerLayout->addWidget(m_titleLabel);
    headerLayout->addStretch();

    if (title.isEmpty()) {
        m_headerWidget->hide();
    } else {
        m_headerWidget->setCursor(Qt::PointingHandCursor);
        m_headerWidget->installEventFilter(this);
    }

    m_body->setContentsMargins(0, 0, 0, 2);
    m_body->setSpacing(0);

    layout->addWidget(m_headerWidget);
    layout->addWidget(m_bodyWidget);

    m_collapseAnimation = new QPropertyAnimation(m_bodyWidget, "maximumHeight", this);
    m_collapseAnimation->setDuration(180);
    m_collapseAnimation->setEasingCurve(QEasingCurve::OutQuad);
}

bool SidebarSection::eventFilter(QObject *watched, QEvent *event) {
    if (watched == m_headerWidget && event->type() == QEvent::MouseButtonRelease) {
        auto *me = static_cast<QMouseEvent*>(event);
        if (me->button() == Qt::LeftButton) {
            toggleCollapse();
            return true;
        }
    }
    return QWidget::eventFilter(watched, event);
}

void SidebarSection::addItem(const QString &label, const QString &path, const QIcon &icon) {
    auto *btn = new QPushButton(this);
    btn->setObjectName("SidebarItem");
    btn->setCursor(path.isEmpty() ? Qt::ArrowCursor : Qt::PointingHandCursor);
    btn->setProperty("path", path);
    btn->setEnabled(!path.isEmpty());
    btn->setText(label);
    btn->setFlat(true);
    btn->setCheckable(false);
    btn->setIcon(icon);
    btn->setIconSize(QSize(14, 14));
    btn->setFixedHeight(26);

    connect(btn, &QPushButton::clicked, this, [this, path]() {
        if (!path.isEmpty()) {
            emit itemClicked(path);
        }
    });

    m_body->addWidget(btn);
}

void SidebarSection::clearItems() {
    while (auto *item = m_body->takeAt(0)) {
        if (item->widget()) {
            item->widget()->deleteLater();
        }
        delete item;
    }
}

void SidebarSection::setHighlighted(const QString &path) {
    m_highlightedPath = QDir::toNativeSeparators(path);
    for (int i = 0; i < m_body->count(); ++i) {
        auto *btn = qobject_cast<QPushButton *>(m_body->itemAt(i)->widget());
        if (!btn) {
            continue;
        }
        QString itemPath = QDir::toNativeSeparators(btn->property("path").toString());
        btn->setObjectName(itemPath == m_highlightedPath ? "SidebarItemActive" : "SidebarItem");
        btn->style()->unpolish(btn);
        btn->style()->polish(btn);
    }
}

void SidebarSection::toggleCollapse() {
    m_collapsed = !m_collapsed;
    m_chevronLabel->setPixmap(Icons::makeIconFromFont(m_collapsed ? Icons::ChevronRight : Icons::ChevronDown, 10, QColor("#5A5A5E")).pixmap(10, 10));

    m_collapseAnimation->stop();
    if (m_collapsed) {
        m_collapseAnimation->setStartValue(m_bodyWidget->height());
        m_collapseAnimation->setEndValue(0);
    } else {
        m_bodyWidget->setVisible(true);
        m_collapseAnimation->setStartValue(0);
        m_collapseAnimation->setEndValue(m_body->sizeHint().height());
    }
    m_collapseAnimation->setDuration(180);
    m_collapseAnimation->setEasingCurve(QEasingCurve::OutQuad);
    m_collapseAnimation->start();
}

} // namespace Ixplorer
