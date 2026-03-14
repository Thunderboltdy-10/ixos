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
    m_bodyWidget->setObjectName("SidebarSectionBody");
    m_bodyWidget->setAttribute(Qt::WA_StyledBackground, true);

    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);

    // Header
    m_headerWidget = new QWidget(this);
    m_headerWidget->setObjectName("SidebarSectionHeader");

    auto *headerLayout = new QHBoxLayout(m_headerWidget);
    headerLayout->setContentsMargins(12, 12, 10, 4); // Increased vertical margin
    headerLayout->setSpacing(6);

    m_chevronLabel = new QLabel(m_headerWidget);
    m_chevronLabel->setFixedSize(12, 12);
    m_chevronLabel->setPixmap(Icons::makeIconFromFont(Icons::ChevronDown, 10, QColor("#A1A1AA")).pixmap(10, 10));
    headerLayout->addWidget(m_chevronLabel);

    m_titleLabel = new QLabel(title, m_headerWidget);
    m_titleLabel->setStyleSheet("font-weight: 700; color: #A1A1AA; font-size: 11px; letter-spacing: 0.5px;");
    headerLayout->addWidget(m_titleLabel);
    headerLayout->addStretch();

    if (title.isEmpty()) {
        m_headerWidget->hide();
    } else {
        m_headerWidget->setCursor(Qt::PointingHandCursor);
        m_headerWidget->installEventFilter(this);
    }

    m_body->setContentsMargins(0, 0, 0, 8);
    m_body->setSpacing(2); // Spacing between items

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
    auto *btn = new QPushButton(m_bodyWidget);
    btn->setObjectName("SidebarItem");
    btn->setAttribute(Qt::WA_Hover); // Ensure hover events are handled
    btn->setCursor(path.isEmpty() ? Qt::ArrowCursor : Qt::PointingHandCursor);
    btn->setProperty("path", path);
    btn->setEnabled(!path.isEmpty());
    btn->setText(label);
    btn->setFlat(true);
    btn->setIcon(icon);
    btn->setIconSize(QSize(18, 18)); // Slightly larger icons
    btn->setFixedHeight(34); // Better height

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
        bool isCurrent = (QDir::toNativeSeparators(btn->property("path").toString()) == m_highlightedPath);
        btn->setProperty("current", isCurrent);
        btn->style()->unpolish(btn);
        btn->style()->polish(btn);
    }
}

void SidebarSection::toggleCollapse() {
    m_collapsed = !m_collapsed;
    m_chevronLabel->setPixmap(Icons::makeIconFromFont(m_collapsed ? Icons::ChevronRight : Icons::ChevronDown, 10, QColor("#A1A1AA")).pixmap(10, 10));

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
