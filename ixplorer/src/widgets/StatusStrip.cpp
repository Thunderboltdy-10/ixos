#include "widgets/StatusStrip.h"
#include "widgets/ActivityIndicator.h"
#include "theme/IconFont.h"
#include <QHBoxLayout>
#include <QLocale>
#include <QDir>

namespace Ixplorer {

StatusStrip::StatusStrip(QWidget *parent)
    : QWidget(parent)
    , m_indicator(new ActivityIndicator(this))
    , m_itemCountLabel(new QLabel(this))
    , m_selectionLabel(new QLabel(this))
    , m_statusLabel(new QLabel(this))
    , m_pathLabel(new QLabel(this))
    , m_toggleRailBtn(new QToolButton(this)) {
    setObjectName("StatusStrip");
    setFixedHeight(28);

    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(12, 0, 8, 0);
    layout->setSpacing(8);

    layout->addWidget(m_indicator);
    
    m_statusLabel->setStyleSheet("color: #FFFFFF; font-weight: 500;");
    layout->addWidget(m_statusLabel);
    
    layout->addSpacing(12);
    
    m_itemCountLabel->setStyleSheet("color: #A1A1AA;");
    layout->addWidget(m_itemCountLabel);
    
    layout->addSpacing(16);
    
    m_selectionLabel->setStyleSheet("color: #A1A1AA;");
    layout->addWidget(m_selectionLabel);
    
    layout->addStretch();
    
    m_pathLabel->setStyleSheet("color: #71717A; font-family: 'Geist Mono', monospace; font-size: 10px;");
    layout->addWidget(m_pathLabel);

    m_toggleRailBtn->setObjectName("StatusRailToggle");
    m_toggleRailBtn->setCheckable(true);
    m_toggleRailBtn->setAutoRaise(true);
    m_toggleRailBtn->setFixedSize(24, 24);
    m_toggleRailBtn->setToolTip("Details Pane");
    m_toggleRailBtn->setCursor(Qt::PointingHandCursor);
    m_toggleRailBtn->setIcon(Icons::makeIconFromFont(Icons::Filter, 12, QColor(0x8B, 0x8B, 0x90)));
    
    connect(m_toggleRailBtn, &QToolButton::clicked, this, &StatusStrip::toggleRailRequested);
    layout->addWidget(m_toggleRailBtn);

    clearSelectionInfo();
}

void StatusStrip::setItemCount(int count) {
    m_itemCountLabel->setText(QString("%1 item%2").arg(count).arg(count != 1 ? "s" : ""));
}

namespace {
QString formatSiSize(quint64 bytes) {
    if (bytes < 1000) return QString::number(bytes) + " bytes";
    static const char *units[] = {"KB", "MB", "GB", "TB", "PB", "EB"};
    int unitIndex = -1;
    double size = bytes;
    while (size >= 1000 && unitIndex < 5) {
        size /= 1000.0;
        unitIndex++;
    }
    return QString("%1 %2").arg(size, 0, 'f', unitIndex > 0 ? 2 : 1).arg(units[unitIndex]);
}
} // namespace

void StatusStrip::setSelectionInfo(const QFileInfo &info, int selectedCount, quint64 selectedBytes) {
    if (selectedCount <= 0) {
        clearSelectionInfo();
        return;
    }

    if (selectedCount <= 1) {
        QStringList bits;
        bits << info.fileName();
        if (info.isFile()) {
            bits << formatSiSize(info.size());
        }
        m_selectionLabel->setText(bits.join("  "));
        return;
    }

    m_selectionLabel->setText(
        QString("%1 selected  %2")
            .arg(selectedCount)
            .arg(formatSiSize(selectedBytes)));
}

void StatusStrip::clearSelectionInfo() {
    m_selectionLabel->setText("No selection");
}

void StatusStrip::setPath(const QString &path) {
    m_pathLabel->setText(QDir::toNativeSeparators(path));
}

void StatusStrip::setStatusMessage(const QString &message) {
    m_statusLabel->setText(message);
}

void StatusStrip::setStatusState(int state) {
    m_indicator->setStatus(state);
}

void StatusStrip::setRailVisible(bool visible) {
    m_toggleRailBtn->setChecked(visible);
    m_toggleRailBtn->setIcon(Icons::makeIconFromFont(Icons::Filter, 12, visible ? QColor(0xFF, 0xFF, 0xFF) : QColor(0x8B, 0x8B, 0x90)));
}

} // namespace Ixplorer
