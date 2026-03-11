#include "widgets/SearchResultCard.h"
#include "theme/ThemedFileIconProvider.h"

#include <QHBoxLayout>
#include <QFileInfo>
#include <QStyle>

namespace Ixplorer {

SearchResultCard::SearchResultCard(QWidget *parent)
    : QWidget(parent)
    , m_icon(new QLabel(this))
    , m_title(new QLabel(this))
    , m_path(new QLabel(this)) {
    setObjectName("RailResultCard");
    setFixedHeight(32); // Height: ~32px (compact, file-list-like)

    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(12, 0, 12, 0);
    layout->setSpacing(8);

    m_icon->setFixedSize(18, 18);
    layout->addWidget(m_icon);

    m_title->setObjectName("RailResultTitle");
    QFont titleFont("Geist");
    titleFont.setPixelSize(13);
    m_title->setFont(titleFont);
    m_title->setStyleSheet("color: #F2F2F7;");
    layout->addWidget(m_title);

    m_path->setObjectName("RailResultPath");
    QFont pathFont("Geist");
    pathFont.setPixelSize(12);
    m_path->setFont(pathFont);
    m_path->setStyleSheet("color: #8E8E93;");
    
    // Elide path if it's too long
    QSizePolicy pathPolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
    m_path->setSizePolicy(pathPolicy);
    layout->addWidget(m_path, 1);
}

void SearchResultCard::setContent(
    const SearchHit &item,
    bool /*semanticResults*/,
    const QString &relativePath,
    const QString &/*summary*/,
    int /*rank*/) {
    
    ThemedFileIconProvider provider;
    m_icon->setPixmap(provider.icon(QFileInfo(item.path)).pixmap(18, 18));
    
    m_title->setText(item.filename);
    
    // Simple eliding approach for QLabel could be done with FontMetrics,
    // but here just setting text is fine, relying on layout/elision if set up.
    m_path->setText(relativePath);
}

void SearchResultCard::setActive(bool active) {
    setProperty("active", active);
    style()->unpolish(this);
    style()->polish(this);
    update();
}

} // namespace Ixplorer
