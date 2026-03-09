#include "widgets/SidebarSection.h"

#include <QStyle>
#include <QDir>

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
    m_header->setText(QStringLiteral("\u25BC  ") + title.toUpper());
    m_header->setCursor(Qt::PointingHandCursor);
    connect(m_header, &QPushButton::clicked, this, &SidebarSection::toggleCollapse);

    m_body->setContentsMargins(0, 0, 0, 4);
    m_body->setSpacing(0);

    layout->addWidget(m_header);
    layout->addWidget(m_bodyWidget);
}

void SidebarSection::addItem(const QString &label, const QString &path, const QString &icon) {
    auto *btn = new QPushButton(this);
    QString display = icon.isEmpty() ? label : icon + "  " + label;
    btn->setText(display);
    btn->setObjectName("SidebarItem");
    btn->setCursor(Qt::PointingHandCursor);
    btn->setProperty("path", path);

    connect(btn, &QPushButton::clicked, this, [this, path]() {
        emit itemClicked(path);
    });

    m_body->addWidget(btn);
}

void SidebarSection::setHighlighted(const QString &path) {
    m_highlightedPath = QDir::toNativeSeparators(path);
    for (int i = 0; i < m_body->count(); ++i) {
        auto *btn = qobject_cast<QPushButton *>(m_body->itemAt(i)->widget());
        if (!btn) continue;
        QString itemPath = QDir::toNativeSeparators(btn->property("path").toString());
        btn->setObjectName(itemPath == m_highlightedPath ? "SidebarItemActive" : "SidebarItem");
        btn->style()->unpolish(btn);
        btn->style()->polish(btn);
    }
}

void SidebarSection::toggleCollapse() {
    m_collapsed = !m_collapsed;
    m_bodyWidget->setVisible(!m_collapsed);
    QString title = m_header->text().mid(3); // skip chevron + spaces
    m_header->setText((m_collapsed ? QStringLiteral("\u25B6  ") : QStringLiteral("\u25BC  ")) + title);
}

} // namespace Ixplorer
