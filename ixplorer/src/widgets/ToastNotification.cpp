#include "ToastNotification.h"
#include <QLabel>
#include <QPropertyAnimation>
#include <QTimer>
#include <QVBoxLayout>
#include <QPainter>
#include <QPainterPath>

namespace Ixplorer {

ToastNotification::ToastNotification(QWidget *parent) : QWidget(parent) {
    setWindowFlags(Qt::FramelessWindowHint | Qt::Tool | Qt::WindowStaysOnTopHint);
    setAttribute(Qt::WA_TranslucentBackground);
    
    m_label = new QLabel(this);
    m_label->setStyleSheet("color: white; font-weight: bold;");
    m_label->setAlignment(Qt::AlignCenter);

    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(16, 8, 16, 8);
    layout->addWidget(m_label);
    
    m_anim = new QPropertyAnimation(this, "pos");
    m_anim->setDuration(200);
    m_anim->setEasingCurve(QEasingCurve::OutCubic);
    
    m_dismissTimer = new QTimer(this);
    m_dismissTimer->setSingleShot(true);
    m_dismissTimer->setInterval(3000);
    connect(m_dismissTimer, &QTimer::timeout, this, &ToastNotification::slideDown);
    
    hide();
}

void ToastNotification::showMessage(const QString &message) {
    m_label->setText(message);
    adjustSize();
    
    if (parentWidget()) {
        int w = width();
        int h = height();
        int pw = parentWidget()->width();
        int ph = parentWidget()->height();
        
        int startY = ph;
        int endY = ph - h - 50; // Above status strip
        
        int x = (pw - w) / 2;
        
        setGeometry(x, startY, w, h);
        show();
        
        m_anim->stop();
        m_anim->setStartValue(QPoint(x, startY));
        m_anim->setEndValue(QPoint(x, endY));
        m_anim->start();
        
        m_dismissTimer->start();
    }
}

void ToastNotification::slideDown() {
    if (!parentWidget()) return;
    
    int startY = pos().y();
    int endY = parentWidget()->height();
    
    m_anim->stop();
    m_anim->setStartValue(QPoint(pos().x(), startY));
    m_anim->setEndValue(QPoint(pos().x(), endY));
    connect(m_anim, &QPropertyAnimation::finished, this, &QWidget::hide);
    m_anim->start();
}

void ToastNotification::showToast(QWidget *parent, const QString &message) {
    static ToastNotification *toast = nullptr;
    if (!toast || toast->parentWidget() != parent) {
        if (toast) toast->deleteLater();
        toast = new ToastNotification(parent);
    }
    toast->showMessage(message);
}

void ToastNotification::paintEvent(QPaintEvent *event) {
    Q_UNUSED(event);
    QPainter painter(this);
    painter.setRenderHint(QPainter::Antialiasing);
    QPainterPath path;
    path.addRoundedRect(rect(), 8, 8);
    painter.fillPath(path, QColor(32, 34, 38, 240));
}

} // namespace Ixplorer
