#include "widgets/ActivityIndicator.h"
#include "theme/Colors.h"
#include <QPainter>

namespace Ixplorer {

ActivityIndicator::ActivityIndicator(QWidget* parent) : QWidget(parent) {
    setFixedSize(8, 8);
    m_timer = new QTimer(this);
    m_timer->setInterval(500); // 1s cycle (500ms on, 500ms off)
    connect(m_timer, &QTimer::timeout, this, [this]() {
        if (m_status == 1) { // Only pulse when searching
            m_pulseOn = !m_pulseOn;
            update();
        }
    });
}

void ActivityIndicator::setStatus(int status) {
    m_status = status;
    if (m_status == 1) {
        m_timer->start();
    } else {
        m_timer->stop();
        m_pulseOn = true; // Solid when not searching
    }
    update();
}

void ActivityIndicator::paintEvent(QPaintEvent*) {
    if (!m_pulseOn && m_status == 1) return; // Hide on off-pulse during search

    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);
    
    uint32_t color = Colors::SemanticGreen;
    if (m_status == 1) color = Colors::AccentAmber;
    else if (m_status == 2) color = Colors::SemanticRed;
    
    p.setBrush(Colors::qc(color));
    p.setPen(Qt::NoPen);
    p.drawEllipse(rect());
}

}
