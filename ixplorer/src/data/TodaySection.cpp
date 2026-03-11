#include "data/TodaySection.h"

#include <QFileInfo>
#include <QHBoxLayout>
#include <QVBoxLayout>
#include <utility>

namespace Ixplorer {

TodaySection::TodaySection(QWidget *parent)
    : QWidget(parent)
    , m_titleLabel(new QLabel(QStringLiteral("Continue"), this))
    , m_reasonLabel(new QLabel(this))
    , m_primaryButton(new QPushButton(this))
    , m_supportingContainer(new QWidget(this))
    , m_supportingLayout(new QHBoxLayout())
    , m_dismissButton(new QPushButton(QStringLiteral("Hide"), this)) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(8, 2, 8, 6);
    layout->setSpacing(4);

    auto *headerLayout = new QHBoxLayout();
    headerLayout->setContentsMargins(0, 0, 0, 0);
    headerLayout->setSpacing(6);
    headerLayout->addWidget(m_titleLabel);
    headerLayout->addStretch(1);
    headerLayout->addWidget(m_dismissButton);

    m_titleLabel->setStyleSheet(QStringLiteral("font-size: 11px; font-weight: 600; color: #8E8E93; letter-spacing: 0.08em; text-transform: uppercase;"));
    m_reasonLabel->setWordWrap(true);
    m_reasonLabel->setStyleSheet(QStringLiteral("font-size: 11px; color: #8E8E93;"));

    m_primaryButton->setFlat(true);
    m_primaryButton->setCursor(Qt::PointingHandCursor);
    m_primaryButton->setStyleSheet(QStringLiteral("text-align: left; padding: 4px 0; font-weight: 600; color: #F2F2F7;"));
    m_dismissButton->setFlat(true);
    m_dismissButton->setCursor(Qt::PointingHandCursor);
    m_dismissButton->setStyleSheet(QStringLiteral("font-size: 11px; color: #8E8E93; padding: 0;"));

    m_supportingLayout->setContentsMargins(0, 0, 0, 0);
    m_supportingLayout->setSpacing(4);
    m_supportingContainer->setLayout(m_supportingLayout);
    m_supportingContainer->setVisible(false);

    layout->addLayout(headerLayout);
    layout->addWidget(m_primaryButton);
    layout->addWidget(m_reasonLabel);
    layout->addWidget(m_supportingContainer);

    connect(m_primaryButton, &QPushButton::clicked, this, [this]() {
        emit resumeRequested(m_packet.primaryPath);
    });
    connect(m_dismissButton, &QPushButton::clicked, this, [this]() {
        clearPacket();
        emit dismissed();
    });

    clearPacket();
}

void TodaySection::setPacket(const ResumptionPacket &packet) {
    m_packet = packet;
    const QFileInfo primaryInfo(packet.primaryPath);
    m_primaryButton->setText(primaryInfo.fileName().isEmpty() ? packet.primaryPath : primaryInfo.fileName());
    m_primaryButton->setToolTip(packet.primaryPath);
    const QString lastQuery = packet.lastQuery.isEmpty()
        ? packet.reason
        : QStringLiteral("Last: \"%1\"").arg(packet.lastQuery);
    m_reasonLabel->setText(lastQuery);
    rebuildSupportingButtons();
    setVisible(!packet.primaryPath.isEmpty() && packet.confidence > 0.55f);
}

void TodaySection::clearPacket() {
    m_packet = ResumptionPacket();
    m_primaryButton->setText(QStringLiteral("Nothing to resume"));
    m_primaryButton->setToolTip(QString());
    m_reasonLabel->setText(QStringLiteral("Open a few files and searches to build resumption history."));
    rebuildSupportingButtons();
    setVisible(false);
}

ResumptionPacket TodaySection::packet() const {
    return m_packet;
}

void TodaySection::rebuildSupportingButtons() {
    while (QLayoutItem *item = m_supportingLayout->takeAt(0)) {
        if (QWidget *widget = item->widget()) {
            widget->deleteLater();
        }
        delete item;
    }

    for (QPushButton *button : std::as_const(m_supportingButtons)) {
        Q_UNUSED(button);
    }
    m_supportingButtons.clear();

    for (const QString &path : std::as_const(m_packet.supportingPaths)) {
        QFileInfo info(path);
        auto *button = new QPushButton(info.fileName().isEmpty() ? path : info.fileName(), this);
        button->setFlat(true);
        button->setCursor(Qt::PointingHandCursor);
        button->setToolTip(path);
        button->setStyleSheet(QStringLiteral("text-align:left; padding: 0 6px 0 0; font-size: 11px; color: #8E8E93;"));
        connect(button, &QPushButton::clicked, this, [this, path]() {
            emit supportingPathRequested(path);
        });
        m_supportingLayout->addWidget(button);
        m_supportingButtons.append(button);
    }
    m_supportingLayout->addStretch(1);
    m_supportingContainer->setVisible(!m_supportingButtons.isEmpty());
}

} // namespace Ixplorer
