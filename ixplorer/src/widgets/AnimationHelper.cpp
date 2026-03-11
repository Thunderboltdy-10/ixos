#include "AnimationHelper.h"
#include <QTimer>

namespace Ixplorer::Animation {

void slideWidth(QWidget* widget, int targetWidth, int durationMs, QEasingCurve::Type easing) {
    if (!widget) return;
    auto* anim = new QPropertyAnimation(widget, "maximumWidth", widget);
    anim->setDuration(durationMs);
    anim->setStartValue(widget->width());
    anim->setEndValue(targetWidth);
    anim->setEasingCurve(easing);
    
    auto* animMin = new QPropertyAnimation(widget, "minimumWidth", widget);
    animMin->setDuration(durationMs);
    animMin->setStartValue(widget->width());
    animMin->setEndValue(targetWidth);
    animMin->setEasingCurve(easing);
    
    anim->start(QAbstractAnimation::DeleteWhenStopped);
    animMin->start(QAbstractAnimation::DeleteWhenStopped);
}

void fadeOpacity(QWidget* widget, qreal from, qreal to, int durationMs, QEasingCurve::Type easing) {
    if (!widget) return;
    
    QGraphicsOpacityEffect* effect = qobject_cast<QGraphicsOpacityEffect*>(widget->graphicsEffect());
    if (!effect) {
        effect = new QGraphicsOpacityEffect(widget);
        widget->setGraphicsEffect(effect);
    }
    
    auto* anim = new QPropertyAnimation(effect, "opacity", widget);
    anim->setDuration(durationMs);
    anim->setStartValue(from);
    anim->setEndValue(to);
    anim->setEasingCurve(easing);
    anim->start(QAbstractAnimation::DeleteWhenStopped);
}

void staggerFadeIn(const QList<QWidget*>& widgets, int delayMs, int fadeMs, QEasingCurve::Type easing) {
    for (int i = 0; i < widgets.size(); ++i) {
        QWidget* w = widgets[i];
        if (!w) continue;
        
        QGraphicsOpacityEffect* effect = qobject_cast<QGraphicsOpacityEffect*>(w->graphicsEffect());
        if (!effect) {
            effect = new QGraphicsOpacityEffect(w);
            w->setGraphicsEffect(effect);
        }
        effect->setOpacity(0.0);
        
        QTimer::singleShot(i * delayMs, w, [w, effect, fadeMs, easing]() {
            auto* anim = new QPropertyAnimation(effect, "opacity", w);
            anim->setDuration(fadeMs);
            anim->setStartValue(0.0);
            anim->setEndValue(1.0);
            anim->setEasingCurve(easing);
            anim->start(QAbstractAnimation::DeleteWhenStopped);
        });
    }
}

} // namespace Ixplorer::Animation
