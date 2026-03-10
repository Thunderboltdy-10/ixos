#include "widgets/SidebarSection.h"

#include <QDir>
#include <QStyle>

namespace Ixplorer {

SidebarSection::SidebarSection(const QString &title, QWidget *parent)
    : QWidget(parent)
    , m_header(new QPushButton(this))
    , m_bodyWidget(new QWidget(this))
    , m_body(new QVBoxLayout(m_bodyWidget)) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);

    m_header->setObjectName("SidebarSectionHeader");
    m_header->setText(title);
    m_header->setCursor(Qt::PointingHandCursor);
    m_header->setProperty("title", title);
    connect(m_header, &QPushButton::clicked, this, &SidebarSection::toggleCollapse);

    m_body->setContentsMargins(0, 0, 0, 0);
    m_body->setSpacing(0);

    layout->addWidget(m_header);
    layout->addWidget(m_bodyWidget);
}

void SidebarSection::addItem(const QString &label, const QString &path, const QString &/*icon*/) {
    auto *btn = new QPushButton(this);
    btn->setText(label);
    btn->setObjectName("SidebarItem");
    btn->setCursor(path.isEmpty() ? Qt::ArrowCursor : Qt::PointingHandCursor);
    btn->setProperty("path", path);
    btn->setEnabled(!path.isEmpty());

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
    m_bodyWidget->setVisible(!m_collapsed);
}

} // namespace Ixplorer
