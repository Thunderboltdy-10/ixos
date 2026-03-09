#include "widgets/StatusStrip.h"

#include <QHBoxLayout>

namespace Ixplorer {

StatusStrip::StatusStrip(QWidget *parent)
    : QWidget(parent)
    , m_itemCountLabel(new QLabel(this))
    , m_selectionLabel(new QLabel(this))
    , m_pathLabel(new QLabel(this)) {
    setObjectName("StatusStrip");
    setFixedHeight(26);

    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(16, 0, 16, 0);
    layout->setSpacing(24);

    layout->addWidget(m_itemCountLabel);
    layout->addWidget(m_selectionLabel);
    layout->addStretch();
    layout->addWidget(m_pathLabel);

    m_itemCountLabel->setText("0 items");
    m_selectionLabel->setText("");
    m_pathLabel->setText("");
}

void StatusStrip::setItemCount(int count) {
    m_itemCountLabel->setText(QString("%1 item%2").arg(count).arg(count != 1 ? "s" : ""));
}

void StatusStrip::setSelectionInfo(const QString &info) {
    m_selectionLabel->setText(info);
}

void StatusStrip::setPath(const QString &path) {
    m_pathLabel->setText(path);
}

} // namespace Ixplorer
