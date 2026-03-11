#pragma once

#include <QWidget>
#include <QPropertyAnimation>
#include <QGraphicsOpacityEffect>
#include <QEasingCurve>
#include <QList>

namespace Ixplorer::Animation {

// slideWidth(widget, targetWidth, 300ms) — animate QWidget fixed width
void slideWidth(QWidget* widget, int targetWidth, int durationMs = 300, QEasingCurve::Type easing = QEasingCurve::OutExpo);

// fadeOpacity(widget, from, to, 200ms) — via QGraphicsOpacityEffect
void fadeOpacity(QWidget* widget, qreal from, qreal to, int durationMs = 200, QEasingCurve::Type easing = QEasingCurve::OutCubic);

// staggerFadeIn(widgetList, 50ms delay, 120ms fade) — sequential reveal
void staggerFadeIn(const QList<QWidget*>& widgets, int delayMs = 50, int fadeMs = 120, QEasingCurve::Type easing = QEasingCurve::OutCubic);

} // namespace Ixplorer::Animation
