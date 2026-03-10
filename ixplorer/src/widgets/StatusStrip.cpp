#include "widgets/StatusStrip.h"
#include "widgets/ActivityIndicator.h"

#include <QDir>
#include <QHBoxLayout>
#include <QLocale>
#include <QFontMetrics>

namespace Ixplorer {

StatusStrip::StatusStrip(QWidget *parent)
    : QWidget(parent)
    , m_indicator(new ActivityIndicator(this))
    , m_itemCountLabel(new QLabel(this))
    , m_selectionLabel(new QLabel(this))
    , m_statusLabel(new QLabel(this))
    , m_pathLabel(new QLabel(this)) {
    setObjectName("StatusStrip");
    setFixedHeight(32); // Phase 3: Height from 28px to 32px

    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(16, 0, 16, 0);
    layout->setSpacing(16);

    layout->addWidget(m_indicator);
    layout->addWidget(m_itemCountLabel);
    layout->addWidget(m_selectionLabel);
    layout->addWidget(m_statusLabel, 1);
    layout->addStretch();
    layout->addWidget(m_pathLabel);

    m_itemCountLabel->setText("0 items");
    clearSelectionInfo();
    m_statusLabel->setText("");
    m_pathLabel->setText("");
    m_indicator->setStatus(0);
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
    m_selectionLabel->setText("No selection");
}

void StatusStrip::setPath(const QString &path) {
    const QString nativePath = QDir::toNativeSeparators(path);
    // Phase 3: Truncate from left with "..." for long paths
    QFontMetrics metrics(m_pathLabel->font());
    QString elided = metrics.elidedText(nativePath, Qt::ElideLeft, 300); // 300px max width roughly
    m_pathLabel->setText(elided);
    m_pathLabel->setToolTip(nativePath);
}

void StatusStrip::setStatusMessage(const QString &message) {
    m_statusLabel->setText(message);
    m_statusLabel->setToolTip(message);
}

void StatusStrip::setStatusState(int state) {
    m_indicator->setStatus(state);
}

} // namespace Ixplorer
