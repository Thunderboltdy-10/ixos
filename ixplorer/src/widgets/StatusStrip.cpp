#include "widgets/StatusStrip.h"

#include <QHBoxLayout>
#include <QLocale>

namespace Ixplorer {

StatusStrip::StatusStrip(QWidget *parent)
    : QWidget(parent)
    , m_itemCountLabel(new QLabel(this))
    , m_selectionLabel(new QLabel(this))
    , m_statusLabel(new QLabel(this))
    , m_pathLabel(new QLabel(this)) {
    setObjectName("StatusStrip");
    setFixedHeight(28);

    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(16, 0, 16, 0);
    layout->setSpacing(16);

    layout->addWidget(m_itemCountLabel);
    layout->addWidget(m_selectionLabel);
    layout->addWidget(m_statusLabel, 1);
    layout->addStretch();
    layout->addWidget(m_pathLabel);

    m_itemCountLabel->setText("0 items");
    clearSelectionInfo();
    m_statusLabel->setText("");
    m_pathLabel->setText("");
}

void StatusStrip::setItemCount(int count) {
    m_itemCountLabel->setText(QString("%1 item%2").arg(count).arg(count != 1 ? "s" : ""));
}

void StatusStrip::setSelectionInfo(const QFileInfo &info, int selectedCount, quint64 selectedBytes) {
    if (!info.exists()) {
        clearSelectionInfo();
        return;
    }

    if (selectedCount <= 1) {
        QStringList bits;
        bits << info.fileName();
        if (info.isFile()) {
            bits << QLocale().formattedDataSize(info.size());
        }
        m_selectionLabel->setText(bits.join("  "));
        return;
    }

    m_selectionLabel->setText(
        QString("%1 selected  %2")
            .arg(selectedCount)
            .arg(QLocale().formattedDataSize(selectedBytes)));
}

void StatusStrip::clearSelectionInfo() {
    m_selectionLabel->setText("Nothing selected");
}

void StatusStrip::setPath(const QString &path) {
    m_pathLabel->setText(path);
}

void StatusStrip::setStatusMessage(const QString &message) {
    m_statusLabel->setText(message);
}

} // namespace Ixplorer
